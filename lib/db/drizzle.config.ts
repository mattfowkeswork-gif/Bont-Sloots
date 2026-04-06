import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const isLocal = process.env.DATABASE_URL.includes("localhost") ||
  process.env.DATABASE_URL.includes("127.0.0.1");

// Strip sslmode from the URL so pg-connection-string doesn't override our ssl config
const dbUrl = process.env.DATABASE_URL
  .replace(/[?&]sslmode=[^&]*/g, "")
  .replace(/[?&]$/, "");

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  },
});
