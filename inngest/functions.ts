import { inngest } from "./client";

import { updateSceneDatabase } from "@/app/lib/generate-next-scene";
import { isSessionLocked, unlockSession } from "@/app/lib/data/apis";
import { logger } from "@/app/lib/logger";

const log = logger.child({ module: "inngest-functions" });

export type AddGeneratedSceneInputs = {
  sessionId: string;
  previousAction: string;
  nextScene: {
    imageUrl: string;
    imageDescription: string;
    text: string;
  };
};

export const addGeneratedSceneAndUnlockDatabaseActionEventName =
  "database/write-generated-scene-and-unlock-session";

export const helloWorld = inngest.createFunction(
  { id: "write-generated-scene-and-unlock-session" },
  { event: addGeneratedSceneAndUnlockDatabaseActionEventName },
  // TODO: error handling
  async ({ event, step }) => {
    log.debug(
      "Started operation for writing generated scene and unlocking session",
    );

    await step.sleep("wait-a-moment", "1s");

    // TODO: validate input type
    const data = event.data as AddGeneratedSceneInputs;

    const sessionLocked = await isSessionLocked(data.sessionId);

    if (!sessionLocked) {
      throw new Error("Expected session to be locked, but it is not!");
    }

    log.debug("Checked that session is currently locked");

    // update database
    await updateSceneDatabase(
      data.sessionId,
      data.previousAction,
      data.nextScene,
    );

    log.debug("Wrote generated scene to database");

    // unlock session
    await unlockSession(data.sessionId);

    log.debug("Unlocked session; operation complete");

    return {
      event,
      body: "Successfully wrote generated scene and unlocked session",
    };
  },
);
