import * as process from "node:process";

import dotenv from "dotenv";

dotenv.config();

export const imagesStorageBucketName =
  process.env.SUPABASE_IMAGES_STORAGE_BUCKET_NAME!;
