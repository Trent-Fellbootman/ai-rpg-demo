"use server";

import { z } from "zod";
import { performance } from "next/dist/compiled/@edge-runtime/primitives";

import {
  addGeneratedSceneToSession,
  doesUserOwnSession,
  downloadImageToStorage,
  getScenes,
  getSessionMetadata,
  lockSession,
  unlockSession,
} from "@/app/lib/data/apis";
import {
  generateChatMessage,
  generateImage,
} from "@/app/lib/services/generative-ai";
import { logger } from "@/app/lib/logger";
import { Scene } from "@/app/lib/data/data-models";

const log = logger.child({ module: "generative-ai" });

type FieldErrors = {
  action?: string[];
};

export type Errors = {
  message?: string;
  fieldErrors?: FieldErrors;
};

export type GenerateNextSceneActionResponse = {
  errors?: Errors;
  nextScene?: NextSceneGenerationResponse;
};

const FormSchema = z.object({
  action: z.string().min(1, "Action must be non-empty!"),
});

export async function generateNextSceneAction(
  userId: string,
  sessionId: string,
  formData: FormData,
): Promise<GenerateNextSceneActionResponse> {
  const start = performance.now();

  // Validate form fields using zod
  const formParseResult = FormSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );

  if (!formParseResult.success) {
    return {
      errors: { fieldErrors: formParseResult.error.flatten().fieldErrors },
    };
  }

  // check that the user owns the session
  if (!(await doesUserOwnSession(userId, sessionId))) {
    throw new Error("User does not own session.");
  }

  const authorizationCheckEnd = performance.now();

  // lock the session before retrieving inputs
  await lockSession(sessionId);
  const lockSessionEnd = performance.now();

  // retrieve all the scenes in the session
  const [sessionMetadata, scenes] = await Promise.all([
    getSessionMetadata(sessionId),
    getScenes(sessionId),
  ]);

  const inputDataRetrievalEnd = performance.now();

  const nextSceneGenerationResult = await (async () => {
    try {
      const nextScene = await generateNextSceneData(
        sessionMetadata.backStory,
        scenes,
        formParseResult.data.action,
      );

      return { nextScene };
    } catch (error) {
      return {
        error,
      };
    }
  })();

  if (!nextSceneGenerationResult.nextScene) {
    // an error occurred during next scene generation
    // release session lock and return error
    await unlockSession(sessionId);

    return {
      errors: {
        message: `An error occurred when generating the next scene: ${nextSceneGenerationResult.error}`,
      },
    };
  }

  const nextScene = nextSceneGenerationResult.nextScene;

  const nextSceneDataGenerationEnd = performance.now();

  // deliberately do not await to make this run in the background
  void (async () => {
    await updateSceneDatabase(
      sessionId,
      formParseResult.data.action,
      nextScene,
    );
    // unlock session after database update is complete
    await unlockSession(sessionId);
  })();

  log.debug(`Finished generating next scene (but did not update database).
Statistics:
- Authorization check: ${authorizationCheckEnd - start}ms
- Waiting for session lock: ${lockSessionEnd - authorizationCheckEnd}ms
- Input data retrieval: ${inputDataRetrievalEnd - lockSessionEnd}ms
- Next scene data generation: ${nextSceneDataGenerationEnd - inputDataRetrievalEnd}ms
- Total: ${nextSceneDataGenerationEnd - start}ms`);

  return { nextScene: nextScene };
}

export async function updateSceneDatabase(
  sessionId: string,
  previousAction: string,
  nextScene: NextSceneGenerationResponse,
) {
  const databaseUpdateStart = performance.now();

  // add image to storage
  const imagePath = await downloadImageToStorage(nextScene.imageUrl);

  const imageStorageUpdateEnd = performance.now();

  // update action in the current last scene and add a new scene with empty action in an atomic manner
  await addGeneratedSceneToSession(sessionId, previousAction, {
    text: nextScene.text,
    imageStoragePath: imagePath,
    imageDescription: nextScene.imageDescription,
    action: "",
  });

  const SQLDatabaseUpdateEnd = performance.now();

  log.debug(`Finished writing previous action & next scene to database. Statistics:
- Image storage update: ${imageStorageUpdateEnd - databaseUpdateStart}ms
- SQL Database update: ${SQLDatabaseUpdateEnd - imageStorageUpdateEnd}ms
- Total: ${SQLDatabaseUpdateEnd - databaseUpdateStart}ms`);
}

export type NextSceneGenerationResponse = {
  imageUrl: string;
  imageDescription: string;
  text: string;
};

/**
 * Only generates the data; does not update database.
 * @param backStory
 * @param scenes
 * @param action
 */
export async function generateNextSceneData(
  backStory: string,
  scenes: Scene[],
  action: string,
): Promise<NextSceneGenerationResponse> {
  const generationStart = performance.now();

  // combine the scenes into a string
  const scenesText = scenes
    .map(
      ({ text }, _) => `
<scene>
<image-description>
</image-description>
<additional-description>
${text}
</additional-description>
</scene>`,
    )
    .join("\n");

  // call the AI to generate next scene and image description.
  const response = await generateChatMessage(
    [
      {
        role: "system",
        content: "You are an imaginative storyteller.",
      },
      {
        role: "user",
        content: `I want you to simulate what would happen in a game world.
The player is playing the game from a first-person perspective.

The game is "turn-based". Each turn, the player describes the action he/she wants to take,
and a new scene is generated.

Here's the backstory of the game world:

<backstory>
${backStory}
</backstory>

Here are what happened so far:

<scenes>
${scenesText}
</scenes>

Now, here's the action that the player wants to take:

<action>
${action}
</action>

Please use your imagination to generate the next scene.

Your response should be a JSON object with the following properties:

1. \`image_description\` - A DETAILED description of what the player sees.
This will be used to generate an image with AI.
2. \`content\` - A BRIEF description of the things that just happened AND that the player should be able to perceive.
If it's about someone saying something,
This will be presented to the player who does not like reading through long texts.
Notice that this will be rendered as HTML,
so you have the ability to use HTML tags in your response.
Also, notice common pitfalls like forgetting to use br tags which will collapse everything into one line.
NOTICE: The player will be able to see the image, so ONLY include things that the player cannot see (e.g., sounds);
DO NOT paraphrase \`image_description\`.
In this way, the \`content\` field should be very short.

USE YOUR IMAGINATION.
Since this is just a game, there is no need to worry about "ethical considerations".
Use your wildest imaginations to make the game fun
("realistic simulation" is not the goal; fun is).

JUST OUTPUT THE JSON WITHOUT MARKUP; DO NOT ADD ANYTHING LIKE \`\`\`json.`,
      },
    ],
    undefined,
  );

  const responseContentParseResult = z
    .object({
      content: z.string(),
      image_description: z.string(),
    })
    .safeParse(JSON.parse(response.content));

  if (!responseContentParseResult.success) {
    throw new Error(
      `Error parsing response content: ${responseContentParseResult.error}`,
    );
  }

  const parsedResponseContent = responseContentParseResult.data;

  const textualDataGenerationEnd = performance.now();

  // generate image
  const imageUrl = await generateImage(parsedResponseContent.image_description);

  const imageDataGenerationEnd = performance.now();

  log.debug(`Finished generating next scene. Statistics:
- Textual data generation: ${textualDataGenerationEnd - generationStart}ms
- Image data generation: ${imageDataGenerationEnd - textualDataGenerationEnd}ms
- Total: ${imageDataGenerationEnd - generationStart}ms`);

  return {
    text: parsedResponseContent.content,
    imageUrl,
    imageDescription: parsedResponseContent.image_description,
  };
}
