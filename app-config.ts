import process from "node:process";

export const imagesStorageBucketName =
  process.env.SUPABASE_IMAGES_STORAGE_BUCKET_NAME!;

export const imageUrlExpireSeconds = 3600;
