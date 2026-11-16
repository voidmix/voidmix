# @voidmix/auth

Better Auth with PostgreSQL/Drizzle, email/password authentication, device authorization, and Bearer sessions. Passwords require at least 12 characters. Web owns `/login` and `/authorize`; desktop and mobile reuse those pages.

## Public entry points

| Import                 | Purpose                                                                     |
| ---------------------- | --------------------------------------------------------------------------- |
| `@voidmix/auth/server` | `createAuth` with an application-owned database, public Web URL, and secret |
| `@voidmix/auth/client` | React client with the device authorization client plugin                    |
| `@voidmix/auth/device` | UI-independent grant, polling, session, and revocation helpers              |
| `@voidmix/auth/types`  | Shared session/user types                                                   |

Import server construction only from server code. The API mounts `/api/auth/*` and owns the pool and configuration. `BETTER_AUTH_URL` is the public **Web origin**, not an API-only address. Origin validation stays enabled, including in tests. See [configuration](../../docs/configuration.md) for required variables and trusted origins.

## Web

The application creates its same-origin client in `apps/web/src/lib/auth.ts`:

```ts
import { authClient } from "@/lib/auth"

await authClient.signIn.email({ email, password })
const { data: session } = await authClient.getSession()
await authClient.signOut()
```

React components may use `authClient.useSession()`. The API proxy preserves Cookie, Origin, and Set-Cookie. Cookie policy follows Better Auth's HttpOnly, SameSite, and HTTPS secure-cookie defaults. The authorization page requires sign-in, code review, and an explicit allow/deny action.

## Native device authorization

1. The application requests `/api/auth/device/code`, keeps `device_code` private, and displays `user_code`.
2. It opens the returned verification URL. The user signs in and confirms the code on the Web page.
3. The application redeems `/api/auth/device/token` for its own session and uses Bearer authentication.
4. Sign-out revokes the server session before removing its local credential.

Allowed public client IDs are `voidmix-mobile`, `voidmix-mobile-web`, and `voidmix-desktop`. They are identifiers, not secrets. Grants expire after ten minutes; polling starts at the server-provided interval, normally five seconds. Clients handle pending, slow-down, denial, expiration, cancellation, and closed windows. Tokens and private device codes never appear in redirect URLs.

| Client      | Implementation and storage                                                                                                          |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Expo native | System authorization browser, validated `voidmix://auth/complete` callback, then SecureStore                                        |
| Expo Web    | Popup with no opener, parent polling, token held only in memory                                                                     |
| MyGo        | Go opens an untrusted WebView without IPC, polls and persists to the system keyring; JS receives only public codes and profile data |

Storage is isolated by API origin. MyGo fails login if secure persistence is unavailable and revokes an already-redeemed session on failure; Linux needs a working Secret Service. Expo's custom callback requires a development build or installation with the `voidmix` scheme, rather than Expo Go. See [mobile](../../apps/mobile/README.md) and [desktop](../../apps/desktop/README.md).

Use `VITE_API_URL` for desktop and `EXPO_PUBLIC_API_URL` for mobile. Physical devices need reachable API and Web addresses. Desktop credentials belong to Go; implement authenticated remote business operations there instead of exposing tokens across IPC.

## RPC, schema, and verification

The API resolves Cookie or Bearer sessions once per RPC request. `requireSession` protects `me`; `greet` is public. SSR forwards the current request's credentials through a lazy header getter. Mobile's API client reads the current token when needed.

Schema and migrations belong to `@voidmix/db`, including `0001_device_authorization.sql`. Apply migrations explicitly before starting a deployment. API E2E covers sign-up, password checks, origin rejection, authorization, Bearer protection/revocation, repeated redemption, denial, polling limits, and popup cancellation. Go tests cover keyring persistence and cancellation races.

Email verification, SMTP, password recovery, and third-party OAuth are not configured. A future provider may require a system browser instead of an embedded WebView; use its supported authorization flow.
