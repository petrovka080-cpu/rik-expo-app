# S_AI_E2E_04A_AUTH_AND_AI_SURFACE_TESTIDS_CLOSEOUT

Final status: `GREEN_AUTH_AI_SURFACE_TESTIDS_READY`

Added permanent stable testIDs to the existing runtime surfaces only:

- `app/auth/login.tsx`: `auth.login.screen`, `auth.login.email`, `auth.login.password`, `auth.login.submit`, `auth.login.error`, `auth.login.loading`
- `src/features/ai/AssistantFab.tsx`: `ai.assistant.open`
- `src/features/ai/AIAssistantScreen.tsx`: `ai.assistant.screen`, `ai.assistant.input`, `ai.assistant.send`, `ai.assistant.response`

Updated all five `tests/e2e/ai-role-screen-knowledge/*.yaml` role flows to target stable auth and AI assistant IDs. Credentials remain env placeholders only.

Safety:

- no fake login
- no fake AI answer
- no hardcoded AI response
- no Auth Admin, `listUsers`, service role, DB seed, DB writes, migrations, or Supabase project changes
- no role discovery or known-password harness
- no credentials in source, CLI args, or artifacts
- auth and navigation behavior unchanged
- AI model/provider unchanged
- Gemini unchanged; OpenAI/GPT not enabled

The new Android APK rebuild is still required after commit/push because the currently installed APK cannot contain source-level testID changes.

Gates completed before build:

- pre-flight git status: clean at start
- pre-flight HEAD/origin parity: `0 0`
- `npm run release:verify -- --json`: `PASS`
- focused contract tests: `PASS`
- `npx tsc --noEmit --pretty false`: `PASS`
- `npx expo lint`: `PASS`
- `npm test -- --runInBand`: `PASS`
- `npx tsx scripts/architecture_anti_regression_suite.ts --json`: `PASS`
- `git diff --check`: `PASS`
- artifact JSON parse: `PASS`
