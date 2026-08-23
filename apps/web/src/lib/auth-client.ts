import { createAuthClient } from "better-auth/react";

import { env } from "../env.js";

export const authClient = createAuthClient({
  baseURL: env.VITE_API_URL,
  basePath: "/api/auth",
  fetchOptions: { credentials: "include" },
});

export const { signIn, signUp, signOut, useSession } = authClient;
