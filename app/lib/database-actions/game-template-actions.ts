"use server";

import { Prisma, PrismaClient } from "@prisma/client";

import { DatabaseError, DatabaseErrorType } from "./error-types";
import { createImageUrl, downloadImageToStorage } from "./utils";

import { imageUrlExpireSeconds } from "@/app-config";

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
    throw new DatabaseError(
      DatabaseErrorType.InternalError,
      `Failed to download image`,
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

export async function getGameTemplateMetadata(
  userId: number,
  gameTemplateId: number,
): Promise<{
  name: string;
  backstory: string;
  description: string | null;
  imageUrl: string;
  imageDescription: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
}> {
  const gameTemplate = await prisma.gameTemplate.findFirst({
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
      likes: {
        select: {
          userId: true,
        },
        where: {
          deleted: false,
        },
      },
      _count: {
        select: {
          likes: {
            where: {
              deleted: false,
            },
          },
          comments: {
            where: {
              deleted: false,
            },
          },
        },
      },
    },
  });

  if (!gameTemplate) {
    throw new DatabaseError(
      DatabaseErrorType.NotFound,
      "Game template not found under user or not public",
    );
  }

  if (
    gameTemplate.imageUrlExpiration &&
    gameTemplate.imageUrlExpiration > new Date()
  ) {
    return {
      name: gameTemplate.name,
      backstory: gameTemplate.backstory,
      description: gameTemplate.description,
      imageUrl: gameTemplate.imageUrl!,
      imageDescription: gameTemplate.imageDescription,
      likeCount: gameTemplate._count.likes,
      commentCount: gameTemplate._count.comments,
      isLiked: gameTemplate.likes.some((like) => like.userId === userId),
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

    return {
      name: gameTemplate.name,
      backstory: gameTemplate.backstory,
      description: gameTemplate.description,
      imageUrl: url,
      imageDescription: gameTemplate.imageDescription,
      likeCount: gameTemplate._count.likes,
      commentCount: gameTemplate._count.comments,
      isLiked: gameTemplate.likes.some((like) => like.userId === userId),
    };
  } catch (error) {
    throw new DatabaseError(
      DatabaseErrorType.InternalError,
      "Failed to regenerate image URL",
    );
  }
}

export interface GameTemplateMetadata {
  id: number;
  name: string;
  isPublic: boolean;
  isLiked: boolean;
  likes: number;
  comments: number;
  description: string | null;
  backstory: string;
  imageUrl: string;
  imageDescription: string;
}

export async function getGameTemplatesByUser(
  userId: number,
): Promise<GameTemplateMetadata[]> {
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

  const gameTemplates = await prisma.gameTemplate.findMany({
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
      _count: {
        select: {
          likes: {
            where: {
              deleted: false,
            },
          },
          comments: {
            where: {
              deleted: false,
            },
          },
        },
      },
    },
  });

  gameTemplates.sort((a, b) => {
    if (a.isPublic > b.isPublic) {
      return -1;
    } else {
      return -(a._count.likes - b._count.likes);
    }
  });

  return gameTemplates.map((gameTemplate) => {
    return {
      id: gameTemplate.id,
      name: gameTemplate.name,
      isPublic: gameTemplate.isPublic,
      description: gameTemplate.description,
      backstory: gameTemplate.backstory,
      imageUrl: gameTemplate.imageUrl!,
      imageDescription: gameTemplate.imageDescription,
      isLiked: gameTemplate.likes.some((like) => like.userId === userId),
      likes: gameTemplate._count.likes,
      comments: gameTemplate._count.comments,
    };
  });
}
