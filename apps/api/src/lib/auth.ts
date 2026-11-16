import { createAuth } from "@voidmix/auth/server"
import { db } from "./database"
import { envList, requiredEnv } from "./env"

const developmentOrigins =
  process.env.NODE_ENV === "development"
    ? [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
      ]
    : []

export const auth = createAuth({
  database: db,
  // Device authorization pages live on the public Web origin, not the private API origin.
  baseURL: requiredEnv("BETTER_AUTH_URL"),
  secret: requiredEnv("BETTER_AUTH_SECRET"),
  trustedOrigins: [...developmentOrigins, ...envList(process.env.AUTH_TRUSTED_ORIGINS)],
})
