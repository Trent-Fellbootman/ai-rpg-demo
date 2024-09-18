"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { getCurrentUser } from "./database-actions/user-actions";
import {
  createGameSession,
  doesUserHaveGameSession,
  getGameSessionLength,
  getGameSessionMetadata,
  getSceneBySessionAndIndex,
  getScenesBySession,
  tryLockSessionUntilAcquire,
  unlockSession,
} from "./database-actions/game-session-actions";
import { generateGameSessionData } from "./data-generation/generate-session-data";
import {
  generateNextSceneData,
  NextSceneGenerationResponse,
} from "./data-generation/generate-next-scene-data";
import { getScenePlayPagePath } from "./utils/path";

import { addGeneratedSceneAndUnlockDatabaseActionEventName } from "@/inngest/functions";
import { inngest } from "@/inngest/client";
import { logger } from "@/app/lib/logger";
import { signIn } from "@/auth";

const log = logger.child({ module: "server-actions" });

export async function authenticate(
  formData: FormData,
): Promise<string | undefined> {
  try {
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid credentials.";
        default:
          return "Something went wrong.";
      }
    }
    throw error;
  }
}

const CreateNewSessionActionFormSchema = z.object({
  name: z.string().min(1, "Name must be non-empty!"),
  back_story: z.string().min(1, "Backstory must be non-empty!"),
  description: z.string().nullable(),
});

export type CreateNewGameSessionActionError = {
  fieldErrors: {
    [Key in keyof z.infer<typeof CreateNewSessionActionFormSchema>]?: string[];
  };
};

export async function createNewGameSessionAction(
  formData: FormData,
): Promise<CreateNewGameSessionActionError | undefined> {
  // no need for authorization; database constraints will enforce valid user ID automatically
  const authorizationStart = performance.now();

  const user = await getCurrentUser();

  // Validate form fields using zod
  const result = CreateNewSessionActionFormSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );

  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  const authorizationEnd = performance.now();

  const initialSceneGenerationResponse = await generateGameSessionData(
    result.data.name,
    result.data.back_story,
    result.data.description,
  );

  const sessionDataGenerationEnd = performance.now();

  const newSessionId = await createGameSession(
    user.id,
    initialSceneGenerationResponse.name,
    initialSceneGenerationResponse.backstory,
    initialSceneGenerationResponse.description,
    initialSceneGenerationResponse.temporaryCoverImageUrl,
    initialSceneGenerationResponse.coverImageDescription,
    {
      imageDescription: initialSceneGenerationResponse.coverImageDescription,
      imageUrl: initialSceneGenerationResponse.temporaryFirstSceneImageUrl,
      narration: initialSceneGenerationResponse.firstSceneText,
    },
  );

  const databaseUpdateEnd = performance.now();

  log.debug(`Finished creating new session. Statistics:
- Authorization: ${authorizationEnd - authorizationStart}ms
- Session data generation: ${sessionDataGenerationEnd - authorizationEnd}ms
- Database update: ${databaseUpdateEnd - sessionDataGenerationEnd}ms
- Total: ${databaseUpdateEnd - authorizationStart}ms`);

  // redirect to new session
  redirect(getScenePlayPagePath(newSessionId, null));
}

const CreateNextSceneActionFormSchema = z.object({
  action: z.string().min(1, "Action must be non-empty!"),
});

export type CreateNextSceneActionResponse = {
  errors?: {
    fieldErrors?: {
      [Key in keyof z.infer<typeof CreateNextSceneActionFormSchema>]?: string[];
    };
    message?: string;
  };
  nextScene?: {
    narration: string;
    imageUrl: string;
  };
};

export async function createNextSceneAction(
  userId: number,
  sessionId: number,
  formData: FormData,
): Promise<CreateNextSceneActionResponse> {
  log.debug("Started generating next scene action");

  const start = performance.now();

  // Validate form fields using zod
  const formParseResult = CreateNextSceneActionFormSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );

  if (!formParseResult.success) {
    return {
      errors: { fieldErrors: formParseResult.error.flatten().fieldErrors },
    };
  }

  // check that the user owns the session
  if (!(await doesUserHaveGameSession(userId, sessionId))) {
    throw new Error("User does not own session.");
  }

  const authorizationCheckEnd = performance.now();

  log.debug("Finished authorization check; trying to acquire session lock");

  // lock the session before retrieving inputs
  await tryLockSessionUntilAcquire(sessionId);
  const lockSessionEnd = performance.now();

  log.debug("Session lock acquired; retrieving input data from database");

  // retrieve all the scenes in the session
  const [sessionMetadata, scenes] = await Promise.all([
    getGameSessionMetadata(userId, sessionId),
    getScenesBySession(userId, sessionId),
  ]);

  const inputDataRetrievalEnd = performance.now();

  log.debug("Input data retrieved; generating next scene data");

  let nextScene: NextSceneGenerationResponse;

  try {
    nextScene = await generateNextSceneData(
      sessionMetadata.backstory,
      scenes,
      formParseResult.data.action,
    );
  } catch (error) {
    await unlockSession(sessionId);

    return {
      errors: {
        message: `An error occurred when generating the next scene: ${error}`,
      },
    };
  }

  const nextSceneDataGenerationEnd = performance.now();

  log.debug("Next scene data generated");

  // send event to inngest and schedule database writing operation to run in the background
  const inngestEventData = {
    userId,
    sessionId,
    previousAction: formParseResult.data.action,
    nextScene,
  };

  await inngest.send({
    name: addGeneratedSceneAndUnlockDatabaseActionEventName,
    data: inngestEventData,
  });

  const databaseUpdateBackgroundTaskSchedulingEnd = performance.now();

  log.debug(
    "Scheduled background task for writing next scene to database and unlocking session",
  );

  log.debug(`Finished generating next scene (but did not update database).
Statistics:
- Authorization check: ${authorizationCheckEnd - start}ms
- Waiting for session lock: ${lockSessionEnd - authorizationCheckEnd}ms
- Input data retrieval: ${inputDataRetrievalEnd - lockSessionEnd}ms
- Next scene data generation: ${nextSceneDataGenerationEnd - inputDataRetrievalEnd}ms
- Scheduling background task for database update: ${databaseUpdateBackgroundTaskSchedulingEnd - nextSceneDataGenerationEnd}ms
- Total: ${databaseUpdateBackgroundTaskSchedulingEnd - start}ms`);

  return { nextScene: nextScene };
}

export async function getSceneViewInitialData(
  sessionId: number,
  sceneIndex: number | "last",
) {
  const user = (await getCurrentUser())!;

  // TODO: optimize to remove this query
  const sessionLength = await getGameSessionLength(user.id, sessionId);

  const parsedIndex = sceneIndex === "last" ? sessionLength - 1 : sceneIndex;

  const [scene] = await Promise.all([
    getSceneBySessionAndIndex(user.id, sessionId, parsedIndex),
  ]);

  return {
    userId: user.id,
    narration: scene.narration,
    imageUrl: scene.imageUrl,
    action: scene.action,
    currentSceneIndex: parsedIndex,
    currentSessionLength: sessionLength,
  };
}
