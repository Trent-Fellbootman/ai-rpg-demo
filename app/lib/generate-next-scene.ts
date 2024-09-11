"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  addGeneratedSceneToSession,
  doesUserOwnSession,
  getScenes,
  getSessionMetadata,
} from "@/app/lib/data/apis";
import { generateChatMessage } from "@/app/lib/services/generative-ai";

type FieldErrors = {
  action?: string[];
};

export type Errors = {
  message?: string;
  fieldErrors?: FieldErrors;
};

const FormSchema = z.object({
  action: z.string().min(1, "Action must be non-empty!"),
});

export async function generateNextScene(
  userId: string,
  sessionId: string,
  formData: FormData,
): Promise<Errors | undefined> {
  // Validate form fields using zod
  const result = FormSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  // check that the user owns the session
  if (!(await doesUserOwnSession(userId, sessionId))) {
    throw new Error("User does not own session.");
  }

  // retrieve all the scenes in the session
  const [sessionMetadata, scenes] = await Promise.all([
    getSessionMetadata(sessionId),
    getScenes(sessionId),
  ]);

  // combine the scenes into a string
  const scenesText = scenes
    .map(
      ({ text }, i) => `
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

Here's the backstory of the game world: ${sessionMetadata.backStory}

Here are what happened so far:

<scenes>
${scenesText}
</scenes>

Now, here's the action that the player wants to take:

<action>
${result.data.action}
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

USE YOUR IMAGINATION.
Since this is just a game, there is no need to worry about "ethical considerations".
Use your wildest imaginations to make the game fun
("realistic simulation" is not the goal; fun is).`,
      },
    ],
    z.object({
      content: z.string(),
      image_description: z.string(),
    }),
  );

  // update action in the current last scene and add a new scene with empty action in an atomic manner
  await addGeneratedSceneToSession(sessionId, result.data.action, {
    text: response.content.content,
    // TODO
    imageStoragePath: "",
    imageDescription: response.content.image_description,
    action: "",
  });

  revalidatePath(`/game/${sessionId}/play/last`);
  redirect(`/game/${sessionId}/play/last`);
}
