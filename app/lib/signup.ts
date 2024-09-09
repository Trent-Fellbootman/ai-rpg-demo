"use server";

import { z } from "zod";

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

export type Response = Errors | undefined;

export default async function signup(formData: FormData): Promise<Response> {
  // Validate form fields using zod
  const result = FormSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  if (result.data.password !== result.data.confirmPassword) {
    return { message: "Passwords do not match!" };
  }

  // TODO: signup the user

  return {};
}
