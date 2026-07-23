import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: required("DATABASE_URL"),
  sessionSecret: required("SESSION_SECRET"),
  imagesDir: process.env.IMAGES_DIR ?? "/data/images",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "http://localhost:5173",
};
