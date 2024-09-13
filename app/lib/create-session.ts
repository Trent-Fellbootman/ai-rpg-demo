"use server";

import { z } from "zod";
import { redirect } from "next/navigation";

import {
  generateChatMessage,
  generateImage,
} from "@/app/lib/services/generative-ai";
import { createNewSession, downloadImageToStorage } from "@/app/lib/data/apis";
import { getCurrentUser } from "@/app/lib/utils";
import { getScenePagePath } from "@/app/lib/utils/path";
import { logger } from "@/app/lib/logger";

const log = logger.child({ module: "generative-ai" });

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
  const authorizationStart = performance.now();

  const user = await getCurrentUser();

  // Validate form fields using zod
  const result = FormSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  const authorizationEnd = performance.now();

  const initialSceneGenerationResponse = await generateSessionData(
    result.data.name,
    result.data.back_story,
  );

  const sessionDataGenerationEnd = performance.now();

  // add image to storage
  const imagePath = await downloadImageToStorage(
    initialSceneGenerationResponse.temporaryFirstSceneImageUrl,
  );

  // insert session as well as the initial scene in one transaction
  const newSessionId = await createNewSession(
    user.userId,
    {
      sessionName: initialSceneGenerationResponse.sessionName,
      backStory: initialSceneGenerationResponse.sessionBackStory,
      sessionId: "",
    },
    {
      text: initialSceneGenerationResponse.firstSceneText,
      imageStoragePath: imagePath,
      imageDescription:
        initialSceneGenerationResponse.firstSceneImageDescription,
      action: "",
    },
  );

  const databaseUpdateEnd = performance.now();

  log.debug(`Finished creating new session. Statistics:
- Authorization: ${authorizationEnd - authorizationStart}ms
- Session data generation: ${sessionDataGenerationEnd - authorizationEnd}ms
- Database update: ${databaseUpdateEnd - sessionDataGenerationEnd}ms
- Total: ${databaseUpdateEnd - authorizationStart}ms`);

  // redirect to new session
  redirect(getScenePagePath(newSessionId, null));
}

export type SessionDataGenerationResponse = {
  sessionName: string;
  sessionBackStory: string;
  temporaryFirstSceneImageUrl: string;
  firstSceneImageDescription: string;
  firstSceneText: string;
};

async function generateSessionData(
  sessionName: string,
  sessionBackStory: string,
): Promise<SessionDataGenerationResponse> {
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
        content: `I want you to simulate what would happen in a game world.

Here's the backstory of the game world:

<back-story>
${sessionBackStory}
</back-story>

Now, imagine someone playing the game from a first-person perspective.

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

The \`content\` field in your output should be IN THE (NATURAL) LANGUAGE OF THE BACKSTORY.
However, regardless of the language of the user's action input,
\`image_description\` MUST ALWAYS BE IN ENGLISH, as the image generation model cannot understand other natural languages.`,
      },
    ],
    InitialSceneGenerationResponseSchema,
  );

  const initialScene = initialSceneGenerationResponse.content;

  const textContentGenerationEnd = performance.now();

  // generate image
  const imageUrl = await generateImage(initialScene.image_description);

  const imageGenerationEnd = performance.now();

  log.debug(`Finished generating data for the new session. Statistics:
- Text generation: ${textContentGenerationEnd - generationStart}ms
- Image generation: ${imageGenerationEnd - textContentGenerationEnd}ms
- Total: ${imageGenerationEnd - generationStart}ms
`);

  return {
    sessionName: sessionName,
    sessionBackStory: sessionBackStory,
    temporaryFirstSceneImageUrl: imageUrl,
    firstSceneImageDescription: initialScene.image_description,
    firstSceneText: initialScene.content,
  };
}
