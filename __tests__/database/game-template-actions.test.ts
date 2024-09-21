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
} from "@/app/lib/database-actions/game-template-actions";
import {
  DatabaseError,
  DatabaseErrorType,
} from "@/app/lib/database-actions/error-types";
import { addSceneToSession, createGameSession } from "@/app/lib/database-actions/game-session-actions";

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
    const comment2Id = await addComment(anotherUserId, template1Id, "Comment 2");
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
});
