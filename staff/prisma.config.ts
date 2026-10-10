import "dotenv/config";
import { defineConfig } from "prisma/config";

// The schema and migrations live at the repo root and are shared with the shop.
// This app only generates its client; it never runs migrations.
export default defineConfig({
  schema: "../prisma/schema.prisma",
  datasource: { url: process.env.DIRECT_URL || process.env.DATABASE_URL },
});
