**S_WEB_AI_ASSISTANT_02_FULL_HEIGHT_CHAT_READY_SCREEN_PROPOSALS**

- Removed default user-facing debug/explanation cards from the AI assistant; raw knowledge preview is gated by `debugAiContext=1`.
- Added full-height web chat shell styles with `100dvh`, `minHeight: 0`, single message-list scrolling, and a persistent composer.
- Added deterministic user-facing answers for module overview, procurement triage, warehouse, finance, director, approval inbox, and AI boundaries.
- Added `resolveAssistantUserContext` so `/ai?context=buyer` behaves as procurement even when the session role is limited.
- Added ready screen proposal registry/engine/policy for buyer, warehouse, accountant payment, foreman, director, and documents.
- Added approved director request supplier proposal hydration with internal-first real evidence and no fake suppliers.
- Added focused contract tests and `scripts/e2e/runAiAssistantReadyProposalsWeb.ts`.

Gates run:

- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- Focused wave Jest suite: PASS
- `npm test -- --runInBand`: PASS
- `npx tsx scripts/architecture_anti_regression_suite.ts --json`: PASS
- `git diff --check`: PASS
- `npx tsx scripts/e2e/runAiAssistantReadyProposalsWeb.ts`: PASS
- `npx tsx scripts/release/verifyAndroidInstalledBuildRuntime.ts`: PASS
- `npx tsx scripts/release/buildInstallAndroidPreviewForEmulator.ts`: PASS
- `npx tsx scripts/e2e/runAiMandatoryEmulatorRuntimeMatrix.ts`: PASS after rebuild/install; approval/live-execution child runners remained exact-blocked because this wave forbids DB writes.
- Artifact JSON parse: PASS
- `npm run release:verify -- --json`: pre-commit run blocked only because the release guard requires a clean worktree before release automation.
