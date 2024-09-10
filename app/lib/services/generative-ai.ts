import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { ZodObject } from "zod";

// FIXME: remove the option in production builds
const openai = new OpenAI();

export interface ChatMessage<ContentType> {
  role: "user" | "assistant" | "system";
  content: ContentType;
}

export async function generateChatMessage(
  messages: ChatMessage<string>[],
  responseFormat: ZodObject<any> | undefined = undefined,
): Promise<ChatMessage<string | { [p: string]: any } | null>> {
  const response = await openai.beta.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: messages,
    response_format:
      responseFormat === undefined
        ? undefined
        : zodResponseFormat(responseFormat, "structured-output"),
  });

  const message = response.choices[0].message;

  if (message.content === null) {
    throw new Error("Generated message content was null");
  } else {
    return {
      role: message.role,
      content: responseFormat === undefined ? message.content : message.parsed,
    };
  }
}

/**
 * Generates an image, returning a temporary URL.
 *
 * @param description the description of the image
 */
export async function generateImage(description: string): Promise<string> {
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: description,
    n: 1,
    quality: "hd",
    size: "1024x1024",
  });

  const imageUrl = response.data[0].url;

  if (imageUrl === undefined) {
    throw new Error("Generated image url was undefined");
  } else {
    return imageUrl;
  }
}
