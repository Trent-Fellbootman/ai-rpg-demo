// @vitest-environment node
import fetch from "node-fetch";
import sharp from "sharp";
import { expect, test } from "vitest";

import {
  generateChatMessage,
  generateImage
} from "../app/lib/services/generative-ai";

test("chat completion is able to do basic math correctly", async () => {
  const message = await generateChatMessage([
    {
      role: "user",
      content:
        "What is the sum of 3 and 5? Output a number ONLY and NOTHING ELSE."
    }
  ]);

  expect(message.content).toBe("8");
});

test("image generation is able to generate an image", async () => {
  const imageUrl = await generateImage("A cute cat sitting on a couch");

  const { width, height } = await downloadImageAndCheckWidthHeight(imageUrl);

  expect(width).toBeGreaterThan(0);
  expect(height).toBeGreaterThan(0);
}, 30000);

async function downloadImageAndCheckWidthHeight(imageUrl: string) {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }

  const buffer = await response.buffer();
  const image = sharp(buffer);

  const metadata = await image.metadata();
  const { width, height } = metadata;

  return { width, height };
}
