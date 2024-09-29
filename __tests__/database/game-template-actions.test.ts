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
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

import { getFakeImageUrl } from "./utils";

import { createUser } from "@/app/lib/database-actions/user-actions";
import {
  createGameTemplate,
  deleteGameTemplate,
  getGameTemplateLikeCount,
  addLike,
  deleteLike,
  addComment,
  deleteComment,
  getComments,
  getGameTemplateMetadataAndStatistics,
  getGameTemplatesByUser,
  getGameTemplateStatistics,
  getRecommendedGameTemplates,
  markGameTemplateAsVisited,
  markGameTemplateAsRecommended,
} from "@/app/lib/database-actions/game-template-actions";
import {
  DatabaseError,
  DatabaseErrorType,
} from "@/app/lib/database-actions/error-types";
import {
  addSceneToSession,
  createGameSession,
} from "@/app/lib/database-actions/game-session-actions";

describe("Game Template Actions", () => {
  const testGameTemplateData = {
    name: "Test Template",
    imageUrl: getFakeImageUrl(1),
    imageDescription: "Template image",
    backstory: "This is a test backstory.",
    description: "A test template",
    isPublic: true,
    firstSceneData: {
      event: "Test event",
      imageUrl: getFakeImageUrl(2),
      imageDescription: "Test image description",
      narration: "Test narration",
      proposedActions: ["Test action 1", "Test action 2", "Test action 3"],
    },
  };

  const {
    firstSceneData: { imageUrl, ...firstSceneDataPruned },
    ...testGameTemplateMetadataPruned
  } = testGameTemplateData;

  const testGameTemplateMetadataWithFirstSceneExpect = {
    firstSceneData: {
      ...firstSceneDataPruned,
      imagePath: expect.any(String),
    },
    ...testGameTemplateMetadataPruned,
    imagePath: expect.any(String),
    id: expect.any(Number),
  };

  const testPublicGameTemplateData = {
    name: "Public Test Template",
    imageUrl: getFakeImageUrl(1),
    imageDescription: "Public Template image",
    backstory: "Public This is a test backstory.",
    description: "Public A test template",
    isPublic: true,
    firstSceneData: {
      event: "Public event",
      imageUrl: getFakeImageUrl(2),
      imageDescription: "Public image description",
      narration: "Public narration",
      proposedActions: [
        "Public action 1",
        "Public action 2",
        "Public action 3",
      ],
    },
  };

  const {
    firstSceneData: {
      imageUrl: testPublicImageUrl,
      ...publicFirstSceneDataPruned
    },
    ...testPublicGameTemplateMetadataPruned
  } = testPublicGameTemplateData;

  const testPublicGameTemplateMetadataWithFirstSceneExpect = {
    firstSceneData: {
      ...publicFirstSceneDataPruned,
      imagePath: expect.any(String),
    },
    ...testPublicGameTemplateMetadataPruned,
    imagePath: expect.any(String),
    id: expect.any(Number),
  };

  const testPrivateGameTemplateData = {
    name: "Private Test Template",
    imageUrl: getFakeImageUrl(1),
    imageDescription: "Private Template image",
    backstory: "Private This is a test backstory.",
    description: "Private A test template",
    isPublic: false,
    firstSceneData: {
      event: "Private event",
      imageUrl: getFakeImageUrl(2),
      imageDescription: "Private image description",
      narration: "Private narration",
      proposedActions: [
        "Private action 1",
        "Private action 2",
        "Private action 3",
      ],
    },
  };

  const {
    firstSceneData: {
      imageUrl: testPrivateImageUrl,
      ...privateFirstSceneDataPruned
    },
    ...testPrivateGameTemplateMetadataPruned
  } = testPrivateGameTemplateData;

  const testPrivateGameTemplateMetadataWithFirstSceneExpect = {
    firstSceneData: {
      ...privateFirstSceneDataPruned,
      imagePath: expect.any(String),
    },
    ...testPrivateGameTemplateMetadataPruned,
    imagePath: expect.any(String),
    id: expect.any(Number),
  };

  const anyStatistics = {
    childSessionsCount: expect.any(Number),
    childSessionsUserActionsCount: expect.any(Number),
    historicalCommentCount: expect.any(Number),
    historicalLikeCount: expect.any(Number),
    trendingPushCount: expect.any(Number),
    undeletedCommentCount: expect.any(Number),
    undeletedLikeCount: expect.any(Number),
    visitCount: expect.any(Number),
  };

  test.concurrent(
    "should create and delete a game template with valid data",
    async () => {
      const userId = await createUser({
        email: `testuser-${uuidv4()}@example.com`,
        hashedPassword: "hashedpassword",
        name: "Test User",
      });

      const templateId = await createGameTemplate({
        userId,
        newGameTemplateData: {
          ...testGameTemplateData,
          isPublic: true,
        },
      });

      expect(templateId).toBeGreaterThan(0);

      // Retrieve the template
      const template = await getGameTemplateMetadataAndStatistics({
        userId,
        gameTemplateId: templateId,
      });

      expect(template).toEqual({
        ...anyStatistics,
        ...testGameTemplateMetadataWithFirstSceneExpect,
        imageUrl: expect.any(String),
        undeletedCommentCount: 0,
        isLiked: false,
        undeletedLikeCount: 0,
      });

      await deleteGameTemplate({ userId, templateId });

      await expect(
        getGameTemplateMetadataAndStatistics({
          userId,
          gameTemplateId: templateId,
        }),
      ).rejects.toThrowError(DatabaseError);

      try {
        await getGameTemplateMetadataAndStatistics({
          userId,
          gameTemplateId: templateId,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        const dbError = error as DatabaseError;

        expect(dbError.type).toBe(DatabaseErrorType.NotFound);
        expect(dbError.message).toBe(
          "Game template not found under user or not public",
        );
      }
    },
  );

  test.concurrent(
    "users can only access public templates and delete their own templates",
    async () => {
      const userId = await createUser({
        email: `testuser-${uuidv4()}@example.com`,
        hashedPassword: "hashedpassword",
        name: "Test User",
      });
      const otherUserId = await createUser({
        email: `otheruser-${uuidv4()}@example.com`,
        hashedPassword: "hashedpassword",
        name: "Other User",
      });

      const publicTemplateId = await createGameTemplate({
        userId,
        newGameTemplateData: testPublicGameTemplateData,
      });
      const privateTemplateId = await createGameTemplate({
        userId,
        newGameTemplateData: testPrivateGameTemplateData,
      });

      expect(
        await getGameTemplateMetadataAndStatistics({
          userId,
          gameTemplateId: publicTemplateId,
        }),
      ).toEqual({
        ...anyStatistics,
        ...testPublicGameTemplateMetadataWithFirstSceneExpect,
        imageUrl: expect.any(String),
        undeletedCommentCount: 0,
        isLiked: false,
        undeletedLikeCount: 0,
      });

      expect(
        await getGameTemplateMetadataAndStatistics({
          userId: otherUserId,
          gameTemplateId: publicTemplateId,
        }),
      ).toEqual({
        ...anyStatistics,
        ...testPublicGameTemplateMetadataWithFirstSceneExpect,
        imageUrl: expect.any(String),
        undeletedCommentCount: 0,
        isLiked: false,
        undeletedLikeCount: 0,
      });

      expect(
        await getGameTemplateMetadataAndStatistics({
          userId,
          gameTemplateId: privateTemplateId,
        }),
      ).toEqual({
        ...anyStatistics,
        ...testPrivateGameTemplateMetadataWithFirstSceneExpect,
        imageUrl: expect.any(String),
        undeletedCommentCount: 0,
        isLiked: false,
        undeletedLikeCount: 0,
      });

      await expect(
        getGameTemplateMetadataAndStatistics({
          userId: otherUserId,
          gameTemplateId: privateTemplateId,
        }),
      ).rejects.toThrowError(DatabaseError);

      try {
        await getGameTemplateMetadataAndStatistics({
          userId: otherUserId,
          gameTemplateId: privateTemplateId,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        const dbError = error as DatabaseError;

        expect(dbError.type).toBe(DatabaseErrorType.NotFound);
        expect(dbError.message).toBe(
          "Game template not found under user or not public",
        );
      }

      await expect(
        deleteGameTemplate({
          userId: otherUserId,
          templateId: publicTemplateId,
        }),
      ).rejects.toThrowError(DatabaseError);

      try {
        await deleteGameTemplate({
          userId: otherUserId,
          templateId: publicTemplateId,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        const dbError = error as DatabaseError;

        expect(dbError.type).toBe(DatabaseErrorType.Unauthorized);
        expect(dbError.message).toBe("User does not own the game template");
      }

      try {
        await deleteGameTemplate({
          userId: otherUserId,
          templateId: privateTemplateId,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        const dbError = error as DatabaseError;

        expect(dbError.type).toBe(DatabaseErrorType.Unauthorized);
        expect(dbError.message).toBe("User does not own the game template");
      }

      // check that game template is still accessible
      expect(
        await getGameTemplateMetadataAndStatistics({
          userId,
          gameTemplateId: publicTemplateId,
        }),
      ).toEqual({
        ...anyStatistics,
        ...testPublicGameTemplateMetadataWithFirstSceneExpect,
        imageUrl: expect.any(String),
        undeletedCommentCount: 0,
        isLiked: false,
        undeletedLikeCount: 0,
      });

      expect(
        await getGameTemplateMetadataAndStatistics({
          userId: otherUserId,
          gameTemplateId: publicTemplateId,
        }),
      ).toEqual({
        ...anyStatistics,
        ...testPublicGameTemplateMetadataWithFirstSceneExpect,
        imageUrl: expect.any(String),
        undeletedCommentCount: 0,
        isLiked: false,
        undeletedLikeCount: 0,
      });

      expect(
        await getGameTemplateMetadataAndStatistics({
          userId,
          gameTemplateId: privateTemplateId,
        }),
      ).toEqual({
        ...anyStatistics,
        ...testPrivateGameTemplateMetadataWithFirstSceneExpect,
        imageUrl: expect.any(String),
        undeletedCommentCount: 0,
        isLiked: false,
        undeletedLikeCount: 0,
      });

      // remove the templates
      await deleteGameTemplate({ userId, templateId: publicTemplateId });
      await deleteGameTemplate({ userId, templateId: privateTemplateId });

      await expect(
        getGameTemplateMetadataAndStatistics({
          userId,
          gameTemplateId: publicTemplateId,
        }),
      ).rejects.toThrowError(DatabaseError);

      try {
        await getGameTemplateMetadataAndStatistics({
          userId,
          gameTemplateId: publicTemplateId,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        const dbError = error as DatabaseError;

        expect(dbError.type).toBe(DatabaseErrorType.NotFound);
        expect(dbError.message).toBe(
          "Game template not found under user or not public",
        );
      }

      await expect(
        getGameTemplateMetadataAndStatistics({
          userId,
          gameTemplateId: privateTemplateId,
        }),
      ).rejects.toThrowError(DatabaseError);
      try {
        await getGameTemplateMetadataAndStatistics({
          userId,
          gameTemplateId: privateTemplateId,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        const dbError = error as DatabaseError;

        expect(dbError.type).toBe(DatabaseErrorType.NotFound);
        expect(dbError.message).toBe(
          "Game template not found under user or not public",
        );
      }
    },
  );

  test.concurrent(
    "should throw Unauthorized error when creating a game template with invalid userId",
    async () => {
      const invalidUserId = 999999;

      await expect(
        createGameTemplate({
          userId: invalidUserId,
          newGameTemplateData: {
            ...testPrivateGameTemplateData,
            isPublic: true,
          },
        }),
      ).rejects.toThrowError(DatabaseError);

      try {
        await createGameTemplate({
          userId: invalidUserId,
          newGameTemplateData: testGameTemplateData,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        const dbError = error as DatabaseError;

        expect(dbError.type).toBe(DatabaseErrorType.Unauthorized);
        expect(dbError.message).toBe("User not found");
      }
    },
  );

  test.concurrent(
    "should add and delete a like to a public game template",
    async () => {
      const userId = await createUser({
        email: `testuser-${uuidv4()}@example.com`,
        hashedPassword: "hashedpassword",
        name: "Test User",
      });

      const templateId = await createGameTemplate({
        userId,
        newGameTemplateData: {
          ...testGameTemplateData,
          isPublic: true,
        },
      });

      expect(
        await getGameTemplateLikeCount({ gameTemplateId: templateId }),
      ).toBe(0);
      await addLike({ userId, gameTemplateId: templateId });
      expect(
        await getGameTemplateLikeCount({ gameTemplateId: templateId }),
      ).toBe(1);

      await expect(
        addLike({ userId, gameTemplateId: templateId }),
      ).rejects.toThrow(DatabaseError);
      try {
        await addLike({ userId, gameTemplateId: templateId });
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        const dbError = error as DatabaseError;

        expect(dbError.type).toBe(DatabaseErrorType.Conflict);
        expect(dbError.message).toBe(
          "User has already liked this game template",
        );
      }

      expect(
        await getGameTemplateLikeCount({ gameTemplateId: templateId }),
      ).toBe(1);

      await deleteLike({ userId, gameTemplateId: templateId });
      expect(
        await getGameTemplateLikeCount({ gameTemplateId: templateId }),
      ).toBe(0);

      await expect(
        deleteLike({ userId, gameTemplateId: templateId }),
      ).rejects.toThrow(DatabaseError);
      try {
        await deleteLike({ userId, gameTemplateId: templateId });
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        const dbError = error as DatabaseError;

        expect(dbError.type).toBe(DatabaseErrorType.NotFound);
        expect(dbError.message).toBe("Like not found");
      }

      // do `addLike` and `deleteLike` a second time to test the behavior of soft deletion
      await addLike({ userId, gameTemplateId: templateId });
      expect(
        await getGameTemplateLikeCount({ gameTemplateId: templateId }),
      ).toBe(1);
      await deleteLike({ userId, gameTemplateId: templateId });
      expect(
        await getGameTemplateLikeCount({ gameTemplateId: templateId }),
      ).toBe(0);
    },
  );

  test.concurrent(
    "should throw Conflict error when adding a like that already exists",
    async () => {
      const userId = await createUser({
        email: `testuser-${uuidv4()}@example.com`,
        hashedPassword: "hashedpassword",
        name: "Test User",
      });

      const templateId = await createGameTemplate({
        userId,
        newGameTemplateData: {
          ...testGameTemplateData,
          isPublic: true,
        },
      });

      await addLike({ userId, gameTemplateId: templateId });

      await expect(
        addLike({ userId, gameTemplateId: templateId }),
      ).rejects.toThrowError(DatabaseError);

      try {
        await addLike({ userId, gameTemplateId: templateId });
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        const dbError = error as DatabaseError;

        expect(dbError.type).toBe(DatabaseErrorType.Conflict);
        expect(dbError.message).toBe(
          "User has already liked this game template",
        );
      }
    },
  );

  test.concurrent("should add and delete a comment", async () => {
    const userId = await createUser({
      email: `testuser-${uuidv4()}@example.com`,
      hashedPassword: "hashedpassword",
      name: "Test User",
    });

    const templateId = await createGameTemplate({
      userId,
      newGameTemplateData: {
        ...testGameTemplateData,
        isPublic: true,
      },
    });

    const commentText = "This is a test comment";

    await addComment({ userId, gameTemplateId: templateId, text: commentText });

    // Retrieve comments
    const comments = await getComments({ userId, gameTemplateId: templateId });

    expect(comments.length).toBe(1);
    const comment = comments[0];

    expect({
      username: comment.username,
      text: comment.text,
      createdAt: comment.createdAt,
    }).toEqual({
      username: "Test User",
      text: commentText,
      createdAt: expect.any(Date),
    });

    await deleteComment({ userId, commentId: comment.id });

    const newComments = await getComments({
      userId,
      gameTemplateId: templateId,
    });

    expect(newComments.length).toBe(0);
  });

  test.concurrent(
    "should get a public game template without comments",
    async () => {
      const userId = await createUser({
        email: `testuser-${uuidv4()}@example.com`,
        hashedPassword: "hashedpassword",
        name: "Test User",
      });

      const templateId = await createGameTemplate({
        userId,
        newGameTemplateData: {
          ...testGameTemplateData,
          isPublic: true,
        },
      });

      const template = await getGameTemplateMetadataAndStatistics({
        userId,
        gameTemplateId: templateId,
      });

      expect(template).toEqual({
        ...anyStatistics,
        ...testGameTemplateMetadataWithFirstSceneExpect,
        imageUrl: expect.any(String),
        undeletedCommentCount: 0,
        isLiked: false,
        undeletedLikeCount: 0,
      });
    },
  );

  test.concurrent(
    "should retrieve game template metadata and count likes & comments correctly",
    async () => {
      const userId = await createUser({
        email: `testuser-${uuidv4()}@example.com`,
        hashedPassword: "hashedpassword",
        name: "Test User",
      });

      const anotherUserId = await createUser({
        email: `anotheruser-${uuidv4()}@example.com`,
        hashedPassword: "hashedpassword",
        name: "Another User",
      });

      // create a public template
      const publicTemplateId = await createGameTemplate({
        userId,
        newGameTemplateData: {
          name: "Public Test Template",
          imageUrl: getFakeImageUrl(1),
          imageDescription: "Public Template image",
          backstory: "This is a public test backstory.",
          description: "A public test template",
          isPublic: true,
          firstSceneData: {
            event: "Public event",
            imageUrl: getFakeImageUrl(2),
            imageDescription: "Public image description",
            narration: "Public narration",
            proposedActions: [
              "Public action 1",
              "Public action 2",
              "Public action 3",
            ],
          },
        },
      });

      // create another public template
      const publicTemplateId2 = await createGameTemplate({
        userId,
        newGameTemplateData: {
          name: "Public Test Template 2",
          imageUrl: getFakeImageUrl(1),
          imageDescription: "Public Template image 2",
          backstory: "This is a public test backstory 2.",
          description: "A public test template 2",
          isPublic: true,
          firstSceneData: {
            event: "Public event",
            imageUrl: getFakeImageUrl(2),
            imageDescription: "Public image description",
            narration: "Public narration",
            proposedActions: [
              "Public action 1",
              "Public action 2",
              "Public action 3",
            ],
          },
        },
      });

      // create a private template
      const privateTemplateId = await createGameTemplate({
        userId,
        newGameTemplateData: {
          name: "Private Test Template",
          imageUrl: getFakeImageUrl(1),
          imageDescription: "Private Template image",
          backstory: "This is a private test backstory.",
          description: "A private test template",
          isPublic: false,
          firstSceneData: {
            event: "Private event",
            imageUrl: getFakeImageUrl(2),
            imageDescription: "Private image description",
            narration: "Private narration",
            proposedActions: [
              "Private action 1",
              "Private action 2",
              "Private action 3",
            ],
          },
        },
      });

      // like the first public template
      await addLike({ userId, gameTemplateId: publicTemplateId });

      // like the second public template then delete it
      await addLike({ userId, gameTemplateId: publicTemplateId2 });
      await addLike({
        userId: anotherUserId,
        gameTemplateId: publicTemplateId2,
      });
      await deleteLike({ userId, gameTemplateId: publicTemplateId2 });
      await deleteLike({
        userId: anotherUserId,
        gameTemplateId: publicTemplateId2,
      });

      // add a comment to the second public template
      const commentText = "This is a test comment";

      await addComment({
        userId,
        gameTemplateId: publicTemplateId2,
        text: commentText,
      });

      const commentId = await addComment({
        userId: anotherUserId,
        gameTemplateId: publicTemplateId2,
        text: commentText,
      });

      await deleteComment({ userId: anotherUserId, commentId });

      // retrieve the metadata
      const templatesMetadata = await getGameTemplatesByUser({ userId });

      // should be first public template, then second public template, then private template
      expect(templatesMetadata).toEqual([
        {
          ...anyStatistics,
          id: publicTemplateId,
          name: "Public Test Template",
          isPublic: true,
          isLiked: true,
          undeletedLikeCount: 1,
          undeletedCommentCount: 0,
          description: "A public test template",
          backstory: "This is a public test backstory.",
          imageUrl: expect.any(String),
          imageDescription: "Public Template image",
        },
        {
          ...anyStatistics,
          id: publicTemplateId2,
          name: "Public Test Template 2",
          isPublic: true,
          isLiked: false,
          undeletedLikeCount: 0,
          undeletedCommentCount: 1,
          description: "A public test template 2",
          backstory: "This is a public test backstory 2.",
          imageUrl: expect.any(String),
          imageDescription: "Public Template image 2",
        },
        {
          ...anyStatistics,
          id: privateTemplateId,
          name: "Private Test Template",
          isPublic: false,
          isLiked: false,
          undeletedLikeCount: 0,
          undeletedCommentCount: 0,
          description: "A private test template",
          backstory: "This is a private test backstory.",
          imageUrl: expect.any(String),
          imageDescription: "Private Template image",
        },
      ]);
    },
  );

  test.concurrent(
    "should get the correct like count & status and comment count for game template metadata",
    async () => {
      const userId = await createUser({
        email: `testuser-${uuidv4()}@example.com`,
        hashedPassword: "hashedpassword",
        name: "Test User",
      });

      const templateId = await createGameTemplate({
        userId,
        newGameTemplateData: {
          ...testGameTemplateData,
          isPublic: true,
        },
      });

      let metadata = await getGameTemplateMetadataAndStatistics({
        userId,
        gameTemplateId: templateId,
      });

      expect(metadata.undeletedLikeCount).toBe(0);
      expect(metadata.isLiked).toBe(false);
      expect(metadata.undeletedCommentCount).toBe(0);

      await addLike({ userId, gameTemplateId: templateId });
      metadata = await getGameTemplateMetadataAndStatistics({
        userId,
        gameTemplateId: templateId,
      });
      expect(metadata.undeletedLikeCount).toBe(1);
      expect(metadata.isLiked).toBe(true);
      expect(metadata.undeletedCommentCount).toBe(0);

      await deleteLike({ userId, gameTemplateId: templateId });
      metadata = await getGameTemplateMetadataAndStatistics({
        userId,
        gameTemplateId: templateId,
      });
      expect(metadata.undeletedLikeCount).toBe(0);
      expect(metadata.isLiked).toBe(false);
      expect(metadata.undeletedCommentCount).toBe(0);

      await addLike({ userId, gameTemplateId: templateId });
      metadata = await getGameTemplateMetadataAndStatistics({
        userId,
        gameTemplateId: templateId,
      });
      expect(metadata.undeletedLikeCount).toBe(1);
      expect(metadata.isLiked).toBe(true);
      expect(metadata.undeletedCommentCount).toBe(0);

      const commentId = await addComment({
        userId,
        gameTemplateId: templateId,
        text: "Test comment",
      });

      metadata = await getGameTemplateMetadataAndStatistics({
        userId,
        gameTemplateId: templateId,
      });
      expect(metadata.undeletedLikeCount).toBe(1);
      expect(metadata.isLiked).toBe(true);
      expect(metadata.undeletedCommentCount).toBe(1);

      await deleteComment({ userId, commentId });
      metadata = await getGameTemplateMetadataAndStatistics({
        userId,
        gameTemplateId: templateId,
      });
      expect(metadata.undeletedLikeCount).toBe(1);
      expect(metadata.isLiked).toBe(true);
      expect(metadata.undeletedCommentCount).toBe(0);
    },
  );

  test.concurrent("should calculate statistics correctly", async () => {
    const userId = await createUser({
      email: `testuser-${uuidv4()}@example.com`,
      hashedPassword: "hashedpassword",
      name: "Test User",
    });

    const anotherUserId = await createUser({
      email: `anotheruser-${uuidv4()}@example.com`,
      hashedPassword: "hashedpassword",
      name: "Another User",
    });

    // Create two game templates
    const template1Id = await createGameTemplate({
      userId,
      newGameTemplateData: {
        name: "Template 1",
        imageUrl: getFakeImageUrl(1),
        imageDescription: "Template 1 image",
        backstory: "This is template 1 backstory.",
        description: "Template 1 description",
        isPublic: true,
        firstSceneData: {
          event: "Public event",
          imageUrl: getFakeImageUrl(2),
          imageDescription: "Public image description",
          narration: "Public narration",
          proposedActions: [
            "Public action 1",
            "Public action 2",
            "Public action 3",
          ],
        },
      },
    });

    const template2Id = await createGameTemplate({
      userId,
      newGameTemplateData: {
        name: "Template 2",
        imageUrl: getFakeImageUrl(2),
        imageDescription: "Template 2 image",
        backstory: "This is template 2 backstory.",
        description: "Template 2 description",
        isPublic: true,
        firstSceneData: {
          event: "Public event",
          imageUrl: getFakeImageUrl(2),
          imageDescription: "Public image description",
          narration: "Public narration",
          proposedActions: [
            "Public action 1",
            "Public action 2",
            "Public action 3",
          ],
        },
      },
    });

    // Add and delete likes
    await addLike({ userId, gameTemplateId: template1Id });
    await addLike({ userId: anotherUserId, gameTemplateId: template1Id });
    await deleteLike({ userId: anotherUserId, gameTemplateId: template1Id });

    await addLike({ userId, gameTemplateId: template2Id });
    await addLike({ userId: anotherUserId, gameTemplateId: template2Id });

    // Add and delete comments
    await addComment({
      userId,
      gameTemplateId: template1Id,
      text: "Comment 1",
    });
    const comment2Id = await addComment({
      userId: anotherUserId,
      gameTemplateId: template1Id,
      text: "Comment 2",
    });

    await deleteComment({ userId: anotherUserId, commentId: comment2Id });

    await addComment({
      userId,
      gameTemplateId: template2Id,
      text: "Comment 3",
    });
    await addComment({
      userId: anotherUserId,
      gameTemplateId: template2Id,
      text: "Comment 4",
    });

    const sampleProposedActions = ["action 1", "action 2", "action 3"];

    // TODO: create enoungh sample images for this
    // Create game sessions and add scenes (actions)
    const session1Id = await createGameSession({
      userId,
      name: "Session 1",
      backstory: "Session 1 backstory",
      description: "Session 1 description",
      imageUrl: getFakeImageUrl(3),
      imageDescription: "Session 1 image",
      parentGameTemplateId: template1Id,
      initialSceneData: {
        imageUrl: getFakeImageUrl(4),
        imageDescription: "Scene 1 image",
        narration: "You are in a dark forest.",
        event: "Initial scene event 1",
        proposedActions: sampleProposedActions,
      },
    });

    await addSceneToSession({
      userId,
      sessionId: session1Id,
      previousAction: "Go north",
      newSceneData: {
        imageUrl: getFakeImageUrl(5),
        imageDescription: "Scene 2 image",
        narration: "You arrive at a clearing.",
        event: "Initial scene event 2",
        proposedActions: sampleProposedActions,
      },
    });

    const session2Id = await createGameSession({
      userId,
      name: "Session 2",
      backstory: "Session 2 backstory",
      description: "Session 2 description",
      imageUrl: getFakeImageUrl(6),
      imageDescription: "Session 2 image",
      parentGameTemplateId: template2Id,
      initialSceneData: {
        imageUrl: getFakeImageUrl(7),
        imageDescription: "Scene 3 image",
        narration: "You are in a dark forest.",
        event: "Initial scene event 3",
        proposedActions: sampleProposedActions,
      },
    });

    await addSceneToSession({
      userId,
      sessionId: session2Id,
      previousAction: "Go east",
      newSceneData: {
        imageUrl: getFakeImageUrl(8),
        imageDescription: "Scene 4 image",
        narration: "You see a river.",
        event: "Initial scene event 4",
        proposedActions: sampleProposedActions,
      },
    });

    await addSceneToSession({
      userId,
      sessionId: session2Id,
      previousAction: "Cross the river",
      newSceneData: {
        imageUrl: getFakeImageUrl(9),
        imageDescription: "Scene 5 image",
        narration: "You reach the other side.",
        event: "Initial scene event 5",
        proposedActions: sampleProposedActions,
      },
    });

    // Get and validate statistics for template 1
    const statistics1 = await getGameTemplateStatistics({
      gameTemplateId: template1Id,
    });

    expect(statistics1).toEqual({
      id: template1Id,
      undeletedLikeCount: 1,
      historicalLikeCount: 2,
      undeletedCommentCount: 1,
      historicalCommentCount: 2,
      childSessionsCount: 1,
      childSessionsUserActionsCount: 1, // 2 scenes - 1
      visitCount: 0, // Assuming no visits for simplicity
      trendingPushCount: 0, // Assuming no trending pushes for simplicity
    });

    // Get and validate statistics for template 2
    const statistics2 = await getGameTemplateStatistics({
      gameTemplateId: template2Id,
    });

    expect(statistics2).toEqual({
      id: template2Id,
      undeletedLikeCount: 2,
      historicalLikeCount: 2,
      undeletedCommentCount: 2,
      historicalCommentCount: 2,
      childSessionsCount: 1,
      childSessionsUserActionsCount: 2, // 3 scenes - 1
      visitCount: 0, // Assuming no visits for simplicity
      trendingPushCount: 0, // Assuming no trending pushes for simplicity
    });
  });

  // This test must be invoked separately from other because it depends on the global state
  test.skip("should correctly recommend game templates based on the exclusion and score rules", async () => {
    // Generate unique emails using UUID
    const user1Email = `user1-${uuidv4()}@example.com`;
    const user2Email = `user2-${uuidv4()}@example.com`;
    const user3Email = `user3-${uuidv4()}@example.com`;
    const user4Email = `user4-${uuidv4()}@example.com`;
    const user5Email = `user5-${uuidv4()}@example.com`;

    // Create multiple users
    const user1Id = await createUser({
      email: user1Email,
      hashedPassword: "hashedpassword",
      name: "User 1",
    });
    const user2Id = await createUser({
      email: user2Email,
      hashedPassword: "hashedpassword",
      name: "User 2",
    });
    const user3Id = await createUser({
      email: user3Email,
      hashedPassword: "hashedpassword",
      name: "User 3",
    });
    const user4Id = await createUser({
      email: user4Email,
      hashedPassword: "hashedpassword",
      name: "User 4",
    });
    const user5Id = await createUser({
      email: user5Email,
      hashedPassword: "hashedpassword",
      name: "User 5",
    });

    // Template data
    const templateData = {
      imageUrl: getFakeImageUrl(0),
      imageDescription: "Description",
      backstory: "Backstory",
      description: "Description",
      isPublic: true,
      firstSceneData: {
        event: "Public event",
        imageUrl: getFakeImageUrl(2),
        imageDescription: "Public image description",
        narration: "Public narration",
        proposedActions: [
          "Public action 1",
          "Public action 2",
          "Public action 3",
        ],
      },
    };

    // Create multiple game templates for user1
    const template1Id = await createGameTemplate({
      userId: user3Id,
      newGameTemplateData: {
        ...templateData,
        name: "Template 1",
      },
    });

    const template2Id = await createGameTemplate({
      userId: user3Id,
      newGameTemplateData: {
        ...templateData,
        name: "Template 2",
      },
    });

    const template3Id = await createGameTemplate({
      userId: user3Id,
      newGameTemplateData: {
        ...templateData,
        name: "Template 3",
      },
    });

    const template4Id = await createGameTemplate({
      userId: user3Id,
      newGameTemplateData: {
        ...templateData,
        name: "Template 4",
      },
    });

    // Create a private template for user1
    await createGameTemplate({
      userId: user1Id,
      newGameTemplateData: {
        ...templateData,
        name: "Private Template",
        isPublic: false,
      },
    });

    await createGameTemplate({
      userId: user2Id,
      newGameTemplateData: {
        ...templateData,
        name: "Private Template",
        isPublic: false,
      },
    });

    await createGameTemplate({
      userId: user3Id,
      newGameTemplateData: {
        ...templateData,
        name: "Private Template",
        isPublic: false,
      },
    });

    const sampleProposedActions = ["action 1", "action 2", "action 3"];

    const session2Id = await createGameSession({
      userId: user4Id,
      name: "Template 2 derived session",
      backstory: "Backstory",
      description: "Description",
      imageUrl: getFakeImageUrl(0),
      imageDescription: "Image description",
      parentGameTemplateId: template2Id,
      initialSceneData: {
        imageUrl: getFakeImageUrl(1),
        imageDescription: "Scene 1 image",
        narration: "You are in a dark forest.",
        event: "Initial scene event 1",
        proposedActions: sampleProposedActions,
      },
    });

    await createGameSession({
      userId: user4Id,
      name: "Template 2 derived session",
      backstory: "Backstory",
      description: "Description",
      imageUrl: getFakeImageUrl(0),
      imageDescription: "Image description",
      parentGameTemplateId: template2Id,
      initialSceneData: {
        imageUrl: getFakeImageUrl(1),
        imageDescription: "Scene 1 image",
        narration: "You are in a dark forest.",
        event: "Initial scene event 2",
        proposedActions: sampleProposedActions,
      },
    });

    await addSceneToSession({
      userId: user4Id,
      sessionId: session2Id,
      previousAction: "Go north",
      newSceneData: {
        imageUrl: getFakeImageUrl(2),
        imageDescription: "Scene 2 image",
        narration: "You arrive at a clearing.",
        event: "Next scene event",
        proposedActions: sampleProposedActions,
      },
    });

    // Simulate visits and pushes by creating records in relevant tables
    await prisma.gameTemplateVisit.createMany({
      data: [
        { userId: user2Id, gameTemplateId: template1Id },
        { userId: user1Id, gameTemplateId: template2Id }, // Just a different visit record
      ],
    });

    await prisma.gameTemplatePush.createMany({
      data: [
        { userId: user1Id, gameTemplateId: template1Id },
        { userId: user2Id, gameTemplateId: template2Id }, // Pushed to user2
        { userId: user2Id, gameTemplateId: template3Id }, // Pushed to user2
      ],
    });

    // User2 likes and comments on template 1 and 2
    await addLike({ userId: user2Id, gameTemplateId: template1Id });
    await addLike({ userId: user2Id, gameTemplateId: template2Id });
    await addLike({ userId: user1Id, gameTemplateId: template4Id });
    await addComment({
      userId: user2Id,
      gameTemplateId: template1Id,
      text: "Great template!",
    });
    await addComment({
      userId: user2Id,
      gameTemplateId: template2Id,
      text: "Nice work!",
    });

    // Expected exclusions
    // User 1: Template 2 (visited), template 4 (liked)
    // User 2: template 1 (visited), template 2 (liked)
    // User 3: Everything (owned)
    // User 4: Template 2 (derived session)
    // User 5: Nothing

    // Scores:
    // Template 1: 1 visit, 1 like, 1 comment, 1 push, score = 16
    // Template 2: 1 visit, 1 like, 1 comment, 1 push, 2 child sessions, 1 action, score = 17
    // Template 3: 1 push, score = 10
    // Template 4: 1 like, score = 22

    // Expected recommendations:
    // User 1: Template 1 then 3 (more visits/likes/comments first)
    // User 2: Template 4 then 3 (fewer pushes first)
    // User 3: Nothing
    // User 4: Template 4 then 1 then 3
    // User 5: Template 4, 2, 1 (truncating template 3)

    // Test the recommendation system
    const user1RecommendedTemplates = await getRecommendedGameTemplates({
      userId: user1Id,
      limit: 3,
    });
    const user2RecommendedTemplates = await getRecommendedGameTemplates({
      userId: user2Id,
      limit: 3,
    });
    const user3RecommendedTemplates = await getRecommendedGameTemplates({
      userId: user3Id,
      limit: 3,
    });
    const user4RecommendedTemplates = await getRecommendedGameTemplates({
      userId: user4Id,
      limit: 3,
    });
    const user5RecommendedTemplates = await getRecommendedGameTemplates({
      userId: user5Id,
      limit: 3,
    });

    const expectedTemplate1 = {
      id: template1Id,
      name: "Template 1",
      isPublic: true,
      description: "Description",
      backstory: "Backstory",
      imageUrl: expect.any(String),
      imageDescription: "Description",
      isLiked: false,
      likes: 1,
      comments: 1,
      childSessionCount: 0,
      visitCount: 1,
      score: 16,
    };

    const expectedTemplate2 = {
      id: template2Id,
      name: "Template 2",
      isPublic: true,
      description: "Description",
      backstory: "Backstory",
      imageUrl: expect.any(String),
      imageDescription: "Description",
      isLiked: false,
      likes: 1,
      comments: 1,
      childSessionCount: 2,
      visitCount: 1,
      score: 17,
    };

    // Expected template data for the results
    const expectedTemplate3 = {
      id: template3Id,
      name: "Template 3",
      isPublic: true,
      description: "Description",
      backstory: "Backstory",
      imageUrl: expect.any(String),
      imageDescription: "Description",
      isLiked: false,
      likes: 0,
      comments: 0,
      childSessionCount: 0,
      visitCount: 0,
      score: 10,
    };

    const expectedTemplate4 = {
      id: template4Id,
      name: "Template 4",
      isPublic: true,
      description: "Description",
      backstory: "Backstory",
      imageUrl: expect.any(String),
      imageDescription: "Description",
      isLiked: false,
      likes: 1,
      comments: 0,
      childSessionCount: 0,
      visitCount: 0,
      score: 22,
    };

    // Validate the results
    expect(user1RecommendedTemplates).toEqual([
      { ...anyStatistics, ...expectedTemplate1 },
      { ...anyStatistics, ...expectedTemplate3 },
      expect.anything(),
    ]);
    expect([template2Id, template4Id]).toContainEqual(
      user1RecommendedTemplates[2].id,
    );
    expect(user2RecommendedTemplates).toEqual([
      { ...anyStatistics, ...expectedTemplate4 },
      { ...anyStatistics, ...expectedTemplate3 },
      expect.anything(),
    ]);
    expect([template1Id, template2Id]).toContainEqual(
      user2RecommendedTemplates[2].id,
    );
    expect(user3RecommendedTemplates).toEqual([
      expect.anything(),
      expect.anything(),
      expect.anything(),
    ]);
    expect(user4RecommendedTemplates).toEqual([
      { ...anyStatistics, ...expectedTemplate4 },
      { ...anyStatistics, ...expectedTemplate1 },
      { ...anyStatistics, ...expectedTemplate3 },
    ]);
    expect(user5RecommendedTemplates).toEqual([
      { ...anyStatistics, ...expectedTemplate4 },
      { ...anyStatistics, ...expectedTemplate2 },
      { ...anyStatistics, ...expectedTemplate1 },
    ]);
  });

  test.concurrent(
    "should mark a game template as visited and update statistics",
    async () => {
      const userId = await createUser({
        email: `testuser-${uuidv4()}@example.com`,
        hashedPassword: "hashedpassword",
        name: "Test User",
      });

      const templateId = await createGameTemplate({
        userId,
        newGameTemplateData: {
          ...testGameTemplateData,
          isPublic: true,
        },
      });

      // Get initial statistics
      const initialStatistics = await getGameTemplateStatistics({
        gameTemplateId: templateId,
      });
      const initialVisitCount = initialStatistics.visitCount;

      // Mark the template as visited
      await markGameTemplateAsVisited({ userId, gameTemplateId: templateId });

      // Get updated statistics
      const updatedStatistics = await getGameTemplateStatistics({
        gameTemplateId: templateId,
      });
      const updatedVisitCount = updatedStatistics.visitCount;

      expect(updatedVisitCount).toBe(initialVisitCount + 1);

      // Try marking the same template as visited again
      await markGameTemplateAsVisited({ userId, gameTemplateId: templateId });

      // Get final statistics
      const finalStatistics = await getGameTemplateStatistics({
        gameTemplateId: templateId,
      });
      const finalVisitCount = finalStatistics.visitCount;

      // The visit count should not increase because it's the same user visiting the same template
      expect(finalVisitCount).toBe(updatedVisitCount);
    },
  );

  test.concurrent(
    "should mark a game template as recommended and update statistics",
    async () => {
      const userId = await createUser({
        email: `testuser-${uuidv4()}@example.com`,
        hashedPassword: "hashedpassword",
        name: "Test User",
      });

      const templateId = await createGameTemplate({
        userId,
        newGameTemplateData: {
          ...testGameTemplateData,
          isPublic: true,
        },
      });

      // Get initial statistics
      const initialStatistics = await getGameTemplateStatistics({
        gameTemplateId: templateId,
      });
      const initialPushCount = initialStatistics.trendingPushCount;

      // Mark the template as recommended
      await markGameTemplateAsRecommended({
        userId,
        gameTemplateId: templateId,
      });

      // Get updated statistics
      const updatedStatistics = await getGameTemplateStatistics({
        gameTemplateId: templateId,
      });
      const updatedPushCount = updatedStatistics.trendingPushCount;

      expect(updatedPushCount).toBe(initialPushCount + 1);

      // Try marking the same template as recommended again
      await markGameTemplateAsRecommended({
        userId,
        gameTemplateId: templateId,
      });

      // Get final statistics
      const finalStatistics = await getGameTemplateStatistics({
        gameTemplateId: templateId,
      });
      const finalPushCount = finalStatistics.trendingPushCount;

      // The push count should not increase because it's the same user recommending the same template
      expect(finalPushCount).toBe(updatedPushCount);
    },
  );
});
