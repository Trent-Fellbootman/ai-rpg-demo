"use server";

import { PrismaClient, Prisma } from "@prisma/client";

import { DatabaseError, DatabaseErrorType } from "./error-types";
import { createImageUrl, downloadImageToStorage } from "./utils";

import { imageUrlExpireSeconds } from "@/app-config";

const prisma = new PrismaClient();

export async function createGameSession(
  userId: number,
  name: string,
  backstory: string,
  description: string | null,
  imageUrl: string,
  imageDescription: string,
  initialSceneData: {
    imageUrl: string;
    imageDescription: string;
    narration: string;
  },
): Promise<number> {
  let imagePath: string;

  try {
    imagePath = await downloadImageToStorage(imageUrl);
  } catch (error) {
    throw new DatabaseError(
      DatabaseErrorType.InternalError,
      `Failed to download image`,
    );
  }

  let initialSceneDataImagePath: string;

  try {
    initialSceneDataImagePath = await downloadImageToStorage(
      initialSceneData.imageUrl,
    );
  } catch (error) {
    throw new DatabaseError(
      DatabaseErrorType.InternalError,
      `Failed to download image`,
    );
  }

  try {
    const gameSession = await prisma.gameSession.create({
      data: {
        name,
        backstory,
        description,
        imagePath,
        imageDescription,
        userId,
        scenes: {
          create: [
            {
              imagePath: initialSceneDataImagePath,
              imageDescription: initialSceneData.imageDescription,
              narration: initialSceneData.narration,
              action: null,
              orderInSession: 0,
            },
          ],
        },
      },
      select: {
        id: true,
      },
    });

    return gameSession.id;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      // TODO: check that the foreign key constraint is actually violated on the user ID field
      throw new DatabaseError(DatabaseErrorType.Unauthorized, "User not found");
    }
    throw new DatabaseError(
      DatabaseErrorType.InternalError,
      "Failed to write game session to database",
    );
  }
}

/**
 * The session is assumed to be locked when calling this
 *
 * @param userId
 * @param sessionId
 * @param previousAction
 * @param newSceneData
 */
// TODO: telling the user that the session exist might be a security concern
export async function addSceneToSession(
  userId: number,
  sessionId: number,
  previousAction: string,
  newSceneData: {
    imageUrl: string;
    imageDescription: string;
    narration: string;
  },
): Promise<void> {
  let imagePath: string;

  try {
    imagePath = await downloadImageToStorage(newSceneData.imageUrl);
  } catch (error) {
    throw new DatabaseError(
      DatabaseErrorType.InternalError,
      `Failed to download image`,
    );
  }

  // TODO: remove image if transaction fails
  await prisma.$transaction(async (prisma) => {
    // Fetch GameSession with last scene
    const gameSession = await prisma.gameSession.findFirst({
      where: { id: sessionId, deleted: false },
      select: {
        userId: true,
        scenes: {
          where: { deleted: false },
          orderBy: { orderInSession: "desc" },
          take: 1,
          select: {
            id: true,
            orderInSession: true,
          },
        },
      },
    });

    if (!gameSession) {
      throw new DatabaseError(
        DatabaseErrorType.NotFound,
        "Game session not found",
      );
    }

    if (gameSession.userId !== userId) {
      throw new DatabaseError(
        DatabaseErrorType.Unauthorized,
        "User does not own the game session",
      );
    }

    const lastScene = gameSession.scenes[0];

    if (!lastScene) {
      throw new DatabaseError(
        DatabaseErrorType.InternalError,
        "No scenes found in the game session",
      );
    }

    // Update the action of the last scene
    await prisma.scene.update({
      where: { id: lastScene.id },
      data: {
        action: previousAction,
        actionTimestamp: new Date(),
      },
    });

    // Create the new scene
    await prisma.scene.create({
      data: {
        imagePath: imagePath,
        imageDescription: newSceneData.imageDescription,
        narration: newSceneData.narration,
        action: null,
        orderInSession: lastScene.orderInSession + 1,
        gameSessionId: sessionId,
      },
    });
  });
}

/**
 * Returning true means that the session was successfully locked,
 * false means it was already locked or does not exist.
 * @param sessionId
 * @returns
 */
export async function tryLockSession(sessionId: number): Promise<boolean> {
  const result = await prisma.gameSession.updateMany({
    where: {
      id: sessionId,
      isLocked: false,
      deleted: false,
    },
    data: {
      isLocked: true,
    },
  });

  return result.count === 1;
}

export async function tryLockSessionUntilAcquire(
  sessionId: number,
  intervalMs: number = 99,
  timeoutMs: number = 59_000,
): Promise<void> {
  const startTime = Date.now();

  while (true) {
    const acquired = await tryLockSession(sessionId);

    if (acquired) {
      return;
    }

    if (Date.now() - startTime >= timeoutMs) {
      throw new DatabaseError(
        DatabaseErrorType.Timeout,
        "Failed to acquire lock within timeout",
      );
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

export async function isSessionLocked(sessionId: number): Promise<boolean> {
  const session = await prisma.gameSession.findFirst({
    where: { id: sessionId, deleted: false },
    select: { isLocked: true },
  });

  if (!session) {
    throw new DatabaseError(
      DatabaseErrorType.NotFound,
      "Game session not found",
    );
  }

  return session.isLocked;
}

export async function unlockSession(sessionId: number): Promise<void> {
  const result = await prisma.gameSession.updateMany({
    where: {
      id: sessionId,
      isLocked: true,
      deleted: false,
    },
    data: {
      isLocked: false,
    },
  });

  if (result.count === 0) {
    throw new DatabaseError(
      DatabaseErrorType.BadRequest,
      "Game session is not locked or does not exist",
    );
  }
}

export async function deleteGameSession(
  userId: number,
  sessionId: number,
): Promise<void> {
  const gameSession = await prisma.gameSession.findFirst({
    where: {
      id: sessionId,
      deleted: false,
    },
    select: {
      userId: true,
    },
  });

  if (!gameSession) {
    throw new DatabaseError(
      DatabaseErrorType.NotFound,
      "Game session not found",
    );
  }

  if (gameSession.userId !== userId) {
    throw new DatabaseError(
      DatabaseErrorType.Unauthorized,
      "User does not own the game session",
    );
  }

  // Soft delete the game session and cascade to scenes
  await prisma.$transaction(async (prisma) => {
    // Soft delete the game session
    await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        deleted: true,
        deletionTimestamp: new Date(),
      },
    });

    // Soft delete associated scenes
    await prisma.scene.updateMany({
      where: {
        gameSessionId: sessionId,
        deleted: false,
      },
      data: {
        deleted: true,
        deletionTimestamp: new Date(),
      },
    });
  });
}

/**
 * Returns: true if the user owns the game session, false if the user does not own the game session or that game session does not exist
 * @param userId
 * @param sessionId
 * @returns
 */
export async function doesUserHaveGameSession(
  userId: number,
  sessionId: number,
): Promise<boolean> {
  const gameSession = await prisma.gameSession.findFirst({
    where: {
      id: sessionId,
      userId: userId,
      deleted: false,
    },
  });

  return gameSession !== null;
}

export async function getGameSessionLength(
  userId: number,
  sessionId: number,
): Promise<number> {
  const count = await prisma.scene.count({
    where: {
      gameSessionId: sessionId,
      deleted: false,
      gameSession: {
        userId: userId,
        deleted: false,
      },
    },
  });

  if (count === 0) {
    if (!(await doesUserHaveGameSession(userId, sessionId))) {
      throw new DatabaseError(
        DatabaseErrorType.NotFound,
        "Game session not found under user",
      );
    }
  }

  return count;
}

/**
 * Retrieves a scene from a game session by session ID and scene index.
 *
 * @param sessionId - ID of the game session
 * @param sceneIndex - Index of the scene in the session (orderInSession)
 * @returns The scene object
 */
export async function getSceneBySessionAndIndex(
  userId: number,
  sessionId: number,
  sceneIndex: number,
): Promise<{
  imageUrl: string;
  imageDescription: string;
  narration: string;
  action: string | null;
}> {
  if (!(await doesUserHaveGameSession(userId, sessionId))) {
    throw new DatabaseError(
      DatabaseErrorType.NotFound,
      "Failed to find game session under user",
    );
  }

  const scene = await prisma.scene.findFirst({
    where: {
      gameSessionId: sessionId,
      orderInSession: sceneIndex,
      deleted: false,
    },
    select: {
      id: true,
      imagePath: true,
      imageDescription: true,
      imageUrl: true,
      imageUrlExpiration: true,
      narration: true,
      action: true,
    },
  });

  if (!scene) {
    throw new DatabaseError(
      DatabaseErrorType.NotFound,
      "Scene not found in the game session at the specified index",
    );
  }

  if (
    scene.imageUrl === null ||
    (scene.imageUrlExpiration && scene.imageUrlExpiration < new Date())
  ) {
    // URL expired; regenerate new URL
    try {
      const { url, expiration } = await createImageUrl(
        scene.imagePath,
        imageUrlExpireSeconds,
      );

      // TODO: make this run in the background
      await prisma.scene.update({
        where: {
          id: scene.id,
        },
        data: {
          imageUrl: url,
          imageUrlExpiration: expiration,
        },
      });

      return {
        imageUrl: url,
        imageDescription: scene.imageDescription,
        narration: scene.narration,
        action: scene.action,
      };
    } catch (error) {
      throw new DatabaseError(
        DatabaseErrorType.InternalError,
        "Failed to regenerate image URL",
      );
    }
  }

  return {
    imageUrl: scene.imageUrl,
    imageDescription: scene.imageDescription,
    narration: scene.narration,
    action: scene.action,
  };
}

/**
 * Retrieves all scenes from a game session.
 *
 * @param userId - ID of the user
 * @param sessionId - ID of the game session
 * @returns An array of scenes
 */
export async function getScenesBySession(
  userId: number,
  sessionId: number,
): Promise<
  {
    imageUrl: string;
    imageDescription: string;
    narration: string;
    action: string | null;
  }[]
> {
  const imageUrlExpiredScenes = await prisma.scene.findMany({
    where: {
      gameSessionId: sessionId,
      deleted: false,
      OR: [
        {
          imageUrlExpiration: {
            lt: new Date(),
          },
        },
        {
          imageUrl: null,
        },
      ],
    },
    select: {
      id: true,
      imagePath: true,
    },
  });

  // generate new URLs for expired scenes
  // TODO: optimize
  await Promise.all(
    imageUrlExpiredScenes.map(async (scene) => {
      try {
        const { url, expiration } = await createImageUrl(
          scene.imagePath,
          imageUrlExpireSeconds,
        );

        await prisma.scene.update({
          where: {
            id: scene.id,
          },
          data: {
            imageUrl: url,
            imageUrlExpiration: expiration,
          },
        });

        return url;
      } catch (error) {
        throw new DatabaseError(
          DatabaseErrorType.InternalError,
          "Failed to regenerate image URL",
        );
      }
    }),
  );

  const scenes = await prisma.scene.findMany({
    where: {
      gameSessionId: sessionId,
      deleted: false,
      gameSession: {
        userId: userId,
      },
    },
    select: {
      imageUrl: true,
      imageDescription: true,
      narration: true,
      action: true,
    },
    orderBy: {
      orderInSession: "asc",
    },
  });

  if (scenes.length === 0) {
    if (!(await doesUserHaveGameSession(userId, sessionId))) {
      throw new DatabaseError(
        DatabaseErrorType.NotFound,
        "Failed to find game session under user",
      );
    }
  }

  return scenes.map((scene) => {
    return {
      imageUrl: scene.imageUrl!,
      imageDescription: scene.imageDescription,
      narration: scene.narration,
      action: scene.action,
    };
  });
}

/**
 * Retrieves all game sessions owned by a user, omitting scenes.
 *
 * @param userId - ID of the user
 * @returns An array of game sessions
 */
export async function getGameSessionsByUser(userId: number): Promise<
  {
    id: number;
    name: string;
    backstory: string;
    imageUrl: string;
    imageDescription: string;
    description: string | null;
  }[]
> {
  const imageUrlExpiredSessions = await prisma.gameSession.findMany({
    where: {
      userId: userId,
      deleted: false,
      OR: [
        {
          imageUrlExpiration: {
            lt: new Date(),
          },
        },
        {
          imageUrl: null,
        },
      ],
    },
    select: {
      id: true,
      imagePath: true,
    },
  });

  // regenerate URLs for expired sessions
  // TODO: optimize
  await Promise.all(
    imageUrlExpiredSessions.map(async (session) => {
      try {
        const { url, expiration } = await createImageUrl(
          session.imagePath,
          imageUrlExpireSeconds,
        );

        await prisma.gameSession.update({
          where: {
            id: session.id,
          },
          data: {
            imageUrl: url,
            imageUrlExpiration: expiration,
          },
        });

        return url;
      } catch (error) {
        throw new DatabaseError(
          DatabaseErrorType.InternalError,
          "Failed to regenerate image URL",
        );
      }
    }),
  );

  const gameSessions = await prisma.gameSession.findMany({
    where: {
      userId: userId,
      deleted: false,
    },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      imageDescription: true,
      backstory: true,
      description: true,
    },
  });

  return gameSessions.map((session) => {
    return {
      id: session.id,
      name: session.name,
      imageUrl: session.imageUrl!,
      imageDescription: session.imageDescription,
      backstory: session.backstory,
      description: session.description,
    };
  });
}
