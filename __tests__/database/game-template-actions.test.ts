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

import { createUser } from "@/app/lib/data/database-actions/user-actions";
import {
  createGameTemplate,
  deleteGameTemplate,
  getGameTemplateLikeCount,
  addLike,
  deleteLike,
  addComment,
  deleteComment,
  getComments,
  getGameTemplateNoComments,
} from "@/app/lib/data/database-actions/game-template-actions";
import {
  DatabaseError,
  DatabaseErrorType,
} from "@/app/lib/data/database-actions/error-types";

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
      const template = await getGameTemplateNoComments(userId, templateId);

      expect(template).toEqual({
        name: newGameTemplateData.name,
        backstory: newGameTemplateData.backStory,
        description: newGameTemplateData.description,
        imageUrl: expect.any(String),
      });

      await deleteGameTemplate(userId, templateId);

      await expect(
        getGameTemplateNoComments(userId, templateId),
      ).rejects.toThrowError(DatabaseError);

      try {
        await getGameTemplateNoComments(userId, templateId);
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

      expect(await getGameTemplateNoComments(userId, publicTemplateId)).toEqual(
        {
          name: newPublicGameTemplateData.name,
          backstory: newPublicGameTemplateData.backStory,
          description: newPublicGameTemplateData.description,
          imageUrl: expect.any(String),
        },
      );

      expect(
        await getGameTemplateNoComments(otherUserId, publicTemplateId),
      ).toEqual({
        name: newPublicGameTemplateData.name,
        backstory: newPublicGameTemplateData.backStory,
        description: newPublicGameTemplateData.description,
        imageUrl: expect.any(String),
      });

      expect(
        await getGameTemplateNoComments(userId, privateTemplateId),
      ).toEqual({
        name: newPrivateGameTemplateData.name,
        backstory: newPrivateGameTemplateData.backStory,
        description: newPrivateGameTemplateData.description,
        imageUrl: expect.any(String),
      });

      await expect(
        getGameTemplateNoComments(otherUserId, privateTemplateId),
      ).rejects.toThrowError(DatabaseError);

      try {
        await getGameTemplateNoComments(otherUserId, privateTemplateId);
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
      expect(await getGameTemplateNoComments(userId, publicTemplateId)).toEqual(
        {
          name: newPublicGameTemplateData.name,
          backstory: newPublicGameTemplateData.backStory,
          description: newPublicGameTemplateData.description,
          imageUrl: expect.any(String),
        },
      );

      expect(
        await getGameTemplateNoComments(otherUserId, publicTemplateId),
      ).toEqual({
        name: newPublicGameTemplateData.name,
        backstory: newPublicGameTemplateData.backStory,
        description: newPublicGameTemplateData.description,
        imageUrl: expect.any(String),
      });

      expect(
        await getGameTemplateNoComments(userId, privateTemplateId),
      ).toEqual({
        name: newPrivateGameTemplateData.name,
        backstory: newPrivateGameTemplateData.backStory,
        description: newPrivateGameTemplateData.description,
        imageUrl: expect.any(String),
      });

      // remove the templates
      await deleteGameTemplate(userId, publicTemplateId);
      await deleteGameTemplate(userId, privateTemplateId);

      await expect(
        getGameTemplateNoComments(userId, publicTemplateId),
      ).rejects.toThrowError(DatabaseError);

      try {
        await getGameTemplateNoComments(userId, publicTemplateId);
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        const dbError = error as DatabaseError;

        expect(dbError.type).toBe(DatabaseErrorType.NotFound);
        expect(dbError.message).toBe(
          "Game template not found under user or not public",
        );
      }

      await expect(
        getGameTemplateNoComments(userId, privateTemplateId),
      ).rejects.toThrowError(DatabaseError);
      try {
        await getGameTemplateNoComments(userId, privateTemplateId);
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
      await deleteLike(userId, templateId);
      expect(await getGameTemplateLikeCount(templateId)).toBe(0);
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

      const template = await getGameTemplateNoComments(userId, templateId);

      expect(template).toEqual({
        name: "Test Template",
        backstory: "This is a test backstory.",
        description: "A test template",
        imageUrl: expect.any(String),
      });
    },
  );
});
