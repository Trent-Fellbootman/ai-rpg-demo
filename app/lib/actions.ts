"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "./database-actions/user-actions";
import {
  createGameSession,
  deleteGameSession,
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
  GenerateNextSceneDataInProgressUpdate,
  NextSceneGenerationResponse,
} from "./data-generation/generate-next-scene-data";
import {
  getScenePlayPagePath,
  getSessionOverviewPath,
  getTemplateOverviewPath,
} from "./utils/path";

import { addGeneratedSceneAndUnlockDatabaseActionEventName } from "@/inngest/functions";
import { inngest } from "@/inngest/client";
import { logger } from "@/app/lib/logger";
import { signIn } from "@/auth";
import {
  addComment,
  createGameTemplate,
  deleteGameTemplate,
  getGameTemplateMetadataAndStatistics,
  updateGameTemplateData,
} from "@/app/lib/database-actions/game-template-actions";
import { createImageUrl } from "@/app/lib/database-actions/utils";
import { imageUrlExpireSeconds } from "@/app-config";
import { generateImage } from "@/app/lib/services/generative-ai";

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
  save_as_template: z
    .enum(["true", "false"])
    .transform((value) => value === "true"),
  make_template_public: z
    .enum(["true", "false"])
    .transform((value) => value === "true"),
});

export type CreateNewGameSessionActionError = {
  fieldErrors: {
    [Key in keyof z.infer<typeof CreateNewSessionActionFormSchema>]?: string[];
  };
};

export async function createGameSessionFromTemplateAction(
  userId: number,
  templateId: number,
) {
  const authorizationStart = performance.now();

  const user = await getCurrentUser();

  const authorizationEnd = performance.now();

  // TODO: only get the fields that we really need
  const templateMetadata = await getGameTemplateMetadataAndStatistics({
    userId,
    gameTemplateId: templateId,
  });

  const templateDataRetrievalEnd = performance.now();

  // TODO: optimize for concurrency
  const newSessionId = await createGameSession({
    userId: user.id,
    name: templateMetadata.name,
    backstory: templateMetadata.backstory,
    description: templateMetadata.description,
    imageUrl: templateMetadata.imageUrl,
    imageDescription: templateMetadata.imageDescription,
    parentGameTemplateId: templateId,
    initialSceneData: {
      event: templateMetadata.firstSceneData.event,
      imageDescription: templateMetadata.firstSceneData.imageDescription,
      imageUrl: (
        await createImageUrl(
          templateMetadata.firstSceneData.imagePath,
          imageUrlExpireSeconds,
        )
      ).url,
      narration: templateMetadata.firstSceneData.narration,
      proposedActions: templateMetadata.firstSceneData.proposedActions,
    },
  });

  const databaseUpdateEnd = performance.now();

  log.debug(`Finished creating new session from template. Statistics:
- Authorization: ${authorizationEnd - authorizationStart}ms
- Template data retrieval: ${templateDataRetrievalEnd - authorizationEnd}ms
- Database update: ${databaseUpdateEnd - templateDataRetrievalEnd}ms
- Total: ${databaseUpdateEnd - authorizationStart}ms`);

  // redirect to new session
  redirect(getSessionOverviewPath(newSessionId));
}

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

  // TODO: optimize for concurrency
  let templateId: number | null = null;

  // first create game template
  if (result.data.save_as_template) {
    templateId = await createGameTemplate({
      userId: user.id,
      newGameTemplateData: {
        name: initialSceneGenerationResponse.name,
        imageUrl: initialSceneGenerationResponse.temporaryCoverImageUrl,
        imageDescription: initialSceneGenerationResponse.coverImageDescription,
        description: initialSceneGenerationResponse.description,
        backstory: initialSceneGenerationResponse.backstory,
        isPublic: result.data.make_template_public,
        firstSceneData: {
          event: initialSceneGenerationResponse.firstSceneEvent,
          imageDescription:
            initialSceneGenerationResponse.firstSceneImageDescription,
          imageUrl: initialSceneGenerationResponse.temporaryFirstSceneImageUrl,
          narration: initialSceneGenerationResponse.firstSceneNarration,
          proposedActions:
            initialSceneGenerationResponse.firstSceneProposedActions,
        },
      },
    });
  }

  const newSessionId = await createGameSession({
    userId: user.id,
    name: initialSceneGenerationResponse.name,
    backstory: initialSceneGenerationResponse.backstory,
    description: initialSceneGenerationResponse.description,
    imageUrl: initialSceneGenerationResponse.temporaryCoverImageUrl,
    imageDescription: initialSceneGenerationResponse.coverImageDescription,
    parentGameTemplateId: templateId,
    initialSceneData: {
      event: initialSceneGenerationResponse.firstSceneEvent,
      imageDescription:
        initialSceneGenerationResponse.firstSceneImageDescription,
      imageUrl: initialSceneGenerationResponse.temporaryFirstSceneImageUrl,
      narration: initialSceneGenerationResponse.firstSceneNarration,
      proposedActions: initialSceneGenerationResponse.firstSceneProposedActions,
    },
  });

  const databaseUpdateEnd = performance.now();

  log.debug(`Finished creating new session. Statistics:
- Authorization: ${authorizationEnd - authorizationStart}ms
- Session data generation: ${sessionDataGenerationEnd - authorizationEnd}ms
- Database update: ${databaseUpdateEnd - sessionDataGenerationEnd}ms
- Total: ${databaseUpdateEnd - authorizationStart}ms`);

  // redirect to new session
  redirect(getScenePlayPagePath(newSessionId, null));
}

export async function createNextSceneAction({
  userId,
  sessionId,
  action,
  onInProgressUpdate,
}: {
  userId: number;
  sessionId: number;
  action: string;
  onInProgressUpdate?: (
    inProgressUpdateEvent: GenerateNextSceneDataInProgressUpdate,
  ) => void;
}): Promise<void> {
  log.debug("Started generating next scene action");

  const start = performance.now();

  if (action === "") {
    throw new Error("Empty action is not allowed!");
  }

  // check that the user owns the session
  if (!(await doesUserHaveGameSession({ userId, sessionId }))) {
    throw new Error("User does not own session.");
  }

  const authorizationCheckEnd = performance.now();

  log.debug("Finished authorization check; trying to acquire session lock");

  // lock the session before retrieving inputs
  await tryLockSessionUntilAcquire({ sessionId });
  const lockSessionEnd = performance.now();

  log.debug("Session lock acquired; retrieving input data from database");

  // retrieve all the scenes in the session
  const [sessionMetadata, scenes] = await Promise.all([
    getGameSessionMetadata({ userId, sessionId }),
    getScenesBySession({ userId, sessionId }),
  ]);

  const inputDataRetrievalEnd = performance.now();

  log.debug("Input data retrieved; generating next scene data");

  let nextScene: NextSceneGenerationResponse;

  try {
    nextScene = await generateNextSceneData({
      backstory: sessionMetadata.backstory,
      scenes: scenes,
      currentAction: action,
      onInProgressUpdate,
    });
  } catch (error) {
    await unlockSession({ sessionId });

    throw new Error(`Error occurred when generating next scene data: ${error}`);
  }

  const nextSceneDataGenerationEnd = performance.now();

  log.debug("Next scene data generated");

  // send event to inngest and schedule database writing operation to run in the background
  const inngestEventData = {
    userId,
    sessionId,
    previousAction: action,
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
}

export interface SceneViewInitialData {
  userId: number;
  sceneIndex: number;
  sessionLength: number;
  imageUrl: string;
  imageDescription: string;
  narration: string;
  action: string | null;
  proposedActions: string[];
}

export async function getSceneViewInitialData(
  sessionId: number,
  sceneIndex: number | "last",
): Promise<SceneViewInitialData> {
  const user = (await getCurrentUser())!;

  // TODO: optimize to remove this query
  const sessionLength = await getGameSessionLength(user.id, sessionId);

  const parsedIndex = sceneIndex === "last" ? sessionLength - 1 : sceneIndex;

  const [scene] = await Promise.all([
    getSceneBySessionAndIndex({
      userId: user.id,
      sessionId,
      sceneIndex: parsedIndex,
    }),
  ]);

  return {
    ...scene,
    userId: user.id,
    sceneIndex: parsedIndex,
    sessionLength,
  };
}

const PostCommentFormSchema = z.object({
  text: z.string().min(1, "Comment must not be empty!"),
});

export type PostCommentActionErrors = {
  fieldErrors?: {
    [Key in keyof z.infer<typeof PostCommentFormSchema>]?: string[];
  };
  message?: string;
};

export type PostCommentActionResponse = {
  errors?: PostCommentActionErrors;
};

export async function postCommentAction(
  userId: number,
  gameTemplateId: number,
  formData: FormData,
): Promise<PostCommentActionResponse> {
  const formParseResult = PostCommentFormSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );

  if (!formParseResult.success) {
    return {
      errors: { fieldErrors: formParseResult.error.flatten().fieldErrors },
    };
  }

  const { text } = formParseResult.data;

  await addComment({ userId, gameTemplateId, text });

  revalidatePath(getTemplateOverviewPath(gameTemplateId));

  return {};
}

export interface DeleteGameSessionActionResponse {
  success: boolean;
  error?: string;
}

export async function deleteGameSessionAction({
  userId,
  sessionId,
}: {
  userId: number;
  sessionId: number;
}): Promise<DeleteGameSessionActionResponse> {
  try {
    await deleteGameSession({ userId, sessionId });

    return { success: true };
  } catch (error) {
    return { success: false, error: `${error}` };
  }
}

export interface DeleteGameTemplateActionResponse {
  success: boolean;
  error?: string;
}

export async function deleteGameTemplateAction({
  userId,
  templateId,
}: {
  userId: number;
  templateId: number;
}): Promise<DeleteGameTemplateActionResponse> {
  try {
    await deleteGameTemplate({ userId, templateId });

    return { success: true };
  } catch (error) {
    return { success: false, error: `${error}` };
  }
}

export interface GenerateAiImageActionResponse {
  imageUrl?: string;
  error?: string;
}
export async function generateAiImageAction({
  prompt,
}: {
  prompt: string;
}): Promise<GenerateAiImageActionResponse> {
  if (prompt === "") {
    return {
      error: "Prompt must not be empty!",
    };
  }
  try {
    const imageUrl = await generateImage(prompt);

    return { imageUrl };
  } catch (error) {
    return { error: `${error}` };
  }
}

export interface GameTemplateData {
  name: string;
  description: string | null;
  backstory: string;
  coverImageUrl: string;
  coverImageDescription: string;
  firstSceneData: {
    imageUrl: string;
    imageDescription: string;
    event: string;
    narration: string;
    proposedActions: string[];
  };
  publicTemplate: boolean;
}

const firstSceneSchema = z.object({
  imageUrl: z.string().min(1, "First scene image URL must not be empty!"),
  imageDescription: z
    .string()
    .min(1, "First scene image description must not be empty!"),
  event: z.string().min(1, "First scene event must not be empty!"),
  narration: z.string().min(1, "First scene narration must not be empty!"),
  proposedActions: z
    .array(z.string().min(1, "First scene proposed action must not be empty!"))
    .min(1, "First scene proposed actions must not be empty!"),
});

const GameTemplateDataSchema = z.object({
  name: z.string().min(1, "Name must not be empty!"),
  description: z.string().min(1, "Description must not be empty!").nullable(),
  backstory: z.string().min(1, "Backstory must not be empty!"),
  coverImageUrl: z.string().min(1, "Cover image URL must not be empty!"),
  coverImageDescription: z
    .string()
    .min(1, "Cover image description must not be empty!"),
  firstSceneData: firstSceneSchema,
  publicTemplate: z.boolean(),
});

type DeepPartialStringArrays<T> = {
  [K in keyof T]?: T[K] extends (infer U)[]
    ? U extends object
      ? DeepPartialStringArrays<U>[]
      : string[]
    : T[K] extends object
      ? DeepPartialStringArrays<T[K]>
      : string[];
};

export type GameTemplateDataSubmitErrors = {
  message?: string;
  fieldErrors?: DeepPartialStringArrays<GameTemplateData>;
};

export async function updateGameTemplateAction({
  userId,
  templateId,
  data,
}: {
  userId: number;
  templateId: number;
  data: GameTemplateData;
}): Promise<GameTemplateDataSubmitErrors | undefined> {
  const dataParseResult = GameTemplateDataSchema.safeParse(data);
  const firstSceneParseResult = firstSceneSchema.safeParse(data.firstSceneData);

  if (!dataParseResult.success || !firstSceneParseResult.success) {
    const baseErrors = dataParseResult.error?.flatten().fieldErrors;
    const firstSceneErrors = firstSceneParseResult.error?.flatten().fieldErrors;

    return {
      fieldErrors: {
        ...baseErrors,
        firstSceneData: firstSceneErrors,
      },
    };
  }

  try {
    await updateGameTemplateData({ userId, templateId, newData: data });
  } catch (error) {
    return {
      message: `${error}`,
    };
  }
}
