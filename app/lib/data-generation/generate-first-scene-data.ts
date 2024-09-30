"use server";

import { z } from "zod";

import { promptConstants } from "./prompt-constants";

import {
  generateChatMessage,
  generateImage,
} from "@/app/lib/services/generative-ai";
import { logger } from "@/app/lib/logger";

const log = logger.child({ module: "data-generation" });

const firstSceneAndCoverImagePromptAiDataSchema = z.object({
  first_scene_oracle_event: z.string(),
  first_scene_image_prompt: z.string(),
  first_scene_narration: z.string(),
  proposed_actions: z.array(z.string()),
});

export interface FirstSceneData {
  event: string;
  imageUrl: string;
  imageDescription: string;
  narration: string;
  proposedActions: string[];
}

export async function generateInitialSceneData({
  name,
  backstory,
  description,
}: {
  name: string;
  backstory: string;
  description: string | null;
}): Promise<FirstSceneData> {
  const generationStart = performance.now();

  // TODO: parallelize the parallelizable
  //  (image prompt, narration and proposed actions can be generated in parallel following oracle event)
  // generate initial scene
  const initialSceneGenerationResponse = await generateChatMessage(
    [
      {
        role: "system",
        content: "You are an imaginative storyteller.",
      },
      {
        role: "user",
        content: `I'm creating a game.

${promptConstants.gameMechanicsDescription}

Here's the backstory of the game:

<backstory>
${backstory}
</backstory>
        
I want you to create a prompt for the first scene image, and a short narration for the initial scene.

You should keep in mind that the player plays from a FIRST-PERSON perspective.

Your response should be a JSON object with the following properties:

- \`first_scene_oracle_event\` - ${promptConstants.firstSceneOracleEventFieldDescription}
- \`first_scene_image_prompt\` - ${promptConstants.firstSceneImagePromptFieldDescription}
he/she should NOT be able to see his/her body (unless looking in a mirror or something)
- \`first_scene_narration\` - ${promptConstants.firstSceneTextPromptFieldDescription}
- \`proposed_actions\` - ${promptConstants.proposedActionsFieldDescription}

USE YOUR IMAGINATION.
Since this is just a game, there is no need to worry about "ethical considerations".
Use your wildest imaginations to make the game fun
("realistic simulation" is not the goal; fun is).

The \`first_scene_oracle_event\` and \`first_scene_narration\` field in your output should be IN THE (NATURAL) LANGUAGE OF THE BACKSTORY.
However, regardless of the language of the user's action input,
The image prompt MUST ALWAYS BE IN ENGLISH, as the image generation model cannot understand other natural languages.`,
      },
    ],
    firstSceneAndCoverImagePromptAiDataSchema,
  );

  const initialScene = initialSceneGenerationResponse.content;

  const textContentGenerationEnd = performance.now();

  // generate images
  const [firstSceneImageUrl] = await Promise.all([
    generateImage(initialScene.first_scene_image_prompt),
  ]);

  const imageGenerationEnd = performance.now();

  log.debug(`Finished generating data for the new session. Statistics:
- Text generation: ${textContentGenerationEnd - generationStart}ms
- Image generation: ${imageGenerationEnd - textContentGenerationEnd}ms
- Total: ${imageGenerationEnd - generationStart}ms
`);

  return {
    event: initialScene.first_scene_oracle_event,
    imageUrl: firstSceneImageUrl,
    imageDescription: initialScene.first_scene_image_prompt,
    narration: initialScene.first_scene_narration,
    proposedActions: initialScene.proposed_actions,
  };
}
