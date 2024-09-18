import { v4 as uuidv4 } from "uuid";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { imagesStorageBucketName } from "@/app-config.ts";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
}

// TODO: reusing `supabase` should be OK in serverless environment?
const supabase = createClient();

export async function createImageUrl(
  filepath: string,
  expireSeconds: number,
): Promise<{
  url: string;
  expiration: Date;
}> {
  const creationTime = new Date();

  const { data, error } = await supabase.storage
    .from(imagesStorageBucketName)
    .createSignedUrl(filepath, expireSeconds);

  if (error) {
    throw new Error(`Error creating image URL: ${error.message}`);
  }

  return {
    url: data.signedUrl,
    expiration: new Date(creationTime.getTime() + expireSeconds * 1000), // Add expireSeconds to current time
  };
}

/**
 * Downloads an image from a URL and returns the filepath on the storage
 * @param imageUrl
 * @returns
 */
export async function downloadImageToStorage(
  imageUrl: string,
): Promise<string> {
  let blob: Blob;

  try {
    const response = await fetch(imageUrl);

    blob = await response.blob();
  } catch (error) {
    throw new Error(`Failed to fetch image`);
  }

  const url = new URL(imageUrl);
  const suffix = url.pathname.split(".").pop() as string;
  const filepath = `${uuidv4()}.${suffix}`;

  const { error } = await supabase.storage
    .from(imagesStorageBucketName)
    .upload(filepath, blob);

  if (error) {
    throw new Error(`Error uploading image: ${error.message}`);
  }

  return filepath;
}
