import OpenAI from "openai";

// FIXME: remove the option in production builds
const openai = new OpenAI({ dangerouslyAllowBrowser: true });

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function GenerateChatMessage(
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
