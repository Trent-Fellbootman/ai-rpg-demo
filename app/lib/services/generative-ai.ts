import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { ZodObject, infer as ZodInfer } from "zod";

import { logger } from "@/app/lib/logger";

const log = logger.child({ module: "generative-ai" });

const openai = new OpenAI();

export interface ChatMessage<ContentType> {
  role: "user" | "assistant" | "system";
  content: ContentType;
}

export async function generateChatMessage<T extends ZodObject<any> | undefined>(
  messages: ChatMessage<string>[],
  responseFormat: T = undefined as T,
): Promise<
  ChatMessage<T extends ZodObject<any> ? ZodInfer<T> : string | null>
> {
  log.debug(messages, "Calling OpenAI API to generate chat message");

  const response = await openai.beta.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: messages,
    response_format:
      responseFormat === undefined
        ? undefined
        : zodResponseFormat(responseFormat, "structured-output"),
  });

  const message = response.choices[0].message;

  log.debug(message, "Received chat message response from OpenAI API");

  if (message.content === null) {
    throw new Error("Generated message content was null");
  } else {
    return {
      role: message.role,
      content: responseFormat === undefined ? message.content : message.parsed,
    } as ChatMessage<T extends ZodObject<any> ? ZodInfer<T> : string | null>;
  }
}

/**
 * Generates an image, returning a temporary URL.
 *
 * @param description the description of the image
 */
export async function generateImage(description: string): Promise<string> {
  log.debug(
    { description: description },
    "Calling OpenAI API to generate image",
  );

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
