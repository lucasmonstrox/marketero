import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./src/schemas/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://marketero:marketero@127.0.0.1:54320/marketero",
  },
})
