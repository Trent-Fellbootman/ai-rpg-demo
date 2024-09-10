import { z } from "zod";
import { generateChatMessage } from "@/app/lib/services/generative-ai";

const FormSchema = z.object({
  name: z.string().min(1, "Name must be non-empty!"),
  back_story: z.string().min(1, "Back story must be non-empty!"),
});

export type Errors = {
  fieldErrors?: {
    [Key in keyof z.infer<typeof FormSchema>]?: string[];
  };
  message?: string;
};

export async function createSession(
  formData: FormData,
): Promise<Errors | undefined> {
  // Validate form fields using zod
  const result = FormSchema.safeParse(formData);

  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  // generate initial scene

  // insert session as well as the initial scene in one transaction
}
