import { vi, describe, test, expect } from "vitest";

vi.mock("next/headers", () => ({
  cookies: () => ({
    getAll: async () => null,
    setAll: async (
      cookies: { name: string; value: string; options: any }[],
    ) => {},
  }),
}));

import { v4 as uuidv4 } from "uuid";

import { getFakeImageUrl } from "./utils";

import { createUser } from "@/app/lib/database-actions/user-actions";
import {
  createGameSession,
  addSceneToSession,
  getScenesBySession,
  getGameSessionsByUser,
  doesUserHaveGameSession,
  getGameSessionLength,
  getSceneBySessionAndIndex,
  tryLockSession,
  unlockSession,
  deleteGameSession,
  isSessionLocked,
  tryLockSessionUntilAcquire,
  getGameSessionMetadata,
} from "@/app/lib/database-actions/game-session-actions";
import {
  DatabaseError,
  DatabaseErrorType,
} from "@/app/lib/database-actions/error-types";
import { createGameTemplate } from "@/app/lib/database-actions/game-template-actions";

describe("Game Session Actions", () => {
  const sampleInitialSceneData = {
    imageUrl: getFakeImageUrl(2),
    imageDescription: "Initial scene image",
    event: "Initial scene event",
    narration: "You are in a dark forest.",
    proposedActions: [
      "Action 1",
      "Action 2",
      "Action 3",
      "Action 4",
      "Action 5",
    ],
  };

  const sampleNewSceneData = {
    imageUrl: getFakeImageUrl(3),
    imageDescription: "New scene image",
    event: "New scene event",
    narration: "New narration.",
    proposedActions: [
      "New action 1",
      "New action 2",
      "New action 3",
      "New action 4",
      "New action 5",
    ],
  };

  test.concurrent("should create a game session with valid data", async () => {
    const email = `testuser-${uuidv4()}@example.com`;
    const hashedPassword = "hashedpassword";
    const name = "Test User";
    const userId = await createUser(email, hashedPassword, name);

    const gameSessionName = "Test Game Session";
    const backstory = "Once upon a time...";
    const description = "A test game session";
    const imageUrl = getFakeImageUrl(1);
    const imageDescription = "Test image";

    const sessionId = await createGameSession(
      userId,
      gameSessionName,
      backstory,
      description,
      imageUrl,
      imageDescription,
      null,
      sampleInitialSceneData,
    );

    expect(sessionId).toBeGreaterThan(0);

    // Check that the session exists and retrieve it
    const sessions = await getGameSessionsByUser(userId);

    expect(sessions.length).toBe(1);
    const session = sessions[0];

    expect(session).toEqual({
      id: sessionId,
      name: gameSessionName,
      imageUrl: expect.any(String),
      imageDescription,
      backstory,
      description,
    });

    // Get the scenes
    const scenes = await getScenesBySession(userId, sessionId);

    expect(scenes.length).toBe(1);
    const scene = scenes[0];

    expect(scene).toEqual({
      ...sampleInitialSceneData,
      imageUrl: expect.any(String),
      proposedActions: expect.any(Array),
      action: null,
    });
  });

  test.concurrent(
    "should throw Unauthorized error when creating a game session with invalid userId",
    async () => {
      const invalidUserId = 999999; // Assuming this userId does not exist

      const gameSessionName = "Test Game Session";
      const backstory = "Once upon a time...";
      const description = "A test game session";
      const imageUrl = getFakeImageUrl(1);
      const imageDescription = "Test image";

      await expect(
        createGameSession(
          invalidUserId,
          gameSessionName,
          backstory,
          description,
          imageUrl,
          imageDescription,
          null,
          sampleInitialSceneData,
        ),
      ).rejects.toThrowError(DatabaseError);

      try {
        await createGameSession(
          invalidUserId,
          gameSessionName,
          backstory,
          description,
          imageUrl,
          imageDescription,
          null,
          sampleInitialSceneData,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        const dbError = error as DatabaseError;

        expect(dbError.type).toBe(DatabaseErrorType.Unauthorized);
        expect(dbError.message).toBe("User not found");
      }
    },
  );

  test.concurrent(
    "should add a scene to a session that the user owns",
    async () => {
      const email = `testuser-${uuidv4()}@example.com`;
      const userId = await createUser(email, "hashedpassword", "Test User");

      const sessionId = await createGameSession(
        userId,
        "Test Game Session",
        "Once upon a time...",
        "A test game session",
        getFakeImageUrl(1),
        "Test image",
        null,
        sampleInitialSceneData,
      );

      const previousAction = "Go north";

      await addSceneToSession(
        userId,
        sessionId,
        previousAction,
        sampleNewSceneData,
      );

      // Get the scenes and check
      const scenes = await getScenesBySession(userId, sessionId);

      expect(scenes.length).toBe(2);

      expect(scenes[0]).toEqual({
        ...sampleInitialSceneData,
        action: previousAction,
        imageUrl: expect.any(String),
      });

      expect(scenes[1]).toEqual({
        ...sampleNewSceneData,
        imageUrl: expect.any(String),
        action: null,
      });
    },
  );

  test.concurrent(
    "should throw Unauthorized error when adding a scene to a session that the user does not own",
    async () => {
      // Create first user and session
      const userId1 = await createUser(
        `testuser-${uuidv4()}@example.com`,
        "hashedpassword",
        "Test User 1",
      );

      const sessionId = await createGameSession(
        userId1,
        "Test Game Session",
        "Once upon a time...",
        "A test game session",
        getFakeImageUrl(1),
        "Test image",
        null,
        sampleInitialSceneData,
      );

      // Create second user
      const userId2 = await createUser(
        `testuser${Date.now() + 1}@example.com`,
        "hashedpassword",
        "Test User 2",
      );

      const previousAction = "Go north";

      await expect(
        addSceneToSession(userId2, sessionId, previousAction, sampleNewSceneData),
      ).rejects.toThrowError(DatabaseError);

      try {
        await addSceneToSession(
          userId2,
          sessionId,
          previousAction,
          sampleNewSceneData,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        const dbError = error as DatabaseError;

        expect(dbError.type).toBe(DatabaseErrorType.Unauthorized);
        expect(dbError.message).toBe("User does not own the game session");
      }
    },
  );

  test.concurrent("should lock and unlock a session", async () => {
    const userId = await createUser(
      `testuser-${uuidv4()}@example.com`,
      "hashedpassword",
      "Test User",
    );

    const sessionId = await createGameSession(
      userId,
      "Test Game Session",
      "Once upon a time...",
      "A test game session",
      getFakeImageUrl(1),
      "Test image",
      null,
      sampleInitialSceneData,
    );

    expect(await isSessionLocked(sessionId)).toBe(false);

    const locked = await tryLockSession(sessionId);

    expect(locked).toBe(true);
    expect(await isSessionLocked(sessionId)).toBe(true);

    const lockedAgain = await tryLockSession(sessionId);

    expect(lockedAgain).toBe(false);
    expect(await isSessionLocked(sessionId)).toBe(true);

    await unlockSession(sessionId);
    expect(await isSessionLocked(sessionId)).toBe(false);

    const lockedAfterUnlock = await tryLockSession(sessionId);

    expect(lockedAfterUnlock).toBe(true);
    expect(await isSessionLocked(sessionId)).toBe(true);
  });

  test.concurrent("should repeat try locking until success", async () => {
    const userId = await createUser(
      `testuser-${uuidv4()}@example.com`,
      "hashedpassword",
      "Test User",
    );

    const sessionId = await createGameSession(
      userId,
      "Test Game Session",
      "Once upon a time...",
      "A test game session",
      getFakeImageUrl(1),
      "Test image",
      null,
      sampleInitialSceneData,
    );

    expect(await isSessionLocked(sessionId)).toBe(false);
    expect(await tryLockSession(sessionId)).toBe(true);

    let acquired = false;

    await Promise.all([
      (async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        expect(acquired).toBe(false);
        await unlockSession(sessionId);
      })(),
      (async () => {
        await tryLockSessionUntilAcquire(sessionId, 100, 1_000);
        acquired = true;
      })(),
    ]);

    expect(acquired).toBe(true);
  });

  test.concurrent(
    "should delete a game session that the user owns",
    async () => {
      const userId = await createUser(
        `testuser-${uuidv4()}@example.com`,
        "hashedpassword",
        "Test User",
      );

      expect((await getGameSessionsByUser(userId)).length).toBe(0);

      const sessionId = await createGameSession(
        userId,
        "Test Game Session",
        "Once upon a time...",
        "A test game session",
        getFakeImageUrl(1),
        "Test image",
        null,
        sampleInitialSceneData,
      );

      expect((await getGameSessionsByUser(userId)).length).toBe(1);

      await deleteGameSession(userId, sessionId);

      expect((await getGameSessionsByUser(userId)).length).toBe(0);
    },
  );

  test.concurrent(
    "should throw NotFound error when getting length of non-existent session",
    async () => {
      const userId = await createUser(
        `testuser-${uuidv4()}@example.com`,
        "hashedpassword",
        "Test User",
      );
      const sessionId = 999999; // Assuming this session ID doesn't exist

      await expect(
        getGameSessionLength(userId, sessionId),
      ).rejects.toThrowError(DatabaseError);

      try {
        await getGameSessionLength(userId, sessionId);
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        const dbError = error as DatabaseError;

        expect(dbError.type).toBe(DatabaseErrorType.NotFound);
        expect(dbError.message).toBe("Game session not found under user");
      }
    },
  );

  test.concurrent("should get a scene by session and index", async () => {
    const userId = await createUser(
      `testuser-${uuidv4()}@example.com`,
      "hashedpassword",
      "Test User",
    );

    const sessionId = await createGameSession(
      userId,
      "Test Game Session",
      "Once upon a time...",
      "A test game session",
      getFakeImageUrl(1),
      "Test image",
      null,
      sampleInitialSceneData,
    );

    const scene = await getSceneBySessionAndIndex(userId, sessionId, 0);

    expect(scene).toEqual({
      ...sampleInitialSceneData,
      imageUrl: expect.any(String),
      action: null,
    });
  });

  test.concurrent(
    "should throw NotFound error when getting a scene with invalid index",
    async () => {
      const userId = await createUser(
        `testuser-${uuidv4()}@example.com`,
        "hashedpassword",
        "Test User",
      );

      const sessionId = await createGameSession(
        userId,
        "Test Game Session",
        "Once upon a time...",
        "A test game session",
        getFakeImageUrl(1),
        "Test image",
        null,
        sampleInitialSceneData,
      );

      await expect(
        getSceneBySessionAndIndex(userId, sessionId, 1),
      ).rejects.toThrowError(DatabaseError);

      try {
        await getSceneBySessionAndIndex(userId, sessionId, 1);
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        const dbError = error as DatabaseError;

        expect(dbError.type).toBe(DatabaseErrorType.NotFound);
        expect(dbError.message).toBe(
          "Scene not found in the game session at the specified index",
        );
      }
    },
  );

  test.concurrent(
    "Users should only own the sessions that they own",
    async () => {
      const userId = await createUser(
        `testuser-${uuidv4()}@example.com`,
        "hashedpassword",
        "Test User",
      );
      const otherUserId = await createUser(
        `testuser-${uuidv4()}@example.com`,
        "hashedpassword",
        "Test User",
      );

      const sessionId = await createGameSession(
        userId,
        "Test Game Session",
        "Once upon a time...",
        "A test game session",
        getFakeImageUrl(1),
        "Test image",
        null,
        sampleInitialSceneData,
      );

      expect(await doesUserHaveGameSession(userId, sessionId)).toBe(true);
      expect(await doesUserHaveGameSession(otherUserId, sessionId)).toBe(false);
    },
  );

  test.concurrent(
    "should retrieve the correct metadata of the sessions belong to a user",
    async () => {
      const userId = await createUser(
        `testuser-${uuidv4()}@example.com`,
        "hashedpassword",
        "Test User",
      );

      const sessionId = await createGameSession(
        userId,
        "Test Game Session",
        "Once upon a time...",
        "A test game session",
        getFakeImageUrl(1),
        "Test image",
        null,
        sampleInitialSceneData,
      );

      expect(await getGameSessionsByUser(userId)).toEqual([
        {
          id: sessionId,
          name: "Test Game Session",
          backstory: "Once upon a time...",
          description: "A test game session",
          imageUrl: expect.any(String),
          imageDescription: "Test image",
        },
      ]);
    },
  );

  test.concurrent(
    "user should be able to get the metadata of their own sessions only",
    async () => {
      const userId = await createUser(
        `testuser-${uuidv4()}@example.com`,
        "hashedpassword",
        "Test User",
      );

      const otherUserId = await createUser(
        `testuser-${uuidv4()}@example.com`,
        "hashedpassword",
        "Test User",
      );

      const sessionId = await createGameSession(
        userId,
        "Test Game Session",
        "Once upon a time...",
        "A test game session",
        getFakeImageUrl(1),
        "Test image",
        null,
        sampleInitialSceneData,
      );

      expect(await getGameSessionMetadata(userId, sessionId)).toEqual({
        name: "Test Game Session",
        backstory: "Once upon a time...",
        description: "A test game session",
        imageUrl: expect.any(String),
        imageDescription: "Test image",
        parentTemplateId: null,
      });

      await expect(
        getGameSessionMetadata(otherUserId, sessionId),
      ).rejects.toThrow(DatabaseError);
      try {
        await getGameSessionMetadata(otherUserId, sessionId);
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        const dbError = error as DatabaseError;

        expect(dbError.type).toBe(DatabaseErrorType.NotFound);
        expect(dbError.message).toBe(
          "Game session not found under user or does not exist",
        );
      }
    },
  );

  test.concurrent(
    "user cannot get the metadata of a deleted session",
    async () => {
      const userId = await createUser(
        `testuser-${uuidv4()}@example.com`,
        "hashedpassword",
        "Test User",
      );

      const sessionId = await createGameSession(
        userId,
        "Test Game Session",
        "Once upon a time...",
        "A test game session",
        getFakeImageUrl(1),
        "Test image",
        null,
        sampleInitialSceneData,
      );

      await deleteGameSession(userId, sessionId);

      await expect(getGameSessionMetadata(userId, sessionId)).rejects.toThrow(
        DatabaseError,
      );
      try {
        await getGameSessionMetadata(userId, sessionId);
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        const dbError = error as DatabaseError;

        expect(dbError.type).toBe(DatabaseErrorType.NotFound);
        expect(dbError.message).toBe(
          "Game session not found under user or does not exist",
        );
      }
    },
  );

  test.concurrent(
    "create game session should set template ID field correctly",
    async () => {
      const userId = await createUser(
        `testuser-${uuidv4()}@example.com`,
        "hashedpassword",
        "Test User",
      );

      const templateId = await createGameTemplate(userId, {
        name: "Test Template",
        imageUrl: getFakeImageUrl(1),
        imageDescription: "Template image",
        backStory: "This is a test backstory.",
        description: "A test template",
        isPublic: true,
      });

      const sessionId = await createGameSession(
        userId,
        "Test Game Session",
        "Once upon a time...",
        "A test game session",
        getFakeImageUrl(1),
        "Test image",
        templateId,
        sampleInitialSceneData,
      );

      expect(
        (await getGameSessionMetadata(userId, sessionId)).parentTemplateId,
      ).toBe(templateId);
    },
  );
});
