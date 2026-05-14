import "dotenv/config";
import { defineConfig } from "prisma/config";
import path from "path";

const envUrl = process.env.DATABASE_URL;

// Default to the local SQLite file when no URL is set or when an unscoped
// "file:./..." path is provided. For libsql/Turso/Postgres URLs we pass the
// URL through unchanged so `prisma db push` targets the right database.
function resolveUrl(): string {
  if (!envUrl) {
    return `file:${path.join(__dirname, "prisma", "dev.db")}`;
  }
  if (envUrl.startsWith("file:")) {
    const filePart = envUrl.slice("file:".length);
    return `file:${path.resolve(__dirname, filePart)}`;
  }
  return envUrl;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: resolveUrl(),
  },
});
