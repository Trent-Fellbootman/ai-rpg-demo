"use server";

import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";

import sql from "../services/sql";
import {
  GameSessionMetadata,
  Scene,
  UserCredentials,
} from "../data/data-models";
import {
  GameSessionMetadataTableType,
  UserCredentialsTableType,
  SceneTableType,
} from "../data/table-definitions";
import { createClient } from "../utils/supabase-server";

import { imagesStorageBucketName } from "@/app/lib/data/constants";

// Function to check if a user exists
// TODO: unit test this function
export async function doesUserExist(userId: string): Promise<boolean> {
  const userCheck = await sql<UserCredentialsTableType>`
    SELECT user_id
    FROM user_credentials_table
    WHERE user_id = ${userId}
  `;

  return userCheck.rowCount !== null && userCheck.rowCount > 0;
}

// TODO: unit test this function
export async function doesSessionExist(sessionId: string) {
  const sessionCheck = await sql<GameSessionMetadataTableType>`
    SELECT session_id
    FROM game_sessions_table
    WHERE session_id = ${sessionId}
  `;

  return sessionCheck.rowCount !== null && sessionCheck.rowCount > 0;
}

/**
 * `newScene.action` is always ignored and set to an empty string.
 * `action` refers to the "previous action" that was taken.
 * @param sessionId
 * @param action
 * @param newScene
 */
export async function addGeneratedSceneToSession(
  sessionId: string,
  action: string,
  newScene: Scene,
) {
  if (!(await doesSessionExist(sessionId))) {
    throw new Error("Session not found.");
  }

  const orderResult = await sql<{ max_order: number }>`
    SELECT MAX(scene_order) as max_order
    FROM scenes_table
    WHERE session_id = ${sessionId}
  `;

  const newOrder =
    orderResult.rows[0].max_order !== null
      ? orderResult.rows[0].max_order + 1
      : 0;
  const newSceneId = uuidv4();

  // set the action field in the last scene and insert the new scene in an atomic manner
  await sql`BEGIN;`;
  try {
    await sql`
      UPDATE scenes_table
      SET action = ${action}
      WHERE session_id = ${sessionId}
      AND scene_order = ${newOrder - 1}
    `;
    await sql`
      INSERT INTO scenes_table (scene_id, session_id, text, image_storage_path, image_description, action, scene_order)
      VALUES (${newSceneId}, ${sessionId}, ${newScene.text}, ${newScene.imageStoragePath}, ${newScene.imageDescription}, ${""}, ${newOrder})
    `;
    await sql`COMMIT;`;
  } catch (error) {
    await sql`ROLLBACK;`;
    throw error; // Optionally handle or rethrow the error
  }
}

export async function retrieveScene(
  userId: string,
  sessionId: string,
  index: number,
): Promise<Scene> {
  // check if the session belongs to the user and reject if it doesn't
  const sessionCheck = await sql<GameSessionMetadataTableType>`
    SELECT session_id
    FROM game_sessions_table
    WHERE session_id = ${sessionId} AND user_id = ${userId}
  `;

  if (sessionCheck.rowCount === 0) {
    throw new Error("Session not found for the user.");
  }

  // Retrieve the scene based on session ID and scene order
  const sceneResult = await sql<SceneTableType>`
  SELECT text, image_storage_path, image_description, action
  FROM scenes_table
  WHERE session_id = ${sessionId} AND scene_order = ${index}`;

  if (sceneResult.rowCount === 0) {
    throw new Error("Scene not found.");
  }

  // Construct the Scene object
  return {
    text: sceneResult.rows[0].text,
    imageStoragePath: sceneResult.rows[0].image_storage_path,
    imageDescription: sceneResult.rows[0].image_description,
    action: sceneResult.rows[0].action,
  };
}

// Create a new session for a user
/**
 `sessionId` in metadata is ignored; a new ID is always generated.
 `is_locked` in metadata is ignored; it is always false.
 `action` in initialScene is ignored; it is always an empty string.

 Atomicity is guaranteed.
 */
export async function createNewSession(
  userId: string,
  metadata: GameSessionMetadata,
  initialScene: Scene,
): Promise<string> {
  if (!(await doesUserExist(userId))) {
    throw new Error("User not found.");
  }

  const newSessionId = uuidv4();
  const initialSceneId = uuidv4();

  // TODO: does this ACTUALLY ensure atomicity? (this was proposed by ChatGPT)
  await sql`BEGIN;`;

  try {
    await sql`
    INSERT INTO game_sessions_table (session_id, user_id, session_name, initial_setup, is_locked)
    VALUES (${newSessionId}, ${userId}, ${metadata.sessionName}, ${metadata.backStory}, ${false});
  `;

    await sql`
    INSERT INTO scenes_table (scene_id, session_id, text, image_storage_path, image_description, action, scene_order)
    VALUES (${initialSceneId}, ${newSessionId}, ${initialScene.text}, ${initialScene.imageStoragePath}, ${initialScene.imageDescription}, ${""}, ${0});
  `;

    await sql`COMMIT;`;
  } catch (error) {
    await sql`ROLLBACK;`;
    throw error; // Optionally handle or rethrow the error
  }

  return newSessionId;
}

// Create a new user
export async function createNewUser(
  email: string,
  password: string,
): Promise<string> {
  const emailCheck = await sql<UserCredentialsTableType>`
    SELECT email
    FROM user_credentials_table
    WHERE email = ${email}
  `;

  if (emailCheck.rowCount && emailCheck.rowCount > 0) {
    throw new Error("Email already in use.");
  }

  const newUserId = uuidv4();
  const hashedPassword = await bcrypt.hash(password, 10);

  await sql`
    INSERT INTO user_credentials_table (user_id, email, hashed_password)
    VALUES (${newUserId}, ${email}, ${hashedPassword})
  `;

  return newUserId;
}

// Retrieve all game sessions for a user
export async function getUserGameSessions(
  userId: string,
): Promise<GameSessionMetadata[]> {
  if (!(await doesUserExist(userId))) {
    throw new Error("User not found.");
  }

  const sessionsResult = await sql<GameSessionMetadataTableType>`
    SELECT session_id, session_name
    FROM game_sessions_table
    WHERE user_id = ${userId}
  `;

  return sessionsResult.rows.map((row) => ({
    sessionId: row.session_id,
    userId: row.user_id,
    sessionName: row.session_name,
    backStory: row.initial_setup,
  }));
}

/**
 * Retrieves all scenes in a session, sorted by scene order (low order first).
 * @param sessionId
 */
export async function getScenes(sessionId: string): Promise<Scene[]> {
  const scenesResult = await sql<SceneTableType>`
    SELECT text, image_storage_path, action
    FROM scenes_table
    WHERE session_id = ${sessionId}
    ORDER BY scene_order ASC
  `;

  return scenesResult.rows.map((row) => ({
    text: row.text,
    imageStoragePath: row.image_storage_path,
    imageDescription: row.image_description,
    action: row.action,
  }));
}

export async function doesUserOwnSession(userId: string, sessionId: string) {
  // Check if the session exists
  const sessionCheck = await sql<GameSessionMetadataTableType>`
    SELECT session_id, user_id
    FROM game_sessions_table
    WHERE session_id = ${sessionId}
  `;

  if (sessionCheck.rowCount === 0) {
    throw new Error("Session not found.");
  }

  return sessionCheck.rows[0].user_id === userId;
}

export async function getSessionMetadata(
  sessionId: string,
): Promise<GameSessionMetadata> {
  const sessionCheck = await sql<GameSessionMetadataTableType>`
    SELECT session_id, session_name, initial_setup
    FROM game_sessions_table
    WHERE session_id = ${sessionId}
  `;

  if (sessionCheck.rowCount === 0) {
    throw new Error("Session not found.");
  }

  return {
    sessionId: sessionCheck.rows[0].session_id,
    sessionName: sessionCheck.rows[0].session_name,
    backStory: sessionCheck.rows[0].initial_setup,
  };
}

export async function getSessionLength(sessionId: string): Promise<number> {
  // Check if the session exists
  const sessionCheck = await sql<GameSessionMetadataTableType>`
    SELECT session_id
    FROM game_sessions_table
    WHERE session_id = ${sessionId}
  `;

  if (!sessionCheck) {
    throw new Error("Session not found.");
  }

  // Retrieve the maximum scene order
  const orderResult = await sql<{ max_order: number }>`
    SELECT MAX(scene_order) as max_order
    FROM scenes_table
    WHERE session_id = ${sessionId}
  `;

  // Return the session length (max_order + 1) or 0 if no scenes are present
  return orderResult?.rows[0].max_order !== null
    ? orderResult.rows[0].max_order + 1
    : 0;
}

export async function getUserById(
  userId: string,
): Promise<UserCredentialsTableType> {
  // Query the database to retrieve user information based on user ID
  const userResult = await sql<UserCredentialsTableType>`
    SELECT user_id, email, hashed_password
    FROM user_credentials_table
    WHERE user_id = ${userId}
  `;

  // If no user is found, return null
  if (userResult.rowCount === 0) {
    throw new Error("User not found.");
  }

  // Return the user credentials
  return userResult.rows[0];
}

export async function getUserFromEmail(
  email: string,
): Promise<UserCredentials | null> {
  try {
    // delay
    const user =
      await sql<UserCredentialsTableType>`SELECT * FROM user_credentials_table WHERE email=${email}`;

    if (user.rowCount === 0) {
      return null;
    }

    return {
      userId: user.rows[0].user_id,
      email: user.rows[0].email,
      hashedPassword: user.rows[0].hashed_password,
    };
  } catch (error) {
    throw new Error(`Internal Error: ${error}`);
  }
}

export async function downloadImageToStorage(
  imageUrl: string,
): Promise<string> {
  const supabase = createClient();

  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const url = new URL(imageUrl);
  const suffix = url.pathname.split(".").pop() as string;
  const filepath = `${uuidv4()}.${suffix}`;

  const { error } = await supabase.storage
    .from(imagesStorageBucketName)
    .upload(filepath, blob);

  if (error) {
    throw new Error(`Error uploading image: ${error.message}`);
  }

  return filepath;
}

export async function createTemporaryUrl(filename: string): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from(imagesStorageBucketName)
    .createSignedUrl(filename, 3600);

  if (error) {
    throw new Error(`Error creating image URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Returns true if the session was successfully locked.
 * @param sessionId
 */
export async function tryLockSession(sessionId: string): Promise<boolean> {
  const data = await sql`
    UPDATE game_sessions_table
    SET is_locked = true
    WHERE session_id = ${sessionId} AND is_locked = false
    RETURNING is_locked;
  `;

  return data.rowCount !== null && data.rowCount > 0;
}

/**
 * Unlocks the session if it was previously locked.
 * If the session was not locked or was not found, an error is thrown.
 * @param sessionId
 */
export async function unlockSession(sessionId: string) {
  // the update only happens if is_locked was previously true
  const data = await sql`
    UPDATE game_sessions_table
    SET is_locked = false
    WHERE session_id = ${sessionId} AND is_locked = true
    RETURNING is_locked;
  `;

  // if no rows were updated, then the session was not locked or was not found
  if (!(data.rowCount && data.rowCount > 0)) {
    throw new Error("Session not found or not locked.");
  }
}

/**
 * Waits until a session can be locked, then lock it.
 * If the session cannot be locked within the timeout, an error is thrown.
 * @param sessionId
 * @param attemptIntervalMs The number of milliseconds to wait between attempts to lock the session.
 * @param timeoutMs
 */
export async function lockSession(
  sessionId: string,
  attemptIntervalMs: number = 500,
  timeoutMs: number = 60_000,
) {
  const repeatTryLockingUntilSuccess = async () => {
    let lockedSuccessfully = false;

    do {
      await new Promise((resolve) => setTimeout(resolve, attemptIntervalMs));
      lockedSuccessfully = await tryLockSession(sessionId);
    } while (!lockedSuccessfully);
  };

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error("Timed out waiting to lock session")),
      timeoutMs,
    ),
  );

  await Promise.race([repeatTryLockingUntilSuccess(), timeoutPromise]);
}

export async function isSessionLocked(sessionId: string): Promise<boolean> {
  const data = await sql`
    SELECT is_locked
    FROM game_sessions_table
    WHERE session_id = ${sessionId}
  `;

  return data.rows[0].is_locked;
}
