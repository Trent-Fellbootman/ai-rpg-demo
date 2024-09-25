import { performance } from "next/dist/compiled/@edge-runtime/primitives";

import {
  generateChatMessage,
  generateChatMessageStream,
  generateImage,
} from "@/app/lib/services/generative-ai";
import { logger } from "@/app/lib/logger";
import { promptConstants } from "@/app/lib/data-generation/prompt-constants";
import { splitString } from "@/app/lib/utils/string-operations";

const log = logger.child({ module: "data-generation" });

export type NextSceneGenerationResponse = {
  event: string;
  imageUrl: string;
  imageDescription: string;
  narration: string;
  proposedActions: string[];
};

export type GenerateNextSceneDataInProgressUpdate =
  | { type: "NarrationChunk"; data: { chunk: string } }
  | {
      type: "ProposedActionUpdate";
      data: { proposedActions: string[] };
    }
  | { type: "ImageUrl"; data: { imageUrl: string } }
  | { type: "Finish" };

/**
 * Only generates the data; does not update database.
 * @param backstory
 * @param scenes
 * @param currentAction
 * @param onIntermediateResult
 */
export async function generateNextSceneData({
  backstory,
  scenes,
  currentAction,
  onInProgressUpdate,
}: {
  backstory: string;
  scenes: {
    event: string;
    imageDescription: string;
    narration: string;
    action: string | null;
  }[];
  currentAction: string;
  onInProgressUpdate?: (
    inProgressUpdateEvent: GenerateNextSceneDataInProgressUpdate,
  ) => void;
}): Promise<NextSceneGenerationResponse> {
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
  const oracleEventGenerationResponse = await generateChatMessage(
    [
      {
        role: "system",
        content: "You are an imaginative storyteller.",
      },
      {
        role: "user",
        content: `I want you to simulate what would happen in a game world.

${promptConstants.gameMechanicsDescription}

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

Please use your imagination to imagine what happens next
and generate the \`oracle-event\` for the next scene.
This should be written from an "oracle" perspective.
And it should be written in a third-person tone (e.g., "The player" instead of "You").
It should include not only what the happened around the player,
but also ongoing events in the game world that the player cannot perceive.
It should pertain to the "world state" AFTER the player has taken the action,
NOT before the action completes.

USE YOUR IMAGINATION.
Since this is just a game, there is no need to worry about "ethical considerations".
Use your wildest imaginations to make the game fun
("realistic simulation" is not the goal; fun is).

You are ENCOURAGED to use your imagination and generate events that are not direct results of player's actions,
as long as those events are reasonable and logically consistent with the game world.
For example, how would a character feel if he/she was hurt by the player?
Could there be secret schemes against the player carried out by some other forces in the game world?
Could there be random events out of the player's control?
Natural disasters? Accidents? You name it.
There could be a lot of hidden storylines going on without being notified by the player
(and you can track and progress those plots in the \`oracle-event\` fields in scenes.
just don't evolve too many hidden storylines simultaneously in one scene to avoid making the \`oracle-event\` field too long).
You should generate events PROACTIVELY instead of passively wait for player input.
Of course, it is best that the events are related (even if not direct result) to the player's actions
(e.g., the player killed a pedestrian several scenes ago and now his brother is coming for the player).
When the time is right, these events will go to the player proactively.

Try to GIVE THE PLAYER A SURPRISE on every scene.
ADVANCE the plot and introduce new, unexpected events (e.g., someone died);
DO NOT just wait for player's action.

Player's actions may NOT always succeed.
E.g., if the player has no weapon, there's man with a gun trying to kill the player,
then the player cannot escape or kill the man even if he/she takes an action like "kill the man".
You should ensure that the consequence of the player's action is REASONABLE and POSSIBLE in the game world,
and you are ALLOWED to make player's actions result in an unexpected way
(e.g., play tries to kill someone but was shot).

Keep this succinct.
Use the fewest words possible to describe what happens without any rhetoric.
It's best to keep this within 50 words.
Since contents displayable to the player must be generated after the oracle event is generated in its whole,
the longer it takes for you to finish,
the more delay the player will perceive.

Your output MUST be in the same human language as the player's action input.

Output the \`oracle-event\` for the next scene ONLY and NOTHING ELSE.`,
      },
    ],
    undefined,
  );

  const oracleEvent = oracleEventGenerationResponse.content;

  const oracleEventGenerationEnd = performance.now();

  const imagePromptGenerationPrompt = `I want you to help me generate an image for a game.

${promptConstants.gameMechanicsDescription}

Here's the backstory of the game:

<backstory>
${backstory}
</backstory>

There are already things going on in the game world.
The game world evolves in a turn-based way;
at each turn, there is an image of the current scene,
and narration telling the information not included in the image.
The player takes an action, and the game world evolves,
generating the next scene.

Now, the player has taken a new action.
Here's the player action:

<player-action>
${currentAction}
</player-action>

Following that, the game world evolves,
and here's what happens next (notice that the player may not be able to perceive all these):

<oracle-event>
${oracleEvent}
</oracle-event>

Here's the prompt for AI-generating the image for the last scene:

<description>
${scenes[scenes.length - 1].imageDescription}
</description>

Please use your imagination to write a prompt for AI-generating the image for the current scene.

Your prompt should be as detailed as possible and maintain coherence
(e.g., object colors, shapes, etc.)
with the last scene image.
This is also why I gave you the image prompt for the previous scene.
For coherence, you should try to embed all the information in the image into this prompt.
If you fail to specify the details, images for different scenes will likely be INCOHERENT
(e.g., the look of the character suddenly differ).

The player is playing the game from a FIRST-PERSON perspective;
he/she should NOT be able to see his/her body (unless looking in a mirror or something)

The image prompt should depict what the player sees AFTER the action is complete,
NOT what he/she sees as the action is being taken.

The image prompt MUST be in English regardless of the language of the player's action input or scene description,
because the image generation model does not understand other languages.

Output the image prompt ONLY and NOTHING ELSE.`;

  const narrationGenerationPrompt = `I want you to generate short narration for a game.

${promptConstants.gameMechanicsDescription}

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

Now, the player has taken a new action.
Here's the player action:

<player-action>
${currentAction}
</player-action>

Following that, the game world evolves,
and here's what happens next (notice that the player may not be able to perceive all these):

<oracle-event>
${oracleEvent}
</oracle-event>

Please write a short narration that describes the next scene.
This should be a BRIEF description of the things that happen next AND that the player should be able to perceive.
DO NOT include things that the player cannot perceive (the player is playing the game from a first-person perspective).
Notice that this will be rendered as HTML,
so you have the ability to use HTML tags in your response.
Also, notice common pitfalls like forgetting to use br tags which will collapse everything into one line.

The narration MUST be in the natural language as the player's action.

Output the narration ONLY and NOTHING ELSE.`;

  const proposedActionsGenerationPrompt = `I want you to propose actions for a player playing a game.

${promptConstants.gameMechanicsDescription}

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

Now, the player has taken a new action.
Here's the player action:

<player-action>
${currentAction}
</player-action>

Following that, the game world evolves,
and here's what happens next (notice that the player may not be able to perceive all these):

<oracle-event>
${oracleEvent}
</oracle-event>

Please use your imagination to propose FOUR actions that the player can take next.

USE YOUR IMAGINATION.
Since this is just a game, there is no need to worry about "ethical considerations".
Use your wildest imaginations to make the game fun
("realistic simulation" is not the goal; fun is).

Your actions MUST be in the same natural language as the player's action.

Separate the actions in an HTML-like fashion.
Enclose each action in \`<action></action>\`.

An example output may look like:

<action>
Kill the bastard
</action>
<action>
Run away
</action>
<action>
Choke the witness in hot chocolate
</action>
<action>
Threat the teacher to disclose the exam problems with an RPG
</action>

As you may have seen in the example, you're encouraged to propose creative, fun and even absurd actions.
You may make one of the actions "ordinary, reasonable (and dumb)";
for the rest, use your imagination to make them as insteresting and fun as possible.`;

  const generateImageUrl = async () => {
    log.debug("Started generating image prompt");

    const response = await generateChatMessage([
      {
        role: "system",
        content:
          "You are a master in writing prompts for generating images with AI.",
      },
      {
        role: "user",
        content: imagePromptGenerationPrompt,
      },
    ]);

    log.debug("Image prompt generated");

    const imagePrompt = response.content as string;

    const imageUrl = await generateImage(imagePrompt);

    log.debug("Image generated");

    onInProgressUpdate?.({ type: "ImageUrl", data: { imageUrl } });

    log.debug("Called on in progress update; finished generating image");

    return { prompt: imagePrompt, imageUrl };
  };

  const generateNarration = async () => {
    log.debug("Started generating narration");

    let narrationContent = "";

    for await (const chunk of generateChatMessageStream([
      {
        role: "system",
        content: "You are a great writer.",
      },
      {
        role: "user",
        content: narrationGenerationPrompt,
      },
    ])) {
      onInProgressUpdate?.({ type: "NarrationChunk", data: { chunk } });
      narrationContent += chunk;
    }

    log.debug("Received all chunks of narration");

    return narrationContent;
  };

  const generateProposedActions = async () => {
    log.debug("Started generating proposed actions");

    let buffer = "";

    const startDelimiter = "<action>";
    const endDelimiter = "</action>";

    // includes <action> and </action>
    for await (const chunk of generateChatMessageStream([
      {
        role: "system",
        content: "You are an imaginative storyteller.",
      },
      {
        role: "user",
        content: proposedActionsGenerationPrompt,
      },
    ])) {
      buffer += chunk;

      const segments = splitString(buffer, startDelimiter, endDelimiter);

      onInProgressUpdate?.({
        type: "ProposedActionUpdate",
        data: { proposedActions: segments.map((item) => item.content.trim()) },
      });
    }

    log.debug("Received all chunks of proposed actions");

    const splitResult = splitString(buffer, startDelimiter, endDelimiter);

    log.debug("Split proposed actions into segments");

    if (splitResult.length !== 4) {
      throw new Error("Incorrect number of proposed actions!");
    }

    for (const segment of splitResult) {
      if (segment.type !== "complete") {
        throw new Error(`There is an incomplete segment!`);
      }
    }

    const proposedActions = splitResult.map((item) => item.content.trim());

    log.debug("Validated final proposed actions");

    onInProgressUpdate?.({
      type: "ProposedActionUpdate",
      data: { proposedActions },
    });

    log.debug(
      "Called final on-in-progress-update; finished generating proposed actions",
    );

    return proposedActions;
  };

  log.debug("Started generating image, narration and proposed actions");
  const [{ prompt: imagePrompt, imageUrl }, narration, proposedActions] =
    await Promise.all([
      generateImageUrl(),
      generateNarration(),
      generateProposedActions(),
    ]);

  log.debug("Finished generating image, narration and proposed actions");

  onInProgressUpdate?.({ type: "Finish" });

  const generationEnd = performance.now();

  log.debug(`Finished generating next scene. Statistics:
- Oracle event generation: ${oracleEventGenerationEnd - generationStart}ms
- Total: ${generationEnd - generationStart}ms`);

  return {
    event: oracleEvent,
    narration: narration,
    imageUrl,
    imageDescription: imagePrompt,
    proposedActions: proposedActions,
  };
}
