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
  getGameTemplateMetadata,
  getGameTemplatesByUser,
  getGameTemplateStatistics,
  getRecommendedGameTemplates,
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
  test.concurrent(
    "should create and delete a game template with valid data",
    async () => {
      const userId = await createUser(
        `testuser-${uuidv4()}@example.com`,
        "hashedpassword",
        "Test User",
      );

      const newGameTemplateData = {
        name: "Test Template",
        imageUrl: getFakeImageUrl(1),
        imageDescription: "Template image",
        backStory: "This is a test backstory.",
        description: "A test template",
        isPublic: true,
      };

      const templateId = await createGameTemplate(userId, newGameTemplateData);

      expect(templateId).toBeGreaterThan(0);

      // Retrieve the template
      const template = await getGameTemplateMetadata(userId, templateId);

      expect(template).toEqual({
        name: newGameTemplateData.name,
        backstory: newGameTemplateData.backStory,
        description: newGameTemplateData.description,
        imageDescription: newGameTemplateData.imageDescription,
        imageUrl: expect.any(String),
        commentCount: 0,
        isLiked: false,
        likeCount: 0,
      });

      await deleteGameTemplate(userId, templateId);

      await expect(
        getGameTemplateMetadata(userId, templateId),
      ).rejects.toThrowError(DatabaseError);

      try {
        await getGameTemplateMetadata(userId, templateId);
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
      const userId = await createUser(
        `testuser-${uuidv4()}@example.com`,
        "hashedpassword",
        "Test User",
      );
      const otherUserId = await createUser(
        `otheruser-${uuidv4()}@example.com`,
        "hashedpassword",
        "Other User",
      );

      const newPublicGameTemplateData = {
        name: "Public Test Template",
        imageUrl: getFakeImageUrl(1),
        imageDescription: "Public Template image",
        backStory: "Public This is a test backstory.",
        description: "Public A test template",
        isPublic: true,
      };

      const newPrivateGameTemplateData = {
        name: "Private Test Template",
        imageUrl: getFakeImageUrl(1),
        imageDescription: "Private Template image",
        backStory: "Private This is a test backstory.",
        description: "Private A test template",
        isPublic: false,
      };

      const publicTemplateId = await createGameTemplate(
        userId,
        newPublicGameTemplateData,
      );
      const privateTemplateId = await createGameTemplate(
        userId,
        newPrivateGameTemplateData,
      );

      expect(await getGameTemplateMetadata(userId, publicTemplateId)).toEqual({
        name: newPublicGameTemplateData.name,
        backstory: newPublicGameTemplateData.backStory,
        description: newPublicGameTemplateData.description,
        imageDescription: newPublicGameTemplateData.imageDescription,
        imageUrl: expect.any(String),
        commentCount: 0,
        isLiked: false,
        likeCount: 0,
      });

      expect(
        await getGameTemplateMetadata(otherUserId, publicTemplateId),
      ).toEqual({
        name: newPublicGameTemplateData.name,
        backstory: newPublicGameTemplateData.backStory,
        description: newPublicGameTemplateData.description,
        imageDescription: newPublicGameTemplateData.imageDescription,
        imageUrl: expect.any(String),
        commentCount: 0,
        isLiked: false,
        likeCount: 0,
      });

      expect(await getGameTemplateMetadata(userId, privateTemplateId)).toEqual({
        name: newPrivateGameTemplateData.name,
        backstory: newPrivateGameTemplateData.backStory,
        description: newPrivateGameTemplateData.description,
        imageDescription: newPrivateGameTemplateData.imageDescription,
        imageUrl: expect.any(String),
        commentCount: 0,
        isLiked: false,
        likeCount: 0,
      });

      await expect(
        getGameTemplateMetadata(otherUserId, privateTemplateId),
      ).rejects.toThrowError(DatabaseError);

      try {
        await getGameTemplateMetadata(otherUserId, privateTemplateId);
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        const dbError = error as DatabaseError;

        expect(dbError.type).toBe(DatabaseErrorType.NotFound);
        expect(dbError.message).toBe(
          "Game template not found under user or not public",
        );
      }

      await expect(
        deleteGameTemplate(otherUserId, publicTemplateId),
      ).rejects.toThrowError(DatabaseError);

      try {
        await deleteGameTemplate(otherUserId, publicTemplateId);
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        const dbError = error as DatabaseError;

        expect(dbError.type).toBe(DatabaseErrorType.Unauthorized);
        expect(dbError.message).toBe("User does not own the game template");
      }

      try {
        await deleteGameTemplate(otherUserId, privateTemplateId);
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        const dbError = error as DatabaseError;

        expect(dbError.type).toBe(DatabaseErrorType.Unauthorized);
        expect(dbError.message).toBe("User does not own the game template");
      }

      // check that game template is still accessible
      expect(await getGameTemplateMetadata(userId, publicTemplateId)).toEqual({
        name: newPublicGameTemplateData.name,
        backstory: newPublicGameTemplateData.backStory,
        description: newPublicGameTemplateData.description,
        imageDescription: newPublicGameTemplateData.imageDescription,
        imageUrl: expect.any(String),
        commentCount: 0,
        isLiked: false,
        likeCount: 0,
      });

      expect(
        await getGameTemplateMetadata(otherUserId, publicTemplateId),
      ).toEqual({
        name: newPublicGameTemplateData.name,
        backstory: newPublicGameTemplateData.backStory,
        description: newPublicGameTemplateData.description,
        imageDescription: newPublicGameTemplateData.imageDescription,
        imageUrl: expect.any(String),
        commentCount: 0,
        isLiked: false,
        likeCount: 0,
      });

      expect(await getGameTemplateMetadata(userId, privateTemplateId)).toEqual({
        name: newPrivateGameTemplateData.name,
        backstory: newPrivateGameTemplateData.backStory,
        description: newPrivateGameTemplateData.description,
        imageDescription: newPrivateGameTemplateData.imageDescription,
        imageUrl: expect.any(String),
        commentCount: 0,
        isLiked: false,
        likeCount: 0,
      });

      // remove the templates
      await deleteGameTemplate(userId, publicTemplateId);
      await deleteGameTemplate(userId, privateTemplateId);

      await expect(
        getGameTemplateMetadata(userId, publicTemplateId),
      ).rejects.toThrowError(DatabaseError);

      try {
        await getGameTemplateMetadata(userId, publicTemplateId);
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        const dbError = error as DatabaseError;

        expect(dbError.type).toBe(DatabaseErrorType.NotFound);
        expect(dbError.message).toBe(
          "Game template not found under user or not public",
        );
      }

      await expect(
        getGameTemplateMetadata(userId, privateTemplateId),
      ).rejects.toThrowError(DatabaseError);
      try {
        await getGameTemplateMetadata(userId, privateTemplateId);
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

      const newGameTemplateData = {
        name: "Test Template",
        imageUrl: getFakeImageUrl(1),
        imageDescription: "Template image",
        backStory: "This is a test backstory.",
        description: "A test template",
        isPublic: true,
      };

      await expect(
        createGameTemplate(invalidUserId, newGameTemplateData),
      ).rejects.toThrowError(DatabaseError);

      try {
        await createGameTemplate(invalidUserId, newGameTemplateData);
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

      expect(await getGameTemplateLikeCount(templateId)).toBe(0);
      await addLike(userId, templateId);
      expect(await getGameTemplateLikeCount(templateId)).toBe(1);

      await expect(addLike(userId, templateId)).rejects.toThrow(DatabaseError);
      try {
        await addLike(userId, templateId);
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        const dbError = error as DatabaseError;

        expect(dbError.type).toBe(DatabaseErrorType.Conflict);
        expect(dbError.message).toBe(
          "User has already liked this game template",
        );
      }

      expect(await getGameTemplateLikeCount(templateId)).toBe(1);

      await deleteLike(userId, templateId);
      expect(await getGameTemplateLikeCount(templateId)).toBe(0);

      await expect(deleteLike(userId, templateId)).rejects.toThrow(
        DatabaseError,
      );
      try {
        await deleteLike(userId, templateId);
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        const dbError = error as DatabaseError;

        expect(dbError.type).toBe(DatabaseErrorType.NotFound);
        expect(dbError.message).toBe("Like not found");
      }

      // do `addLike` and `deleteLike` a second time to test the behavior of soft deletion
      await addLike(userId, templateId);
      expect(await getGameTemplateLikeCount(templateId)).toBe(1);
      await deleteLike(userId, templateId);
      expect(await getGameTemplateLikeCount(templateId)).toBe(0);
    },
  );

  test.concurrent(
    "should throw Conflict error when adding a like that already exists",
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

      await addLike(userId, templateId);

      await expect(addLike(userId, templateId)).rejects.toThrowError(
        DatabaseError,
      );

      try {
        await addLike(userId, templateId);
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

    const commentText = "This is a test comment";

    await addComment(userId, templateId, commentText);

    // Retrieve comments
    const comments = await getComments(userId, templateId);

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

    await deleteComment(userId, comment.id);

    const newComments = await getComments(userId, templateId);

    expect(newComments.length).toBe(0);
  });

  test.concurrent(
    "should get a public game template without comments",
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

      const template = await getGameTemplateMetadata(userId, templateId);

      expect(template).toEqual({
        name: "Test Template",
        backstory: "This is a test backstory.",
        description: "A test template",
        imageDescription: "Template image",
        imageUrl: expect.any(String),
        commentCount: 0,
        isLiked: false,
        likeCount: 0,
      });
    },
  );

  test.concurrent(
    "should retrieve game template metadata and count likes & comments correctly",
    async () => {
      const userId = await createUser(
        `testuser-${uuidv4()}@example.com`,
        "hashedpassword",
        "Test User",
      );

      const anotherUserId = await createUser(
        `anotheruser-${uuidv4()}@example.com`,
        "hashedpassword",
        "Another User",
      );

      // create a public template
      const publicTemplateId = await createGameTemplate(userId, {
        name: "Public Test Template",
        imageUrl: getFakeImageUrl(1),
        imageDescription: "Public Template image",
        backStory: "This is a public test backstory.",
        description: "A public test template",
        isPublic: true,
      });

      // create another public template
      const publicTemplateId2 = await createGameTemplate(userId, {
        name: "Public Test Template 2",
        imageUrl: getFakeImageUrl(1),
        imageDescription: "Public Template image 2",
        backStory: "This is a public test backstory 2.",
        description: "A public test template 2",
        isPublic: true,
      });

      // create a private template
      const privateTemplateId = await createGameTemplate(userId, {
        name: "Private Test Template",
        imageUrl: getFakeImageUrl(1),
        imageDescription: "Private Template image",
        backStory: "This is a private test backstory.",
        description: "A private test template",
        isPublic: false,
      });

      // like the first public template
      await addLike(userId, publicTemplateId);

      // like the second public template then delete it
      await addLike(userId, publicTemplateId2);
      await addLike(anotherUserId, publicTemplateId2);
      await deleteLike(userId, publicTemplateId2);
      await deleteLike(anotherUserId, publicTemplateId2);

      // add a comment to the second public template
      const commentText = "This is a test comment";

      await addComment(userId, publicTemplateId2, commentText);

      const commentId = await addComment(
        anotherUserId,
        publicTemplateId2,
        commentText,
      );

      await deleteComment(anotherUserId, commentId);

      // retrieve the metadata
      const templatesMetadata = await getGameTemplatesByUser(userId);

      // should be first public template, then second public template, then private template
      expect(templatesMetadata).toEqual([
        {
          id: publicTemplateId,
          name: "Public Test Template",
          isPublic: true,
          isLiked: true,
          likes: 1,
          comments: 0,
          description: "A public test template",
          backstory: "This is a public test backstory.",
          imageUrl: expect.any(String),
          imageDescription: "Public Template image",
        },
        {
          id: publicTemplateId2,
          name: "Public Test Template 2",
          isPublic: true,
          isLiked: false,
          likes: 0,
          comments: 1,
          description: "A public test template 2",
          backstory: "This is a public test backstory 2.",
          imageUrl: expect.any(String),
          imageDescription: "Public Template image 2",
        },
        {
          id: privateTemplateId,
          name: "Private Test Template",
          isPublic: false,
          isLiked: false,
          likes: 0,
          comments: 0,
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

      let metadata = await getGameTemplateMetadata(userId, templateId);

      expect(metadata.likeCount).toBe(0);
      expect(metadata.isLiked).toBe(false);
      expect(metadata.commentCount).toBe(0);

      await addLike(userId, templateId);
      metadata = await getGameTemplateMetadata(userId, templateId);
      expect(metadata.likeCount).toBe(1);
      expect(metadata.isLiked).toBe(true);
      expect(metadata.commentCount).toBe(0);

      await deleteLike(userId, templateId);
      metadata = await getGameTemplateMetadata(userId, templateId);
      expect(metadata.likeCount).toBe(0);
      expect(metadata.isLiked).toBe(false);
      expect(metadata.commentCount).toBe(0);

      await addLike(userId, templateId);
      metadata = await getGameTemplateMetadata(userId, templateId);
      expect(metadata.likeCount).toBe(1);
      expect(metadata.isLiked).toBe(true);
      expect(metadata.commentCount).toBe(0);

      const commentId = await addComment(userId, templateId, "Test comment");

      metadata = await getGameTemplateMetadata(userId, templateId);
      expect(metadata.likeCount).toBe(1);
      expect(metadata.isLiked).toBe(true);
      expect(metadata.commentCount).toBe(1);

      await deleteComment(userId, commentId);
      metadata = await getGameTemplateMetadata(userId, templateId);
      expect(metadata.likeCount).toBe(1);
      expect(metadata.isLiked).toBe(true);
      expect(metadata.commentCount).toBe(0);
    },
  );

  test.concurrent("should calculate statistics correctly", async () => {
    const userId = await createUser(
      `testuser-${uuidv4()}@example.com`,
      "hashedpassword",
      "Test User",
    );

    const anotherUserId = await createUser(
      `anotheruser-${uuidv4()}@example.com`,
      "hashedpassword",
      "Another User",
    );

    // Create two game templates
    const template1Id = await createGameTemplate(userId, {
      name: "Template 1",
      imageUrl: getFakeImageUrl(1),
      imageDescription: "Template 1 image",
      backStory: "This is template 1 backstory.",
      description: "Template 1 description",
      isPublic: true,
    });

    const template2Id = await createGameTemplate(userId, {
      name: "Template 2",
      imageUrl: getFakeImageUrl(2),
      imageDescription: "Template 2 image",
      backStory: "This is template 2 backstory.",
      description: "Template 2 description",
      isPublic: true,
    });

    // Add and delete likes
    await addLike(userId, template1Id);
    await addLike(anotherUserId, template1Id);
    await deleteLike(anotherUserId, template1Id);

    await addLike(userId, template2Id);
    await addLike(anotherUserId, template2Id);

    // Add and delete comments
    const comment1Id = await addComment(userId, template1Id, "Comment 1");
    const comment2Id = await addComment(
      anotherUserId,
      template1Id,
      "Comment 2",
    );

    await deleteComment(anotherUserId, comment2Id);

    await addComment(userId, template2Id, "Comment 3");
    await addComment(anotherUserId, template2Id, "Comment 4");

    // Create game sessions and add scenes (actions)
    const session1Id = await createGameSession(
      userId,
      "Session 1",
      "Session 1 backstory",
      "Session 1 description",
      getFakeImageUrl(3),
      "Session 1 image",
      template1Id,
      {
        imageUrl: getFakeImageUrl(4),
        imageDescription: "Scene 1 image",
        narration: "You are in a dark forest.",
      },
    );

    await addSceneToSession(userId, session1Id, "Go north", {
      imageUrl: getFakeImageUrl(5),
      imageDescription: "Scene 2 image",
      narration: "You arrive at a clearing.",
    });

    const session2Id = await createGameSession(
      userId,
      "Session 2",
      "Session 2 backstory",
      "Session 2 description",
      getFakeImageUrl(6),
      "Session 2 image",
      template2Id,
      {
        imageUrl: getFakeImageUrl(7),
        imageDescription: "Scene 3 image",
        narration: "You are in a dark forest.",
      },
    );

    await addSceneToSession(userId, session2Id, "Go east", {
      imageUrl: getFakeImageUrl(8),
      imageDescription: "Scene 4 image",
      narration: "You see a river.",
    });

    await addSceneToSession(userId, session2Id, "Cross the river", {
      imageUrl: getFakeImageUrl(9),
      imageDescription: "Scene 5 image",
      narration: "You reach the other side.",
    });

    // Get and validate statistics for template 1
    const statistics1 = await getGameTemplateStatistics(template1Id);

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
    const statistics2 = await getGameTemplateStatistics(template2Id);

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
    const user1Id = await createUser(user1Email, "hashedpassword", "User 1");
    const user2Id = await createUser(user2Email, "hashedpassword", "User 2");
    const user3Id = await createUser(user3Email, "hashedpassword", "User 3");
    const user4Id = await createUser(user4Email, "hashedpassword", "User 4");
    const user5Id = await createUser(user5Email, "hashedpassword", "User 5");

    // Template data
    const templateData = {
      imageUrl: getFakeImageUrl(0),
      imageDescription: "Description",
      backStory: "Backstory",
      description: "Description",
      isPublic: true,
    };

    // Create multiple game templates for user1
    const template1Id = await createGameTemplate(user3Id, {
      ...templateData,
      name: "Template 1",
    });

    const template2Id = await createGameTemplate(user3Id, {
      ...templateData,
      name: "Template 2",
    });

    const template3Id = await createGameTemplate(user3Id, {
      ...templateData,
      name: "Template 3",
    });

    const template4Id = await createGameTemplate(user3Id, {
      ...templateData,
      name: "Template 4",
    });

    // Create a private template for user1
    await createGameTemplate(user1Id, {
      ...templateData,
      name: "Private Template",
      isPublic: false,
    });

    await createGameTemplate(user2Id, {
      ...templateData,
      name: "Private Template",
      isPublic: false,
    });

    await createGameTemplate(user3Id, {
      ...templateData,
      name: "Private Template",
      isPublic: false,
    });

    const session2Id = await createGameSession(
      user4Id,
      "Template 2 derived session",
      "Backstory",
      "Description",
      getFakeImageUrl(0),
      "Image description",
      template2Id,
      {
        imageUrl: getFakeImageUrl(1),
        imageDescription: "Scene 1 image",
        narration: "You are in a dark forest.",
      },
    );

    const anotherSession2Id = await createGameSession(
      user4Id,
      "Template 2 derived session",
      "Backstory",
      "Description",
      getFakeImageUrl(0),
      "Image description",
      template2Id,
      {
        imageUrl: getFakeImageUrl(1),
        imageDescription: "Scene 1 image",
        narration: "You are in a dark forest.",
      },
    );

    await addSceneToSession(user4Id, session2Id, "Go north", {
      imageUrl: getFakeImageUrl(2),
      imageDescription: "Scene 2 image",
      narration: "You arrive at a clearing.",
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
    await addLike(user2Id, template1Id);
    await addLike(user2Id, template2Id);
    await addLike(user1Id, template4Id);
    await addComment(user2Id, template1Id, "Great template!");
    await addComment(user2Id, template2Id, "Nice work!");

    // Expected exclusions
    // User 1: Template 2 (visited), template 4 (liked)
    // User 2: template 1 (visited), template 2 (liked)
    // User 3: Everything (owned)
    // User 4: Template 2 (derived session)
    // User 5: Nothing

    // Scores:
    // Template 1: 1 visit, 1 like, 1 comment, 1 push, score = 16
    // Template 2: 1 visit, 1 like, 1 comment, 1 push, 1 action, score = 17
    // Template 3: 1 push, score = 10
    // Template 4: 1 like, score = 22

    // Expected recommendations:
    // User 1: Template 1 then 3 (more visits/likes/comments first)
    // User 2: Template 4 then 3 (fewer pushes first)
    // User 3: Nothing
    // User 4: Template 4 then 1 then 3
    // User 5: Template 4, 2, 1 (truncating template 3)

    // Test the recommendation system
    const user1RecommendedTemplates = await getRecommendedGameTemplates(
      user1Id,
      3,
    );
    const user2RecommendedTemplates = await getRecommendedGameTemplates(
      user2Id,
      3,
    );
    const user3RecommendedTemplates = await getRecommendedGameTemplates(
      user3Id,
      3,
    );
    const user4RecommendedTemplates = await getRecommendedGameTemplates(
      user4Id,
      3,
    );
    const user5RecommendedTemplates = await getRecommendedGameTemplates(
      user5Id,
      3,
    );

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
      score: 22,
    };

    // Validate the results
    expect(user1RecommendedTemplates).toEqual([
      expectedTemplate1,
      expectedTemplate3,
      expect.anything(),
    ]);
    expect([template2Id, template4Id]).toContainEqual(
      user1RecommendedTemplates[2].id,
    );
    expect(user2RecommendedTemplates).toEqual([
      expectedTemplate4,
      expectedTemplate3,
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
      expectedTemplate4,
      expectedTemplate1,
      expectedTemplate3,
    ]);
    expect(user5RecommendedTemplates).toEqual([
      expectedTemplate4,
      expectedTemplate2,
      expectedTemplate1,
    ]);
  });
});
