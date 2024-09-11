import { vi, describe, it, expect, beforeEach, afterAll } from "vitest";

vi.mock("next/headers", () => ({
  cookies: () => ({
    getAll: async () => null,
    setAll: async (
      cookies: { name: string; value: string; options: any }[],
    ) => {},
  }),
}));

vi.mock("../app/lib/data/constants", () => ({
  imagesStorageBucketName: "images-storage-test",
}));

import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import sharp from "sharp";

import sql from "../app/lib/services/sql";

// TODO: check that user cannot access sessions not belonging to him/her.

import {
  createNewUser,
  createNewSession,
  retrieveScene,
  getUserById,
  getSessionLength,
  getUserGameSessions,
  getUserFromEmail,
  doesUserExist,
  doesSessionExist,
  addGeneratedSceneToSession,
  getScenes,
  downloadImageToStorage,
  createTemporaryUrl,
} from "@/app/lib/data/apis";
import { createClient } from "@/app/lib/utils/supabase-server";
import { imagesStorageBucketName } from "@/app/lib/data/constants";

const testUserEmail: string = "testuser@example.com";
const testUserPassword: string = "password123";

const dummySceneText = "dummy scene text";
const dummySceneImageStoragePath = "dummy scene image storage path";
const dummySceneImageDescription = "dummy scene image description";
const dummySceneAction = "dummy scene action";
const dummySessionName = "dummy session name";
const dummyBackStory = "dummy back story";
const dummySessionId = "dummy session ID";

const dummySessionMetadata = {
  sessionName: dummySessionName,
  sessionId: dummySessionId,
  backStory: dummyBackStory,
};

const dummyInitialScene = {
  text: dummySceneText,
  imageStoragePath: dummySceneImageStoragePath,
  imageDescription: dummySceneImageDescription,
  action: dummySceneAction,
};

describe("Database Functions", () => {
  // Create some initial variables for tests
  let userId: string;
  let sessionId: string;

  // Reset the database state before each test
  beforeEach(async () => {
    // Clean up the test database (ensure you are using a test database)
    await sql`DROP TABLE IF EXISTS scenes_table`;
    await sql`DROP TABLE IF EXISTS game_sessions_table`;
    await sql`DROP TABLE IF EXISTS user_credentials_table`;

    // seed the database
    await sql`
      CREATE TABLE IF NOT EXISTS user_credentials_table (
      user_id UUID PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      hashed_password VARCHAR(255) NOT NULL
    )`;

    await sql`
      CREATE TABLE IF NOT EXISTS scenes_table (
      scene_id UUID PRIMARY KEY,
      session_id UUID NOT NULL,
      text TEXT NOT NULL,
      image_storage_path TEXT,
      image_description TEXT,
      action TEXT,
      scene_order INT NOT NULL
    )`;

    await sql`CREATE TABLE IF NOT EXISTS game_sessions_table (
      session_id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      session_name TEXT NOT NULL,
      initial_setup TEXT NOT NULL
    )`;

    const supabase = createClient();

    // delete any existing images in the bucket
    const { data, error } = await supabase.storage.from("images_bucket").list();

    if (error) {
      throw new Error(`Error listing images: ${error.message}`);
    }
    for (const image of data) {
      await supabase.storage.from("images_bucket").remove([image.name]);
    }

    // Create a new user for testing
    userId = await createNewUser(testUserEmail, testUserPassword);
    expect(userId).toBeDefined();
  }, 30000);

  afterAll(async () => {
    // clear all tables
    await sql`DELETE FROM scenes_table`;
    await sql`DELETE FROM game_sessions_table`;
    await sql`DELETE FROM user_credentials_table`;
  });

  it("should create a new user and retrieve it", async () => {
    const user = await getUserById(userId);

    expect(user).toBeDefined();
    expect(user.email).toBe(testUserEmail);
  });

  it("should throw an error if retrieving a non-existing user", async () => {
    await expect(getUserById(uuidv4())).rejects.toThrow("User not found.");
  });

  it("should create a new session for a user", async () => {
    sessionId = await createNewSession(
      userId,
      dummySessionMetadata,
      dummyInitialScene,
    );
    expect(sessionId).toBeDefined();

    const sessions = await getUserGameSessions(userId);

    expect(sessions.length).toBe(1);
    expect(sessions[0].sessionName).toBe(dummySessionMetadata.sessionName);

    expect(await getSessionLength(sessionId)).toBe(1);

    const initialScene = await retrieveScene(userId, sessionId, 0);

    const expectedInitialScene = {
      ...dummyInitialScene,
      action: "",
    };

    expect(initialScene).toEqual(expectedInitialScene);
  });

  it("should throw an error if creating a session for a non-existing user", async () => {
    const nonExistentUserId = uuidv4();

    await expect(
      createNewSession(
        nonExistentUserId,
        dummySessionMetadata,
        dummyInitialScene,
      ),
    ).rejects.toThrow("User not found.");
  });

  it("should add a scene to a session", async () => {
    sessionId = await createNewSession(
      userId,
      dummySessionMetadata,
      dummyInitialScene,
    );

    const secondScene = {
      text: "Second Scene",
      imageStoragePath: "second scene image url",
      imageDescription: "second scene image description",
      action: "second scene action",
    };

    await addGeneratedSceneToSession(sessionId, dummySceneAction, secondScene);

    const sessionLength = await getSessionLength(sessionId);

    expect(sessionLength).toBe(2);

    const scene = await retrieveScene(userId, sessionId, 1);

    expect(scene).toEqual({ ...secondScene, action: "" });
  });

  it("should throw an error if session does not exist when adding a scene", async () => {
    const nonExistentSessionId = uuidv4();

    await expect(
      addGeneratedSceneToSession(nonExistentSessionId, dummySceneAction, {
        text: "Scene",
        imageStoragePath: "",
        imageDescription: "",
        action: "",
      }),
    ).rejects.toThrow("Session not found.");
  });

  it("should retrieve the correct session length", async () => {
    sessionId = await createNewSession(
      userId,
      dummySessionMetadata,
      dummyInitialScene,
    );

    await addGeneratedSceneToSession(sessionId, dummySceneAction, {
      text: "Scene 1",
      imageStoragePath: "",
      imageDescription: "",
      action: "",
    });
    await addGeneratedSceneToSession(sessionId, dummySceneAction, {
      text: "Scene 2",
      imageStoragePath: "",
      imageDescription: "",
      action: "",
    });

    const sessionLength = await getSessionLength(sessionId);

    expect(sessionLength).toBe(3);
  });

  it("should throw an error if retrieving a scene from a non-existing session", async () => {
    const nonExistentSessionId = uuidv4();

    await expect(
      retrieveScene(
        (await getUserFromEmail(testUserEmail))!.userId!,
        nonExistentSessionId,
        0,
      ),
    ).rejects.toThrow("Session not found for the user.");
  });

  it("should return true if user exists", async () => {
    const exists = await doesUserExist(userId);

    expect(exists).toBe(true);
  });

  it("should return false if user does not exist", async () => {
    const exists = await doesUserExist(uuidv4());

    expect(exists).toBe(false);
  });

  it("should return true if session exists", async () => {
    sessionId = await createNewSession(
      userId,
      dummySessionMetadata,
      dummyInitialScene,
    );
    const exists = await doesSessionExist(sessionId);

    expect(exists).toBe(true);
  });

  it("should return false if session does not exist", async () => {
    const exists = await doesSessionExist(uuidv4());

    expect(exists).toBe(false);
  });

  it("should add a generated scene to session", async () => {
    sessionId = await createNewSession(
      userId,
      dummySessionMetadata,
      dummyInitialScene,
    );

    const generatedScene = {
      text: "Generated Scene",
      imageStoragePath: "generated scene image url",
      imageDescription: "generated scene image description",
      action: "",
    };

    await addGeneratedSceneToSession(
      sessionId,
      "previous action",
      generatedScene,
    );

    const sessionLength = await getSessionLength(sessionId);

    expect(sessionLength).toBe(2);

    const initialScene = await retrieveScene(userId, sessionId, 0);

    expect(initialScene.action).toBe("previous action");

    const scene = await retrieveScene(userId, sessionId, 1);

    const expectedScene = { ...generatedScene, action: "" };

    expect(scene).toEqual(expectedScene);
  });

  it("should retrieve all scenes in a session", async () => {
    sessionId = await createNewSession(
      userId,
      dummySessionMetadata,
      dummyInitialScene,
    );

    await addGeneratedSceneToSession(sessionId, dummySceneAction, {
      text: "Scene 1",
      imageStoragePath: "",
      imageDescription: "",
      action: "",
    });

    const scenes = await getScenes(sessionId);

    expect(scenes.length).toBe(2);
    expect(scenes[0].text).toBe(dummyInitialScene.text);
    expect(scenes[1].text).toBe("Scene 1");
  });

  it("downloads image to storage and creates a URL", async () => {
    console.log(`imagesStorageBucketName: ${imagesStorageBucketName}`);

    const filename = await downloadImageToStorage(
      "https://i.imgur.com/CzXTtJV.jpg",
    );

    expect(filename).toMatch(
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.jpg$/,
    );

    const url = await createTemporaryUrl(filename);

    const response = await axios.get(url, { responseType: "arraybuffer" });
    const imageBuffer = Buffer.from(response.data, "binary");
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    expect(metadata.width).toBeGreaterThan(0);
    expect(metadata.height).toBeGreaterThan(0);
  }, 30000);
});
