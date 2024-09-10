import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { v4 as uuidv4 } from "uuid";

import sql from "../app/lib/services/sql";

import {
  createNewUser,
  createNewSession,
  addSceneToSession,
  retrieveScene,
  getUserById,
  getSessionLength,
  getUserGameSessions,
} from "@/app/lib/data/apis";

const testUserEmail: string = "testuser@example.com";
const testUserPassword: string = "password123";

const dummySceneText = "dummy scene text";
const dummySceneImageUrl = "dummy scene image url";
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

    const initialScene = await retrieveScene(sessionId, 0);

    expect(initialScene.text).toBe(dummySceneText);
    expect(initialScene.imageUrl).toBe(dummySceneImageUrl);
    expect(initialScene.action).toBe("");
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

    await addSceneToSession(sessionId, {
      text: "Second Scene",
      imageUrl: "",
      action: "",
    });

    const sessionLength = await getSessionLength(sessionId);

    expect(sessionLength).toBe(2);

    const scene = await retrieveScene(sessionId, 1);

    expect(scene.text).toBe("Second Scene");
  });

  it("should throw an error if session does not exist when adding a scene", async () => {
    const nonExistentSessionId = uuidv4();

    await expect(
      addSceneToSession(nonExistentSessionId, {
        text: "Scene",
        imageUrl: "",
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
      action: "",
    });
    await addSceneToSession(sessionId, {
      text: "Scene 2",
      imageUrl: "",
      action: "",
    });

    const sessionLength = await getSessionLength(sessionId);

    expect(sessionLength).toBe(3);
  });

  it("should throw an error if retrieving a scene from a non-existing session", async () => {
    const nonExistentSessionId = uuidv4();

    await expect(retrieveScene(nonExistentSessionId, 0)).rejects.toThrow(
      "Scene not found.",
    );
  });
});
