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
  event: string;
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
    event: string;
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
      ({ event, imageDescription, narration, action }, _) => `<scene>
<scene-image-description>
${imageDescription}
</scene-image-description>
<oracle-event>
${event === "" ? "(This data record is unfortunately lost)" : event}
</oracle-event>
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
Below are the current scenes so far.
In each scene,
\`scene-image-description\` is a description of what the player saw (from a first-person perspective);
\`oracle-event\` is a description of what happened in the game world in this scene,
written from an "oracle" perspective (I.e., this includes both what the player can and cannot perceive);
\`narration\` provides additional information (that was not included in \`scene-image-description\`) on what the player perceived;
\`player-action\` is the action taken by the player.
Notice that the player haven't taken an action yet in the latest scene.

<scenes>
${scenesText}
</scenes>

Now, here's the action that the player wants to take right now:

<action>
${currentAction}
</action>

Please use your imagination to generate the next scene.

Your response should be a JSON object with the following properties:

- \`oracle_event\` - A description of what happened in the first scene.
Such a description is written from an "oracle" perspective.
Include both what the player can and cannot perceive.
- \`image_prompt\` - A DETAILED, ENGLISH description of what the player sees on the next scene.
This will be fed to an image generation model to generate the next scene image.
Specify as many details as possible, ("describe like you've never described an image before"),
such as lighting environment, object shape/location/relationships, style, colors, etc.
The goal is to embed ALL information in the image into this text prompt,
because later on, another AI will look at the prompt and generate image for another scene.
If you fail to specify the details, images for different scenes will likely be INCOHERENT
(e.g., the look of the character suddenly differ).
The player is playing the game from a FIRST-PERSON perspective;
he/she should NOT be able to see his/her body (unless looking in a mirror or something)
- \`narration\` - The narration for the next scene.
This should be a BRIEF description of the things that happens next AND that the player should be able to perceive.
DO NOT include things that the player cannot perceive (the player is playing the game from a first-person perspective).
This will be presented to the player who does NOT like reading through long texts.
Notice that this will be rendered as HTML,
so you have the ability to use HTML tags in your response.
Also, notice common pitfalls like forgetting to use br tags which will collapse everything into one line.
NOTICE: The player will be able to see the image, so ONLY include things that the player cannot see (e.g., sounds);
DO NOT paraphrase \`image_prompt\`.
In this way, the \`narration\` field should be very short.

These JSON fields should all pertain to the "world state" AFTER the player has taken the action,
NOT before the action completes.

USE YOUR IMAGINATION.
Since this is just a game, there is no need to worry about "ethical considerations".
Use your wildest imaginations to make the game fun
("realistic simulation" is not the goal; fun is).

JUST OUTPUT THE JSON WITHOUT MARKUP; DO NOT ADD ANYTHING LIKE \`\`\`json.

The \`oracle_event\` and \`narration\` field in your output should be IN THE (NATURAL) LANGUAGE OF THE USER'S ACTION INPUT.
However, regardless of the language of the user's action input,
\`image_prompt\` MUST ALWAYS BE IN ENGLISH, as the image generation model cannot understand other natural languages.

Again, the player is playing the game from a FIRST-PERSON perspective;
he/she should NOT be able to see his/her body (unless looking in a mirror or something)`,
      },
    ],
    undefined,
  );

  const responseContentParseResult = z
    .object({
      oracle_event: z.string(),
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
    event: parsedResponseContent.oracle_event,
    narration: parsedResponseContent.narration,
    imageUrl,
    imageDescription: parsedResponseContent.image_prompt,
  };
}
