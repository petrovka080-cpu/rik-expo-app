# RIK App

Минимальный каркас Expo-приложения.
Запуск: `npm i && npm run dev`

## Supabase конфигурация
- Клиент создаётся единожды в [`src/lib/supabaseClient.ts`](src/lib/supabaseClient.ts) и должен указывать только на проект `nxrnjywzxxfdpqmzjorh`.
- Настройки читаются из `.env.local` (Expo использует один и тот же путь для dev/prod билдов, fallback на старые проекты отключён).
- Обязательные переменные окружения:
  - `EXPO_PUBLIC_SUPABASE_URL=https://nxrnjywzxxfdpqmzjorh.supabase.co`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key из проекта nxrnjywzxxfdpqmzjorh>`
- После правок `.env.local` перезапусти bundler (`expo start -c`), чтобы убедиться, что берутся новые значения.

## OTA Update Policy
- Do not change `expo.runtimeVersion`, `expo.version`, iOS `buildNumber`, or Android `versionCode` for OTA-only releases.
- Channel/branch mapping:
  - `development` channel -> `main` branch
  - `preview` channel -> `preview` branch
  - `production` channel -> `production` branch
- Publish commands:
  - Development OTA: `eas update --channel development`
  - TestFlight/Production OTA: `eas update --channel production`
- Do not publish production updates with `--branch main`.
- Verification:
  - `eas update:list --branch production --limit 5`
  - Ensure latest update has `runtimeVersion: 1.0.0` and platforms `ios, android`.
