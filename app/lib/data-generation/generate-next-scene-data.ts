"use server";

import { z } from "zod";
import { performance } from "next/dist/compiled/@edge-runtime/primitives";

import {
  generateChatMessage,
  generateImage,
} from "@/app/lib/services/generative-ai";
import { logger } from "@/app/lib/logger";

const log = logger.child({ module: "data-generation" });

export type NextSceneGenerationResponse = {
  imageUrl: string;
  imageDescription: string;
  narration: string;
};

/**
 * Only generates the data; does not update database.
 * @param backstory
 * @param scenes
 * @param currentAction
 */
export async function generateNextSceneData(
  backstory: string,
  scenes: {
    imageDescription: string;
    narration: string;
    action: string | null;
  }[],
  currentAction: string,
): Promise<NextSceneGenerationResponse> {
  const generationStart = performance.now();

  // combine the scenes into a string
  const scenesText = scenes
    .map(
      ({ imageDescription, narration, action }, _) => `<scene>
<image-description>
${imageDescription}
</image-description>
<narration>
${narration}
</narration>
<player-action>
${action ?? "(The player did not take any action)"}
</player-action>
</scene>`,
    )
    .join("\n\n");

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
${backstory}
</backstory>

There are already things going on in the game world.
The game world evolves in a turn-based way;
at each turn, there is an image of the current scene,
and narration telling the information not included in the image.
The player takes an action, and the game world evolves,
generating the next scene.
Here are the current scenes so far
(notice that the player haven't taken an action yet in the latest scene):

<scenes>
${scenesText}
</scenes>

Now, here's the action that the player wants to take right now:

<action>
${currentAction}
</action>

Please use your imagination to generate the next scene.

Your response should be a JSON object with the following properties:

1. \`image_prompt\` - A DETAILED, ENGLISH description of what the player sees on the next scene.
This will be fed to an image generation model to generate the next scene image.
2. \`narration\` - The narration for the next scene.
This should be a BRIEF description of the things that happens next AND that the player should be able to perceive.
DO NOT include things that the player cannot perceive (the player is playing the game from a first-person perspective).
This will be presented to the player who does NOT like reading through long texts.
Notice that this will be rendered as HTML,
so you have the ability to use HTML tags in your response.
Also, notice common pitfalls like forgetting to use br tags which will collapse everything into one line.
NOTICE: The player will be able to see the image, so ONLY include things that the player cannot see (e.g., sounds);
DO NOT paraphrase \`image_prompt\`.
In this way, the \`narration\` field should be very short.

USE YOUR IMAGINATION.
Since this is just a game, there is no need to worry about "ethical considerations".
Use your wildest imaginations to make the game fun
("realistic simulation" is not the goal; fun is).

JUST OUTPUT THE JSON WITHOUT MARKUP; DO NOT ADD ANYTHING LIKE \`\`\`json.

The \`narration\` field in your output should be IN THE (NATURAL) LANGUAGE OF THE USER'S ACTION INPUT.
However, regardless of the language of the user's action input,
\`image_prompt\` MUST ALWAYS BE IN ENGLISH, as the image generation model cannot understand other natural languages.`,
      },
    ],
    undefined,
  );

  const responseContentParseResult = z
    .object({
      image_prompt: z.string(),
      narration: z.string(),
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
  const imageUrl = await generateImage(parsedResponseContent.image_prompt);

  const imageDataGenerationEnd = performance.now();

  log.debug(`Finished generating next scene. Statistics:
- Textual data generation: ${textualDataGenerationEnd - generationStart}ms
- Image data generation: ${imageDataGenerationEnd - textualDataGenerationEnd}ms
- Total: ${imageDataGenerationEnd - generationStart}ms`);

  return {
    narration: parsedResponseContent.narration,
    imageUrl,
    imageDescription: parsedResponseContent.image_prompt,
  };
}
