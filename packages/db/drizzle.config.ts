import { resolve } from "node:path";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: resolve(process.cwd(), "../../.env") });

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
const token = process.env.CLOUDFLARE_D1_TOKEN;

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  ...(accountId && databaseId && token
    ? {
        driver: "d1-http" as const,
        dbCredentials: { accountId, databaseId, token },
      }
    : {}),
  strict: true,
  verbose: true,
});
