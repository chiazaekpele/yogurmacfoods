import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations use the direct (non-pooled) connection when one is set.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});
