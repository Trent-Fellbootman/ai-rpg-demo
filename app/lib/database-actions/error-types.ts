"use server";

export interface PrismaP2002Meta {
  target: string[];
}

export interface PrismaP2003Meta {
  field_name: string;
}

export enum DatabaseErrorType {
  Unauthorized = "Unauthorized",
  NotFound = "NotFound",
  Conflict = "Conflict",
  BadRequest = "BadRequest",
  InternalError = "InternalError",
  Timeout = "Timeout",
}

export class DatabaseError extends Error {
  public type: DatabaseErrorType;

  constructor(type: DatabaseErrorType, message: string) {
    super(message);
    this.name = "DatabaseError";
    this.type = type;
  }
}
