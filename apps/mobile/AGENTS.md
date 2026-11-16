# Mobile guidance

- Use Expo Router under `src/app` and native adapters under `src/lib`. Read `README.md` for device setup.
- Use React Native components, safe areas, accessible touch targets, and system theme behavior. Do not import the DOM UI package.
- Share HTTP contracts and device helpers through workspace public exports. Use `getApiClient` for current Bearer credentials.
- `EXPO_PUBLIC_API_URL` is public and compiled into assets. Physical devices need reachable API and Web origins, not their own localhost.
- Preserve system browser authorization, callback origin/path/code validation, cancellation cleanup, and SecureStore persistence isolated by API origin.
- Expo Web tokens are memory-only; keep the popup opener detached and handle closed popups. Tokens and private device codes never belong in callback URLs.
- Expo Go lacks the custom callback scheme; native login validation needs a development build or installation.
- Keep React family resolutions aligned with Expo and run `check:mobile`. Do not commit generated `ios/`, `android/`, or `.expo` output.
- Verify Web export/E2E and explicitly note when native deep links, storage, or browser-return behavior still need device verification.
