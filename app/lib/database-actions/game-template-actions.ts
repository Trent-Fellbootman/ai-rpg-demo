"use server";

import { Prisma, PrismaClient } from "@prisma/client";

import { DatabaseError, DatabaseErrorType } from "./error-types";
import { createImageUrl, downloadImageToStorage } from "./utils";

import { imageUrlExpireSeconds } from "@/app-config";

import { logger } from "@/app/lib/logger";

const log = logger.child({ module: "database-actions" });

const prisma = new PrismaClient();

export async function createGameTemplate(
  userId: number,
  newGameTemplateData: {
    name: string;
    imageUrl: string;
    imageDescription: string;
    backStory: string;
    description: string | null;
    isPublic: boolean;
  },
): Promise<number> {
  let imagePath: string;

  // download image to storage
  try {
    imagePath = await downloadImageToStorage(newGameTemplateData.imageUrl);
  } catch (error) {
    log.error(error, `Failed to download image to storage`);
    throw new DatabaseError(
      DatabaseErrorType.InternalError,
      `Failed to download image to storage`,
    );
  }

  try {
    const gameTemplate = await prisma.gameTemplate.create({
      data: {
        name: newGameTemplateData.name,
        backstory: newGameTemplateData.backStory,
        description: newGameTemplateData.description,
        imagePath: imagePath,
        imageDescription: newGameTemplateData.imageDescription,
        isPublic: newGameTemplateData.isPublic,
        userId,
      },
      select: {
        id: true,
      },
    });

    return gameTemplate.id;
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
      "Failed to write game template to database",
    );
  }
}

export async function addLike(
  userId: number,
  gameTemplateId: number,
): Promise<void> {
  // Check if the game template is public and not deleted
  const gameTemplate = await prisma.gameTemplate.findFirst({
    where: { id: gameTemplateId, isPublic: true, deleted: false },
  });

  if (!gameTemplate) {
    throw new DatabaseError(
      DatabaseErrorType.NotFound,
      "Game template not found or not public",
    );
  }

  // Check if like exists
  const existingLike = await prisma.gameTemplateLike.findFirst({
    where: {
      userId,
      gameTemplateId,
    },
  });

  if (existingLike) {
    if (existingLike.deleted) {
      // Like exists but is deleted, update to undelete
      await prisma.gameTemplateLike.update({
        where: { id: existingLike.id },
        data: {
          deleted: false,
          deletionTimestamp: null,
          createdAt: new Date(),
        },
      });
    } else {
      // Like already exists and is not deleted
      throw new DatabaseError(
        DatabaseErrorType.Conflict,
        "User has already liked this game template",
      );
    }
  } else {
    // Create new like
    await prisma.gameTemplateLike.create({
      data: {
        userId,
        gameTemplateId,
        createdAt: new Date(),
      },
    });
  }
}

export async function deleteLike(
  userId: number,
  gameTemplateId: number,
): Promise<void> {
  const existingLike = await prisma.gameTemplateLike.findFirst({
    where: {
      userId,
      gameTemplateId,
      deleted: false,
    },
  });

  if (!existingLike) {
    throw new DatabaseError(DatabaseErrorType.NotFound, "Like not found");
  }

  await prisma.gameTemplateLike.update({
    where: { id: existingLike.id },
    data: {
      deleted: true,
      deletionTimestamp: new Date(),
    },
  });
}

// TODO: atomicity issue
export async function addComment(
  userId: number,
  gameTemplateId: number,
  text: string,
): Promise<number> {
  // Check if the game template is public and not deleted
  const gameTemplate = await prisma.gameTemplate.findFirst({
    where: { id: gameTemplateId, isPublic: true, deleted: false },
  });

  if (!gameTemplate) {
    throw new DatabaseError(
      DatabaseErrorType.NotFound,
      "Game template not found or not public",
    );
  }

  // Create the comment
  const newComment = await prisma.gameTemplateComment.create({
    data: {
      text,
      userId,
      gameTemplateId,
    },
    select: {
      id: true,
    },
  });

  return newComment.id;
}

export async function deleteGameTemplate(
  userId: number,
  templateId: number,
): Promise<void> {
  const gameTemplate = await prisma.gameTemplate.findFirst({
    where: {
      id: templateId,
      deleted: false,
    },
    select: {
      userId: true,
    },
  });

  if (!gameTemplate) {
    throw new DatabaseError(
      DatabaseErrorType.NotFound,
      "Game template not found",
    );
  }

  if (gameTemplate.userId !== userId) {
    throw new DatabaseError(
      DatabaseErrorType.Unauthorized,
      "User does not own the game template",
    );
  }

  // Soft delete the game template and cascade to likes and comments
  await prisma.$transaction(async (prisma) => {
    // Soft delete the game template
    await prisma.gameTemplate.update({
      where: { id: templateId },
      data: {
        deleted: true,
        deletionTimestamp: new Date(),
      },
    });

    // Soft delete associated comments
    await prisma.gameTemplateComment.updateMany({
      where: {
        gameTemplateId: templateId,
        deleted: false,
      },
      data: {
        deleted: true,
        deletionTimestamp: new Date(),
      },
    });

    // Soft delete associated likes
    await prisma.gameTemplateLike.updateMany({
      where: {
        gameTemplateId: templateId,
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
 * Retrieves the number of undeleted likes for a game template.
 *
 * @param gameTemplateId - ID of the game template
 * @returns The number of likes
 */
export async function getGameTemplateLikeCount(
  gameTemplateId: number,
): Promise<number> {
  return await prisma.gameTemplateLike.count({
    where: {
      gameTemplateId: gameTemplateId,
      deleted: false,
    },
  });
}

export async function deleteComment(
  userId: number,
  commentId: number,
): Promise<void> {
  const comment = await prisma.gameTemplateComment.findFirst({
    where: {
      id: commentId,
      deleted: false,
    },
    select: {
      userId: true,
    },
  });

  if (!comment) {
    throw new DatabaseError(DatabaseErrorType.NotFound, "Comment not found");
  }

  if (comment.userId !== userId) {
    throw new DatabaseError(
      DatabaseErrorType.Unauthorized,
      "User does not own the comment",
    );
  }

  await prisma.gameTemplateComment.update({
    where: { id: commentId },
    data: {
      deleted: true,
      deletionTimestamp: new Date(),
    },
  });
}

/**
 * Returns the comments for a game template.
 * @param userId
 * @param gameTemplateId
 * @returns
 */
export async function getComments(
  userId: number,
  gameTemplateId: number,
): Promise<
  {
    id: number;
    username: string | null;
    text: string;
    createdAt: Date;
  }[]
> {
  const comments = await prisma.gameTemplateComment.findMany({
    where: {
      gameTemplateId: gameTemplateId,
      deleted: false,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      user: {
        select: {
          name: true,
        },
      },
      text: true,
      createdAt: true,
    },
  });

  return comments.map((comment) => {
    return {
      id: comment.id,
      username: comment.user.name,
      text: comment.text,
      createdAt: comment.createdAt,
    };
  });
}

// TODO: remove statistics fields
export interface GameTemplateMetadata {
  id: number;
  name: string;
  backstory: string;
  description: string | null;
  imageUrl: string;
  imageDescription: string;
  isLiked: boolean;
  isPublic: boolean;
}

export async function getGameTemplateMetadataAndStatistics(
  userId: number,
  gameTemplateId: number,
): Promise<GameTemplateMetadata & GameTemplateStatistics> {
  const [gameTemplate, statistics] = await Promise.all([
    prisma.gameTemplate.findFirst({
      where: {
        id: gameTemplateId,
        deleted: false,
        OR: [
          {
            userId: userId,
          },
          {
            isPublic: true,
          },
        ],
      },
      select: {
        name: true,
        imageUrl: true,
        imagePath: true,
        imageUrlExpiration: true,
        imageDescription: true,
        backstory: true,
        description: true,
        isPublic: true,
        likes: {
          select: {
            userId: true,
          },
          where: {
            deleted: false,
          },
        },
      },
    }),
    getGameTemplateStatistics(gameTemplateId),
  ]);

  if (!gameTemplate) {
    throw new DatabaseError(
      DatabaseErrorType.NotFound,
      "Game template not found under user or not public",
    );
  }

  if (
    gameTemplate.imageUrlExpiration &&
    gameTemplate.imageUrlExpiration! > new Date()
  ) {
    const { likes, ...metadata } = gameTemplate;

    return {
      ...metadata,
      ...statistics,
      imageUrl: gameTemplate.imageUrl!,
      isLiked: likes.some((like) => like.userId === userId),
    };
  }

  // check for URL staleness
  try {
    const { url, expiration } = await createImageUrl(
      gameTemplate.imagePath,
      imageUrlExpireSeconds,
    );

    // TODO: run this in the background
    await prisma.gameTemplate.update({
      where: {
        id: gameTemplateId,
      },
      data: {
        imageUrl: url,
        imageUrlExpiration: expiration,
      },
    });

    const { likes, ...metadata } = gameTemplate;

    return {
      ...metadata,
      ...statistics,
      imageUrl: url,
      isLiked: likes.some((like) => like.userId === userId),
    };
  } catch (error) {
    throw new DatabaseError(
      DatabaseErrorType.InternalError,
      "Failed to regenerate image URL",
    );
  }
}

export interface GameTemplateStatistics {
  id: number;
  undeletedLikeCount: number;
  historicalLikeCount: number;
  undeletedCommentCount: number;
  historicalCommentCount: number;
  childSessionsCount: number;
  childSessionsUserActionsCount: number;
  visitCount: number;
  trendingPushCount: number;
}

export async function getGameTemplatesByUser(
  userId: number,
): Promise<(GameTemplateMetadata & GameTemplateStatistics)[]> {
  const imageUrlExpiredTemplates = await prisma.gameTemplate.findMany({
    where: {
      userId: userId,
      deleted: false,
      OR: [
        {
          imageUrl: null,
        },
        {
          imageUrlExpiration: {
            lt: new Date(),
          },
        },
      ],
    },
    select: {
      id: true,
      imagePath: true,
    },
  });

  // regenerate URLs for expired templates
  // TODO: optimize
  await Promise.all(
    imageUrlExpiredTemplates.map(async (template) => {
      try {
        const { url, expiration } = await createImageUrl(
          template.imagePath,
          imageUrlExpireSeconds,
        );

        await prisma.gameTemplate.update({
          where: {
            id: template.id,
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

  const [gameTemplates] = await Promise.all([
    prisma.gameTemplate.findMany({
      where: {
        userId: userId,
        deleted: false,
      },
      select: {
        id: true,
        name: true,
        isPublic: true,
        description: true,
        backstory: true,
        imageUrl: true,
        imageDescription: true,
        likes: {
          select: {
            userId: true,
          },
          where: {
            deleted: false,
          },
        },
      },
    }),
  ]);

  // TODO: update database schema and make this query run concurrently with the one retrieving metadata
  const statistics = await prisma.gameTemplateStatistics.findMany({
    where: {
      id: {
        in: gameTemplates.map((template) => template.id),
      },
    },
  });

  const statisticsMap = new Map<number, GameTemplateStatistics>();

  for (const stat of statistics) {
    statisticsMap.set(stat.id, stat);
  }

  gameTemplates.sort((a, b) => {
    if (a.isPublic > b.isPublic) {
      return -1;
    } else {
      return -(
        statisticsMap.get(a.id)!.undeletedLikeCount -
        statisticsMap.get(b.id)!.undeletedLikeCount
      );
    }
  });

  return gameTemplates.map((gameTemplate) => {
    const { likes, ...metadata } = gameTemplate;

    return {
      ...metadata,
      ...statisticsMap.get(gameTemplate.id)!,
      isLiked: likes.some((like) => like.userId === userId),
      imageUrl: gameTemplate.imageUrl!,
    };
  });
}

export async function refreshGameTemplateImageUrls(
  ids: number[],
): Promise<Map<number, string>> {
  try {
    const gameTemplates = await prisma.gameTemplate.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        imagePath: true,
      },
    });

    const imageUrls = await Promise.all(
      gameTemplates.map((template) =>
        (async () => {
          const { url, expiration } = await createImageUrl(
            template.imagePath,
            imageUrlExpireSeconds,
          );

          await prisma.gameTemplate.update({
            where: {
              id: template.id,
            },
            data: {
              imageUrl: url,
              imageUrlExpiration: expiration,
            },
          });

          return { id: template.id, url: url };
        })(),
      ),
    );

    const urlMap = new Map<number, string>();

    imageUrls.forEach(({ id, url }) => {
      urlMap.set(id, url);
    });

    return urlMap;
  } catch (error) {
    throw new DatabaseError(
      DatabaseErrorType.InternalError,
      "Failed to refresh game template image URLs",
    );
  }
}

// TODO: add authorization
export async function getGameTemplateStatistics(
  gameTemplateId: number,
): Promise<GameTemplateStatistics> {
  const statistics = await prisma.gameTemplateStatistics.findFirst({
    where: {
      id: gameTemplateId,
    },
  });

  if (!statistics) {
    throw new DatabaseError(
      DatabaseErrorType.NotFound,
      "Game template statistics not found",
    );
  }

  return statistics;
}

export async function getRecommendedGameTemplates(
  userId: number,
  limit: number = 5,
): Promise<(GameTemplateMetadata & GameTemplateStatistics)[]> {
  const rawQuery = Prisma.sql`
      SELECT *
      FROM (SELECT DISTINCT
            ON (gt."id")
                gt."id",
                gt."name",
                gt."description",
                gt."backstory",
                gt."imageUrl",
                gt."imageUrlExpiration",
                gt."imageDescription",
                gts."undeletedLikeCount",
                gts."historicalLikeCount",
                gts."undeletedCommentCount",
                gts."historicalCommentCount",
                gts."childSessionsCount",
                gts."visitCount",
                gts."trendingPushCount",
                gts."childSessionsUserActionsCount",
                -- Score calculation
                gts."visitCount" + gts."childSessionsUserActionsCount" + 2 * gts."historicalLikeCount" + 3 * gts."historicalCommentCount" + 20 / (1 + gts."trendingPushCount")
                - (CASE
                WHEN gtv."id" IS NOT NULL THEN 100000000 ELSE 0 END)
                - (CASE
                WHEN gtl."id" IS NOT NULL THEN 100000000 ELSE 0 END)
                - (CASE
                WHEN gtc."id" IS NOT NULL THEN 100000000 ELSE 0 END)
                - (CASE
                WHEN gs."id" IS NOT NULL THEN 100000000 ELSE 0 END)
                - (CASE
                WHEN gt."userId" = ${userId} THEN 100000000 ELSE 0 END) AS score
            FROM
                "GameTemplate" gt
                JOIN
                "GameTemplateStatistics" gts
            ON gt.id = gts.id
                LEFT JOIN
                "GameTemplateVisit" gtv ON gt.id = gtv."gameTemplateId" AND gtv."userId" = ${userId}
                LEFT JOIN
                "GameTemplatePush" gtp ON gt.id = gtp."gameTemplateId" AND gtp."userId" = ${userId}
                LEFT JOIN
                "GameTemplateLike" gtl ON gt.id = gtl."gameTemplateId" AND gtl."userId" = ${userId} AND gtl."deleted" = false
                LEFT JOIN
                "GameTemplateComment" gtc ON gt.id = gtc."gameTemplateId" AND gtc."userId" = ${userId} AND gtc."deleted" = false
                LEFT JOIN
                "GameSession" gs ON gt.id = gs."parentTemplateId" AND gs."userId" = ${userId} AND gs."deleted" = false
            WHERE
              gt."isPublic" = true
              AND gt."deleted" = false
            ORDER BY
                gt."id", score DESC) AS templates
      ORDER BY score DESC LIMIT ${limit}
  `;

  const gameTemplates = await prisma.$queryRaw<
    {
      id: number;
      name: string;
      description: string | null;
      backstory: string;
      imageUrl: string | null;
      imageUrlExpiration: Date | null;
      imageDescription: string;
      undeletedLikeCount: number;
      historicalLikeCount: number;
      undeletedCommentCount: number;
      historicalCommentCount: number;
      childSessionsCount: number;
      visitCount: number;
      childSessionsUserActionsCount: number;
      trendingPushCount: number;
      score: number;
    }[]
  >(rawQuery);

  // Process image URLs, regenerate if necessary
  const imageUrls: Map<number, string | null> = new Map();

  gameTemplates.forEach((template) => {
    imageUrls.set(template.id, template.imageUrl);
  });

  const newImageUrls = await refreshGameTemplateImageUrls(
    gameTemplates
      .filter(
        (template) =>
          template.imageUrl === null ||
          template.imageUrlExpiration! < new Date(),
      )
      .map((template) => template.id),
  );

  newImageUrls.forEach((newUrl, templateId) => {
    imageUrls.set(templateId, newUrl);
  });

  return gameTemplates.map((gameTemplate) => ({
    id: gameTemplate.id,
    name: gameTemplate.name,
    isPublic: true,
    description: gameTemplate.description,
    backstory: gameTemplate.backstory,
    imageUrl: imageUrls.get(gameTemplate.id)!!,
    imageDescription: gameTemplate.imageDescription,
    isLiked: false,
    likes: Number(gameTemplate.historicalLikeCount),
    comments: Number(gameTemplate.historicalCommentCount),
    childSessionCount: Number(gameTemplate.childSessionsCount),
    visitCount: Number(gameTemplate.visitCount),
    score: Number(gameTemplate.score),
    undeletedLikeCount: Number(gameTemplate.undeletedLikeCount),
    historicalLikeCount: Number(gameTemplate.historicalLikeCount),
    undeletedCommentCount: Number(gameTemplate.undeletedCommentCount),
    childSessionsCount: Number(gameTemplate.childSessionsCount),
    historicalCommentCount: Number(gameTemplate.historicalCommentCount),
    childSessionsUserActionsCount: Number(
      gameTemplate.childSessionsUserActionsCount,
    ),
    trendingPushCount: Number(gameTemplate.trendingPushCount),
  }));
}

export async function markGameTemplateAsVisited(
  userId: number,
  gameTemplateId: number,
) {
  await prisma.$executeRaw`
    INSERT INTO "GameTemplateVisit" ("userId", "gameTemplateId")
    VALUES (${userId}, ${gameTemplateId})
    ON CONFLICT ("userId", "gameTemplateId") DO NOTHING;
  `;
}

export async function markGameTemplateAsRecommended(
  userId: number,
  gameTemplateId: number,
) {
  await prisma.$executeRaw`
    INSERT INTO "GameTemplatePush" ("userId", "gameTemplateId")
    VALUES (${userId}, ${gameTemplateId})
    ON CONFLICT ("userId", "gameTemplateId") DO NOTHING;
  `;
}
