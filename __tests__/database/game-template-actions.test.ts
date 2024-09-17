import { vi, describe, test, expect, beforeEach, afterAll } from 'vitest';

vi.mock("next/headers", () => ({
  cookies: () => ({
    getAll: async () => null,
    setAll: async (
      cookies: { name: string; value: string; options: any }[],
    ) => { },
  }),
}));

import { createUser } from '@/app/lib/data/database-actions/user-actions';
import {
  createGameTemplate,
  getGameTemplateLikeCount,
  addLike,
  deleteLike,
  addComment,
  deleteComment,
  getComments,
  getGameTemplateNoComments,
} from '@/app/lib/data/database-actions/game-template-actions';
import { DatabaseError, DatabaseErrorType } from '@/app/lib/data/database-actions/error-types';
import { getFakeImageUrl } from './utils';

import { PrismaClient } from '@prisma/client';
import { createClient } from '@/app/lib/utils/supabase-server';
import { imagesStorageBucketName } from '@/app-config';
import {v4 as uuidv4} from 'uuid';

const prisma = new PrismaClient();
const supabase = createClient();

async function deleteEverything() {
  // delete everything
  await prisma.scene.deleteMany({})
  await prisma.gameSession.deleteMany({})
  await prisma.gameTemplateLike.deleteMany({})
  await prisma.comment.deleteMany({})
  await prisma.gameTemplate.deleteMany({})
  await prisma.user.deleteMany({})
  
  // delete any existing images in the bucket
  const { data, error } = await supabase.storage
  .from(imagesStorageBucketName)
  .list();

  if (error) {
    throw new Error(`Error listing images: ${error.message}`);
  }
  for (const image of data) {
    await supabase.storage.from(imagesStorageBucketName).remove([image.name]);
  }
}

describe('Game Template Actions', () => {
  // beforeEach(async () => {
  //   await deleteEverything();
  // })

  // afterAll(async () => {
  //   await deleteEverything();
  // })

  test.concurrent('should create a game template with valid data', async () => {
    const userId = await createUser(`testuser-${uuidv4()}@example.com`, 'hashedpassword', 'Test User');

    const newGameTemplateData = {
      name: 'Test Template',
      imageUrl: getFakeImageUrl(1),
      imageDescription: 'Template image',
      backStory: 'This is a test backstory.',
      description: 'A test template',
      isPublic: true,
    };

    const templateId = await createGameTemplate(userId, newGameTemplateData);
    expect(templateId).toBeGreaterThan(0);

    // Retrieve the template
    const template = await getGameTemplateNoComments(userId, templateId);

    expect(template).toEqual({
      name: newGameTemplateData.name,
      backstroy: newGameTemplateData.backStory,
      description: newGameTemplateData.description,
      imageUrl: expect.any(String),
    });
  });

  test.concurrent('should throw Unauthorized error when creating a game template with invalid userId', async () => {
    const invalidUserId = 999999;

    const newGameTemplateData = {
      name: 'Test Template',
      imageUrl: getFakeImageUrl(1),
      imageDescription: 'Template image',
      backStory: 'This is a test backstory.',
      description: 'A test template',
      isPublic: true,
    };

    await expect(createGameTemplate(invalidUserId, newGameTemplateData)).rejects.toThrowError(DatabaseError);

    try {
      await createGameTemplate(invalidUserId, newGameTemplateData);
    } catch (error) {
      expect(error).toBeInstanceOf(DatabaseError);
      const dbError = error as DatabaseError;
      expect(dbError.type).toBe(DatabaseErrorType.Unauthorized);
      expect(dbError.message).toBe('User not found');
    }
  });

  test.concurrent('should add and delete a like to a public game template', async () => {
    const userId = await createUser(`testuser-${uuidv4()}@example.com`, 'hashedpassword', 'Test User');

    const templateId = await createGameTemplate(userId, {
      name: 'Test Template',
      imageUrl: getFakeImageUrl(1),
      imageDescription: 'Template image',
      backStory: 'This is a test backstory.',
      description: 'A test template',
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
  });

  test.concurrent('should throw Conflict error when adding a like that already exists', async () => {
    const userId = await createUser(`testuser-${uuidv4()}@example.com`, 'hashedpassword', 'Test User');

    const templateId = await createGameTemplate(userId, {
      name: 'Test Template',
      imageUrl: getFakeImageUrl(1),
      imageDescription: 'Template image',
      backStory: 'This is a test backstory.',
      description: 'A test template',
      isPublic: true,
    });

    await addLike(userId, templateId);

    await expect(addLike(userId, templateId)).rejects.toThrowError(DatabaseError);

    try {
      await addLike(userId, templateId);
    } catch (error) {
      expect(error).toBeInstanceOf(DatabaseError);
      const dbError = error as DatabaseError;
      expect(dbError.type).toBe(DatabaseErrorType.Conflict);
      expect(dbError.message).toBe('User has already liked this game template');
    }
  });

  test.concurrent('should add and delete a comment', async () => {
    const userId = await createUser(`testuser-${uuidv4()}@example.com`, 'hashedpassword', 'Test User');

    const templateId = await createGameTemplate(userId, {
      name: 'Test Template',
      imageUrl: getFakeImageUrl(1),
      imageDescription: 'Template image',
      backStory: 'This is a test backstory.',
      description: 'A test template',
      isPublic: true,
    });

    const commentText = 'This is a test comment';
    await addComment(userId, templateId, commentText);

    // Retrieve comments
    const comments = await getComments(userId, templateId);
    expect(comments.length).toBe(1);
    const comment = comments[0];
    expect({username : comment.username, text: comment.text, createdAt: comment.createdAt}).toEqual({
      username: 'Test User',
      text: commentText,
      createdAt: expect.any(Date),
    });

    await deleteComment(userId, comment.id);

    const newComments = await getComments(userId, templateId);
    expect(newComments.length).toBe(0);
  });

  test.concurrent('should get a public game template without comments', async () => {
    const userId = await createUser(`testuser-${uuidv4()}@example.com`, 'hashedpassword', 'Test User');

    const templateId = await createGameTemplate(userId, {
      name: 'Test Template',
      imageUrl: getFakeImageUrl(1),
      imageDescription: 'Template image',
      backStory: 'This is a test backstory.',
      description: 'A test template',
      isPublic: true,
    });

    const template = await getGameTemplateNoComments(userId, templateId);

    expect(template).toEqual({
      name: 'Test Template',
      backstroy: 'This is a test backstory.',
      description: 'A test template',
      imageUrl: expect.any(String),
    });
  });
});
