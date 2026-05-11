# S_AI_E2E_04A_AUTH_AND_AI_SURFACE_TESTIDS_CLOSEOUT

Final status: `BLOCKED_AI_ASSISTANT_SURFACE_NOT_TARGETABLE`

What is closed:

- Real login screen found at `app/auth/login.tsx`.
- Stable auth IDs added and proven in installed Android hierarchy: `auth.login.screen`, `auth.login.email`, `auth.login.password`, `auth.login.submit`.
- `auth.login.screen` was made Android-targetable with `collapsable={false}` on the existing root container.
- Existing AI assistant IDs added in source: `ai.assistant.open`, `ai.assistant.screen`, `ai.assistant.input`, `ai.assistant.send`, `ai.assistant.response`.
- Android preview APK rebuilt from commit `512587750bc38311b9d43a1e2cf97b8b6313eddb` as build `7b1235d8-28fa-41ff-a34f-c08aadab4e6a`.
- APK installed on emulator and `verifyAndroidInstalledBuildRuntime.ts` returned `GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF`.
- Maestro runner now passes explicit role credentials through child process env only by mirroring `E2E_*` to `MAESTRO_E2E_*`; no `-e` or `--env` CLI args.

Runtime result:

- Real login succeeds with explicit role credentials.
- Deep link opens the real AI assistant screen.
- `ai.assistant.screen` is visible.
- `ai.assistant.input`, `ai.assistant.send`, and `ai.assistant.response` are not visible in Android hierarchy.
- The visible assistant screen is occupied by the AI knowledge block, so the composer/response surface is not targetable for role-screen E2E.

Safety:

- no fake login
- no fake AI answer
- no hardcoded AI response
- no Auth Admin, `listUsers`, service role, DB seed, DB writes, migrations, or Supabase project changes
- no role discovery or known-password harness
- no credentials in source, CLI args, or artifacts
- stdout/stderr redacted
- Maestro debug screenshots/command dumps are not stored in repo artifacts
- auth and navigation behavior unchanged
- AI model/provider unchanged
- Gemini unchanged; OpenAI/GPT not enabled

Gates completed:

- focused contract tests: `PASS`
- `npx tsc --noEmit --pretty false`: `PASS`
- `npx expo lint`: `PASS`
- `npm test -- --runInBand`: `PASS`
- `npx tsx scripts/architecture_anti_regression_suite.ts --json`: `PASS`
- `git diff --check`: `PASS`
- artifact JSON parse: `PASS`
- Android runtime smoke: `PASS`
- AI role-screen E2E: `BLOCKED_AI_ASSISTANT_SURFACE_NOT_TARGETABLE`
