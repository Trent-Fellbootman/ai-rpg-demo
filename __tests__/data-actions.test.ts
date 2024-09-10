import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { v4 as uuidv4 } from "uuid";

import sql from "../app/lib/services/sql";

// TODO: check that user cannot access sessions not belonging to him/her.

import {
  createNewUser,
  createNewSession,
  addSceneToSession,
  retrieveScene,
  getUserById,
  getSessionLength,
  getUserGameSessions,
  getUserFromEmail,
  doesUserExist,
  doesSessionExist,
  addGeneratedSceneToSession,
  getScenes,
} from "@/app/lib/data/apis";

const testUserEmail: string = "testuser@example.com";
const testUserPassword: string = "password123";

const dummySceneText = "dummy scene text";
const dummySceneImageUrl = "dummy scene image url";
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
  imageUrl: dummySceneImageUrl,
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
      image_url TEXT,
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

    // Create a new user for testing
    userId = await createNewUser(testUserEmail, testUserPassword);
    expect(userId).toBeDefined();
  });

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
      imageUrl: "second scene image url",
      imageDescription: "second scene image description",
      action: "second scene action",
    };

    await addSceneToSession(sessionId, secondScene);

    const sessionLength = await getSessionLength(sessionId);

    expect(sessionLength).toBe(2);

    const scene = await retrieveScene(userId, sessionId, 1);

    expect(scene).toEqual(secondScene);
  });

  it("should throw an error if session does not exist when adding a scene", async () => {
    const nonExistentSessionId = uuidv4();

    await expect(
      addSceneToSession(nonExistentSessionId, {
        text: "Scene",
        imageUrl: "",
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

    await addSceneToSession(sessionId, {
      text: "Scene 1",
      imageUrl: "",
      imageDescription: "",
      action: "",
    });
    await addSceneToSession(sessionId, {
      text: "Scene 2",
      imageUrl: "",
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
      imageUrl: "generated scene image url",
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

    await addSceneToSession(sessionId, {
      text: "Scene 1",
      imageUrl: "",
      imageDescription: "",
      action: "",
    });

    const scenes = await getScenes(sessionId);

    expect(scenes.length).toBe(2);
    expect(scenes[0].text).toBe(dummyInitialScene.text);
    expect(scenes[1].text).toBe("Scene 1");
  });
});
