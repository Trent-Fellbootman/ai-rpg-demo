import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { ZodObject, infer as ZodInfer } from "zod";
import dotenv from "dotenv";
import { performance } from "next/dist/compiled/@edge-runtime/primitives";
import { Together } from "together-ai";

dotenv.config();

import { logger } from "@/app/lib/logger";
import { ImageDataURL } from "together-ai/resources/images";

const log = logger.child({ module: "generative-ai" });

const defaultModelName = process.env.LLM_MODEL_NAME || "gpt-4o-mini";

const openai = new OpenAI({
  baseURL: process.env.OPENAI_API_BASE_URL,
});
const together = new Together();

export interface ChatMessage<ContentType> {
  role: "user" | "assistant" | "system";
  content: ContentType;
}

export async function generateChatMessage<T extends ZodObject<any> | undefined>(
  messages: ChatMessage<string>[],
  responseFormat: T = undefined as T,
): Promise<ChatMessage<T extends ZodObject<any> ? ZodInfer<T> : string>> {
  log.debug(messages, "Calling OpenAI API to generate chat message");

  const start = performance.now();

  const response = await openai.beta.chat.completions.parse({
    model: defaultModelName,
    messages: messages,
    response_format:
      responseFormat === undefined
        ? undefined
        : zodResponseFormat(responseFormat, "structured-output"),
  });

  const message = response.choices[0].message;

  const end = performance.now();

  log.debug(
    message,
    `Received chat message response from OpenAI API; it took ${end - start}ms`,
  );

  if (message.content === null) {
    throw new Error("Generated message content was null");
  } else {
    return {
      role: message.role,
      content: responseFormat === undefined ? message.content : message.parsed,
    } as ChatMessage<T extends ZodObject<any> ? ZodInfer<T> : string>;
  }
}

export async function* generateChatMessageStream(
  messages: ChatMessage<string>[],
): AsyncGenerator<string> {
  const stream = await openai.chat.completions.create({
    model: defaultModelName,
    messages,
    stream: true,
  });

  for await (const chunk of stream) {
    const message = chunk.choices[0].delta.content || "";

    yield message;
  }
}

/**
 * Generates an image, returning a temporary URL.
 *
 * @param description the description of the image
 */
// export async function generateImage(description: string): Promise<string> {
//   log.debug(
//     { description: description },
//     "Calling OpenAI API to generate image",
//   );
//
//   const response = await openai.images.generate({
//     model: "dall-e-3",
//     prompt: description,
//     n: 1,
//     quality: "hd",
//     size: "1024x1024",
//   });
//
//   const imageUrl = response.data[0].url;
//
//   if (imageUrl === undefined) {
//     throw new Error("Generated image url was undefined");
//   } else {
//     return imageUrl;
//   }
// }
export async function generateImage(description: string): Promise<string> {
  log.debug(description, "Calling AIML API to generate image");

  const start = performance.now();

  const response = await together.images.create({
    model: "black-forest-labs/FLUX.1-schnell-Free",
    prompt: description,
    steps: 4,
    n: 4,
  });

  const end = performance.now();

  const imageUrl = (response.data[0] as ImageDataURL).url;

  log.debug(`Received image from AIML API; it took ${end - start}ms`);

  return imageUrl;
}
