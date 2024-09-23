"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import bcrypt from "bcrypt";

import { createUser } from "@/app/lib/database-actions/user-actions";
import { constants } from "@/app/lib/utils/path";

const FormSchema = z.object({
  email: z.string().email("Email must be valid!"),
  password: z.string().min(6, "Password must be at least 6 characters long!"),
  confirmPassword: z.string(),
});

export type Errors = {
  fieldErrors?: {
    [Key in keyof z.infer<typeof FormSchema>]?: string[];
  };
  message?: string;
};

export type Response = Errors | null;

export async function signup(formData: FormData): Promise<Response> {
  // Validate form fields using zod
  const result = FormSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  if (result.data.password !== result.data.confirmPassword) {
    return { message: "Passwords do not match!" };
  }

  const hashedPassword = await bcrypt.hash(result.data.password, 10);

  // signup the user
  try {
    await createUser({ email: result.data.email, hashedPassword });
  } catch (error) {
    return { message: `An error occurred: ${error}` };
  }

  redirect(constants.loginPagePath);
}
