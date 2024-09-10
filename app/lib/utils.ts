"use server";

import { auth } from "@/auth";
import { getUserFromEmail } from "@/app/lib/data/apis";

export async function getCurrentUser() {
  const session = await auth();

  if (!session) {
    throw new Error("Not logged in");
  }

  const email = session!.user!.email!;

  return (await getUserFromEmail(email))!;
}
