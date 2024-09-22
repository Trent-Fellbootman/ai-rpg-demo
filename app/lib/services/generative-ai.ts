import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { ZodObject, infer as ZodInfer } from "zod";
import dotenv from "dotenv";

dotenv.config();

import { performance } from "next/dist/compiled/@edge-runtime/primitives";

import { logger } from "@/app/lib/logger";

import * as process from "node:process";

const log = logger.child({ module: "generative-ai" });

const openai = new OpenAI();

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
    model: "gpt-4o-mini",
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

  const response = await fetch("https://api.aimlapi.com/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.AIMLAPI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "flux/schnell",
      prompt: description,
      image_size: "landscape_4_3",
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      safety_tolerance: "2",
    }),
  });

  const data = await response.json();

  const end = performance.now();

  const imageUrl = data.images[0].url;

  log.debug(`Received image from AIML API; it took ${end - start}ms`);

  return imageUrl;
}
