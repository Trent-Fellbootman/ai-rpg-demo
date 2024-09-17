"use server";

import { PrismaClient, Prisma } from '@prisma/client';
import { DatabaseError, DatabaseErrorType, PrismaP2002Meta } from './error-types';

const prisma = new PrismaClient();

export async function createUser(
  email: string,
  hashedPassword: string,
  name?: string
): Promise<number> {
  try {
    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        name,
      },
      select: {
        id: true,
      },
    });
    return user.id;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const meta = error.meta as unknown as PrismaP2002Meta;

      if (meta.target?.includes('email')) {
        throw new DatabaseError(
          DatabaseErrorType.Conflict,
          'Email already in use'
        );
      }
    }
    throw new DatabaseError(
      DatabaseErrorType.InternalError,
      'Failed to create user'
    );
  }
}

export async function getUserFromEmail(email: string): Promise<{
  id: number,
  name: string | null,
  email: string
  hashedPassword: string
}> {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },

    select: {
      id: true,
      name: true,
      email: true,
      hashedPassword: true,
    }
  });

  if (!user) {
    throw new DatabaseError(DatabaseErrorType.NotFound, 'User not found');
  }

  return user;
}
