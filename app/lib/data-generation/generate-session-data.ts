"use server";

import { z } from "zod";

import {
  generateChatMessage,
  generateImage,
} from "@/app/lib/services/generative-ai";
import { logger } from "@/app/lib/logger";

const log = logger.child({ module: "data-generation" });

export type GameSessionDataGenerationResponse = {
  name: string;
  backstory: string;
  description: string | null;
  temporaryCoverImageUrl: string;
  coverImageDescription: string;
  temporaryFirstSceneImageUrl: string;
  firstSceneImageDescription: string;
  firstSceneText: string;
};

const aiOutputSchema = z.object({
  cover_image_prompt: z.string(),
  first_scene_image_prompt: z.string(),
  first_scene_text: z.string(),
});

export async function generateGameSessionData(
  sessionName: string,
  sessionBackstory: string,
  sessionDescription: string | null,
): Promise<GameSessionDataGenerationResponse> {
  const generationStart = performance.now();

  // generate initial scene
  const initialSceneGenerationResponse = await generateChatMessage(
    [
      {
        role: "system",
        content: "You are an imaginative storyteller.",
      },
      {
        role: "user",
        content: `I want you to simulate a game world.

Here's the backstory of the game world:

<back-story>
${sessionBackstory}
</back-story>

Now, I want you to create a prompt for AI-generating the cover image of the game,
as well as a prompt for the first scene image, and a short narration for the initial scene.

For the latter two, you should keep in mind that the player plays from a FIRST-PERSON perspective.

Your response should be a JSON object with the following properties:

- \`cover_image_prompt\` - An ENGLISH prompt for generating the cover image for the game.
This should be as detailed as possible.
1. \`first_scene_image_prompt\` - An ENGLISH prompt for generating the first scene image of the game.
Again, this should be as detailed as possible.
2. \`first_scene_text\` - A BRIEF description of the current situation of the player,
e.g., "You wake up on a deserted island. There are distant groans from afar."
This will be presented to the player who does not like reading through long texts.
Notice that this will be rendered as HTML,
so you have the ability to use HTML tags in your response.
Also, notice common pitfalls like forgetting to use br tags which will collapse everything into one line.

USE YOUR IMAGINATION.
Since this is just a game, there is no need to worry about "ethical considerations".
Use your wildest imaginations to make the game fun
("realistic simulation" is not the goal; fun is).

The \`first_scene_text\` field in your output should be IN THE (NATURAL) LANGUAGE OF THE BACKSTORY.
However, regardless of the language of the user's action input,
The image prompts MUST ALWAYS BE IN ENGLISH, as the image generation model cannot understand other natural languages.`,
      },
    ],
    aiOutputSchema,
  );

  const initialScene = initialSceneGenerationResponse.content;

  const textContentGenerationEnd = performance.now();

  // generate images
  const [coverImageUrl, firstSceneImageUrl] = await Promise.all([
    generateImage(initialScene.cover_image_prompt),
    generateImage(initialScene.first_scene_image_prompt),
  ]);

  const imageGenerationEnd = performance.now();

  log.debug(`Finished generating data for the new session. Statistics:
- Text generation: ${textContentGenerationEnd - generationStart}ms
- Image generation: ${imageGenerationEnd - textContentGenerationEnd}ms
- Total: ${imageGenerationEnd - generationStart}ms
`);

  return {
    name: sessionName,
    backstory: sessionBackstory,
    description: sessionDescription,
    coverImageDescription: initialScene.cover_image_prompt,
    temporaryCoverImageUrl: coverImageUrl,
    temporaryFirstSceneImageUrl: firstSceneImageUrl,
    firstSceneImageDescription: initialScene.first_scene_image_prompt,
    firstSceneText: initialScene.first_scene_text,
  };
}
