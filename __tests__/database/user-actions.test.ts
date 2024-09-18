import { describe, test, expect } from "vitest";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

import {
  createUser,
  getUserFromEmail,
} from "@/app/lib/database-actions/user-actions";
import {
  DatabaseError,
  DatabaseErrorType,
} from "@/app/lib/database-actions/error-types";

const prisma = new PrismaClient();

describe("User Actions", () => {
  // beforeEach(async () => {
  //   // delete all users
  //   await prisma.user.deleteMany({})
  // })

  // afterAll(async () => {
  //   // delete all users
  //   await prisma.user.deleteMany({})
  // })

  test.concurrent("should create a user with valid data", async () => {
    const email = `testuser-${uuidv4()}@example.com`;
    const hashedPassword = "hashedpassword";
    const name = "Test User";

    const userId = await createUser(email, hashedPassword, name);

    expect(userId).toBeGreaterThan(0);

    // Retrieve the user and check data
    const user = await getUserFromEmail(email);

    expect(user).toEqual({
      id: userId,
      email,
      name,
      hashedPassword,
    });
  });

  test.concurrent(
    "should throw conflict error when creating a user with an existing email",
    async () => {
      const email = `testuser-${uuidv4()}@example.com`;
      const hashedPassword = "hashedpassword";
      const name = "Test User";

      await createUser(email, hashedPassword, name);

      await expect(
        createUser(email, hashedPassword, name),
      ).rejects.toThrowError(DatabaseError);

      try {
        await createUser(email, hashedPassword, name);
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        const dbError = error as DatabaseError;

        expect(dbError.type).toBe(DatabaseErrorType.Conflict);
        expect(dbError.message).toBe("Email already in use");
      }
    },
  );

  test.concurrent("should retrieve a user by email", async () => {
    const email = `testuser-${uuidv4()}@example.com`;
    const hashedPassword = "hashedpassword";
    const name = "Test User";

    const userId = await createUser(email, hashedPassword, name);

    const user = await getUserFromEmail(email);

    expect(user).toEqual({
      id: userId,
      email,
      name,
      hashedPassword,
    });
  });

  test.concurrent(
    "should throw not found error when retrieving a non-existing user",
    async () => {
      const email = `nonexisting-${uuidv4()}@example.com`;

      await expect(getUserFromEmail(email)).rejects.toThrowError(DatabaseError);

      try {
        await getUserFromEmail(email);
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        const dbError = error as DatabaseError;

        expect(dbError.type).toBe(DatabaseErrorType.NotFound);
        expect(dbError.message).toBe("User not found");
      }
    },
  );
});
