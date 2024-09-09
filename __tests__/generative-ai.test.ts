import { expect, test } from "vitest";

import { GenerateChatMessage } from "../app/lib/services/generative-ai";

test("chat completion is able to do basic math correctly", async () => {
  const message = await GenerateChatMessage([
    {
      role: "user",
      content:
        "What is the sum of 3 and 5? Output a number ONLY and NOTHING ELSE."
    },
  ]);

  expect(message.content).toBe("8");
});
