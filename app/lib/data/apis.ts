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

// Function to check if a user exists
export async function doesUserExist(userId: string): Promise<boolean> {
  const userCheck = await sql<UserCredentialsTableType>`
    SELECT user_id
    FROM user_credentials_table
    WHERE user_id = ${userId}
  `;

  return userCheck.rowCount !== null && userCheck.rowCount > 0;
}

// Add a scene to a session
export async function addSceneToSession(sessionId: string, scene: Scene) {
  const sessionCheck = await sql<GameSessionMetadataTableType>`
    SELECT session_id
    FROM game_sessions_table
    WHERE session_id = ${sessionId}
  `;

  if (sessionCheck.rowCount === 0) {
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

  await sql`
    INSERT INTO scenes_table (scene_id, session_id, text, image_url, action, scene_order)
    VALUES (${newSceneId}, ${sessionId}, ${scene.text}, ${scene.imageUrl}, ${scene.action}, ${newOrder})
  `;

  console.log("Scene successfully added.");
}

export async function retrieveScene(
  sessionId: string,
  index: number,
): Promise<Scene> {
  // Retrieve the scene based on session ID and scene order
  const sceneResult = await sql<SceneTableType>`
  SELECT text, image_url, action
  FROM scenes_table
  WHERE session_id = ${sessionId} AND scene_order = ${index}`;

  if (sceneResult.rowCount === 0) {
    console.log("Scene not found.");

    throw new Error("Scene not found.");
  }

  // Construct the Scene object
  return {
    text: sceneResult.rows[0].text,
    imageUrl: sceneResult.rows[0].image_url,
    action: sceneResult.rows[0].action,
  };
}

// Create a new session for a user
export async function createNewSession(
  userId: string,
  metadata: GameSessionMetadata,
): Promise<string> {
  if (!(await doesUserExist(userId))) {
    throw new Error("User not found.");
  }

  const newSessionId = uuidv4();

  await sql`
    INSERT INTO game_sessions_table (session_id, user_id, session_name)
    VALUES (${newSessionId}, ${userId}, ${metadata.sessionName})
  `;

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
  }));
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
): Promise<UserCredentials | undefined> {
  try {
    // delay
    const user =
      await sql<UserCredentialsTableType>`SELECT * FROM user_credentials_table WHERE email=${email}`;

    return {
      userId: user.rows[0].user_id,
      email: user.rows[0].email,
      hashedPassword: user.rows[0].hashed_password,
    };
  } catch (error) {
    throw new Error(`Failed to fetch user: ${error}`);
  }
}
