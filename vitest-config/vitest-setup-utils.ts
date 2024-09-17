import { PrismaClient } from "@prisma/client";
import { createServerClient } from '@supabase/ssr';
import process from 'process';
import dotenv from "dotenv";

dotenv.config(); // Loads variables from .env into process.env

const imagesStorageBucketName = process.env["SUPABASE_IMAGES_STORAGE_BUCKET_NAME"]!;

const prisma = new PrismaClient();
const supabase = createClient();

export async function deleteEverything() {
  // delete everything
  await prisma.scene.deleteMany({})
  await prisma.gameSession.deleteMany({})
  await prisma.gameTemplateLike.deleteMany({})
  await prisma.comment.deleteMany({})
  await prisma.gameTemplate.deleteMany({})
  await prisma.user.deleteMany({})

  // delete any existing images in the bucket
  const { data, error } = await supabase.storage
    .from(imagesStorageBucketName)
    .list();

  if (error) {
    throw new Error(`Error listing images: ${error.message}`);
  }
  for (const image of data) {
    await supabase.storage.from(imagesStorageBucketName).remove([image.name]);
  }
}

function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: async () => null,
        setAll: async (
          cookies: { name: string; value: string; options: any }[],
        ) => { },
      },
    },
  );
}
