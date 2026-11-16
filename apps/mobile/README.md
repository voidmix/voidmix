# Mobile application

Expo SDK 58, React Native 0.88, and Expo Router for iOS, Android, and Web. Screens use native components, system themes, safe areas, scalable fonts, and touch-sized controls. Shared contracts and device authorization come from workspace packages.

## Development

Configure infrastructure and auth using the [root quick start](../../README.md), apply migrations, then run:

```sh
bun run dev:mobile
```

This starts Metro on 8081, Web on 3000, and API on 3002; Web and API bind to the local network. A physical device and development computer should be on the same network. Expo Go can preview ordinary screens when compatible with SDK 58; native auth needs a development build with the `voidmix` scheme.

```sh
# Start Web/API in another terminal if using these standalone client commands.
bun run dev:web
bun run dev:mobile:ios
bun run dev:mobile:android
bun run dev:mobile:web
```

iOS needs full Xcode and a Simulator runtime; Android needs Android Studio and the Android SDK. Expo generates native projects when needed. Generated `ios/` and `android/` are not committed. Rebuild after adding native modules or changing URL schemes.

## HTTP and public configuration

`src/lib/api.ts` uses the shared oRPC HTTP client. Development detects the Expo host when available; fallback API origins are `http://10.0.2.2:3002` on Android emulators and `http://127.0.0.1:3002` on iOS Simulator/local Web.

Override with `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` or the build environment. It is public and compiled into client assets; restart Metro or export again after changes. Physical devices need a reachable host rather than their own `localhost`. Production exports must supply the real HTTPS API origin.

Expo Web calls the API directly. Development CORS allows local port 8081 by default; production must list its deployed browser origin in API `CORS_ORIGINS`.

## Authentication

`src/lib/auth.ts` owns session state. Native login opens the system authorization browser on Web `/authorize`, validates the callback at `voidmix://auth/complete`, then redeems an independent device session. Native credentials are saved in SecureStore, isolated by API origin. Expo Web uses a popup and polling with a memory-only token. Redirect URLs never contain tokens.

Users explicitly approve or deny the code. Handle closed windows, cancellation, expiry, network errors, and failed storage. Sign-out revokes the backend session before removing the local token. `getApiClient().me()` calls the protected procedure.

For a physical device:

```dotenv
# Root .env, using the development computer's actual LAN address.
BETTER_AUTH_URL=http://192.168.1.20:3000
# apps/mobile/.env
EXPO_PUBLIC_API_URL=http://192.168.1.20:3002
```

`BETTER_AUTH_URL` must address the public Web pages. Web uses its same-origin cookie proxy; mobile API calls use Bearer credentials. See [auth](../../packages/auth/README.md).

## Structure, exports, and checks

`src/app` owns Expo routes, including `auth/complete.tsx`; `src/lib` owns API/auth adapters, origin detection, and theme. Use React Native UI rather than the shared DOM UI package. Metro uses Expo's monorepo configuration; Bun's hoisted linker and root `resolutions` keep the React family compatible across applications.

```sh
bun run check:mobile
EXPO_PUBLIC_API_URL=https://api.example.com bun run build:mobile
bun run preview:mobile
```

Builds export JavaScript, Hermes bytecode, and assets to `dist`. `preview:mobile` serves the Web export on port 8081, configurable with `MOBILE_PORT`. Native installers come from development builds or EAS Build; configure identifiers and signing before distribution.

The `expo-web` E2E project covers counters, real cross-origin RPC, network recovery, popup authorization, and cancellation. Validate deep links, SecureStore, and browser return on real devices or emulators separately.
