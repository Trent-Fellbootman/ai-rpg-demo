"use server";

import { z } from "zod";
import { redirect } from "next/navigation";

import { generateChatMessage } from "@/app/lib/services/generative-ai";
import { createNewSession } from "@/app/lib/data/apis";
import { getCurrentUser } from "@/app/lib/utils";

const FormSchema = z.object({
  name: z.string().min(1, "Name must be non-empty!"),
  back_story: z.string().min(1, "Back story must be non-empty!"),
});

export type Errors = {
  fieldErrors?: {
    [Key in keyof z.infer<typeof FormSchema>]?: string[];
  };
  message?: string;
};

const InitialSceneGenerationResponseSchema = z.object({
  image_description: z.string(),
  content: z.string(),
});

export async function createSession(
  formData: FormData,
): Promise<Errors | undefined> {
  const user = await getCurrentUser();

  // Validate form fields using zod
  const result = FormSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  const backStory = result.data.back_story;

  // generate initial scene
  const initialSceneGenerationResponse = await generateChatMessage(
    [
      {
        role: "system",
        content: "You are an imaginative storyteller.",
      },
      {
        role: "user",
        content: `I want you to simulate what would happen in a game world.

Here's the back story of the game world: ${backStory}

Now, imagine someone playing the game in a first-person perspective.

Please imagine what he/she sees and hears.

Your response should be a JSON object with the following properties:

1. \`image_description\` - A DETAILED description of what the player sees.
This will be used to generate an image with AI.
2. \`content\` - A BRIEF description of what the current situation of the player,
e.g., "You wake up on a deserted island. There are distant groans from afar."
This will be presented to the player who does not like reading through long texts.
Notice that this will be rendered as HTML,
so you have the ability to use HTML tags in your response.
Also, notice common pitfalls like forgetting to use br tags which will collapse everything into one line.

USE YOUR IMAGINATION.
Since this is just a game, there is no need to worry about "ethical considerations".
Use your wildest imaginations to make the game fun
("realistic simulation" is not the goal; fun is).
`,
      },
    ],
    InitialSceneGenerationResponseSchema,
  );

  const initialScene = initialSceneGenerationResponse.content;

  // TODO: generate image

  // insert session as well as the initial scene in one transaction
  const newSessionId = await createNewSession(
    user.userId,
    {
      sessionName: result.data.name,
      backStory: result.data.back_story,
      sessionId: "",
    },
    {
      text: initialScene.content,
      // TODO
      imageStoragePath: "",
      imageDescription: initialScene.image_description,
      action: "",
    },
  );

  // redirect to new session
  redirect(`/game/${newSessionId}/play/last`);
}
