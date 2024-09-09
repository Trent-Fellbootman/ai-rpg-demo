"use server";

import { z } from "zod";

export type Errors = {
  action?: string[];
};

export type Response = {
  errors?: Errors;
};

const FormSchema = z.object({
  action: z.string().min(1, "Action must be non-empty!"),
});

export default async function generateNextScene(
  formData: FormData,
): Promise<Response> {
  // Validate form fields using zod
  const result = FormSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  // TODO
  return {};
}
