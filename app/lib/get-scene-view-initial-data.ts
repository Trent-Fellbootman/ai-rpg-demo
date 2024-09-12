"use server";

import { getCurrentUser } from "@/app/lib/utils";
import {
  createTemporaryUrl,
  getSessionLength,
  retrieveScene,
} from "@/app/lib/data/apis";

export async function getSceneViewInitialData(
  sessionId: string,
  sceneIndex: string,
) {
  const user = (await getCurrentUser())!;

  const sessionLength = await getSessionLength(sessionId);

  const parsedIndex =
    sceneIndex === "last" ? sessionLength - 1 : parseInt(sceneIndex);

  const [scene] = await Promise.all([
    retrieveScene(user.userId, sessionId, parsedIndex),
  ]);

  return {
    userId: user.userId,
    text: scene.text,
    imageUrl: await createTemporaryUrl(scene.imageStoragePath),
    action: scene.action,
    currentSceneIndex: parsedIndex,
    currentSessionLength: sessionLength,
  };
}
