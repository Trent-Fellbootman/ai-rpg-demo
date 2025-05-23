require("dotenv").config();

const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseHost = supabaseUrl.hostname;

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pino", "pino-pretty"],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: supabaseHost,
        port: '',
        pathname: `/storage/v1/object/sign/${process.env.SUPABASE_IMAGES_STORAGE_BUCKET_NAME}/**`,
      },
    ]
  }
}

module.exports = nextConfig
