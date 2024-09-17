import { vi } from "vitest";
import { fakeDataRootPath } from "../constants";

export function getFakeImageUrl(imageIndex: number): string {
  return `http://localhost:8080${fakeDataRootPath}/${imageIndex}.png`;
}

export function mockCookies() {
  vi.mock("next/headers", () => ({
    cookies: () => ({
      getAll: async () => null,
      setAll: async (
        cookies: { name: string; value: string; options: any }[],
      ) => { },
    }),
  }));
}