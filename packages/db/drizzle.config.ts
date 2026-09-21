import { resolve } from "node:path";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: resolve(process.cwd(), "../../.env") });

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is required. Copy .env.example to .env first.");
}

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
