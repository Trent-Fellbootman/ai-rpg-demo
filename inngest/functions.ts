import { z } from "zod";

import { inngest } from "./client";

import { logger } from "@/app/lib/logger";
import {
  addSceneToSession,
  isSessionLocked,
  unlockSession,
} from "@/app/lib/database-actions/game-session-actions";

const log = logger.child({ module: "inngest-functions" });

const AddGeneratedSceneInputsSchema = z.object({
  userId: z.number(),
  sessionId: z.number(),
  previousAction: z.string(),
  nextScene: z.object({
    event: z.string(),
    imageUrl: z.string(),
    imageDescription: z.string(),
    narration: z.string(),
    proposedActions: z.array(z.string()),
  }),
});

export const addGeneratedSceneAndUnlockDatabaseActionEventName =
  "database/write-generated-scene-and-unlock-session";

export const writeGeneratedSceneAndUnlockDatabaseAction =
  inngest.createFunction(
    { id: "write-generated-scene-and-unlock-session" },
    { event: addGeneratedSceneAndUnlockDatabaseActionEventName },
    // TODO: error handling
    async ({ event, step }) => {
      log.debug(
        "Started operation for writing generated scene and unlocking session",
      );

      const result = AddGeneratedSceneInputsSchema.safeParse(event.data);

      if (result.error) {
        log.error(result.error, `Failed to parse input data`);

        throw result.error;
      }

      const data = result.data;

      log.debug("converted input data");

      const sessionLocked = await isSessionLocked(data.sessionId);

      if (!sessionLocked) {
        throw new Error("Expected session to be locked, but it is not!");
      }

      log.debug("Checked that session is currently locked");

      // update database
      await addSceneToSession(
        data.userId,
        data.sessionId,
        data.previousAction,
        data.nextScene,
      );

      log.debug("Wrote generated scene to database and storage");

      // unlock session
      await unlockSession(data.sessionId);

      log.debug("Unlocked session; operation complete");

      return {
        event,
        body: "Successfully wrote generated scene and unlocked session",
      };
    },
  );
