import OpenAI from "openai";

// FIXME: remove the option in production builds
const openai = new OpenAI();

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function generateChatMessage(
  messages: ChatMessage[],
): Promise<ChatMessage> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: messages,
  });

  const message = response.choices[0].message;

  if (message.content === null) {
    throw new Error("Generated message content was null");
  } else {
    return {
      role: message.role,
      content: message.content,
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
