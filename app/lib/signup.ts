"use server";

import { z } from "zod";

import { createNewUser } from "@/app/lib/data/apis";
import { redirect } from "next/navigation";
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

  // signup the user
  try {
    await createNewUser(result.data.email, result.data.password);
  } catch (error) {
    return { message: `An error occurred: ${error}` };
  }

  redirect(constants.loginPagePath);
}
