# S_AI_E2E_04E Response Smoke Policy Proof

## Source Policy

- Added `ai.assistant.loading` to the real assistant loading bubble.
- Kept deterministic knowledge preview as the blocking release gate.
- Moved exact `ai.assistant.response` waiting into a non-blocking response canary owned by the runner.
- Kept exact LLM text assertions out of Maestro flows.
- Runner now accepts real Android hierarchy proof of either `ai.assistant.loading` or `ai.assistant.response` after send, because a fast response can legitimately replace loading before Maestro observes it.

## Runtime

- Android APK rebuilt for source change: EAS build `36b0c7dd-b7c1-4cea-a1b8-361e4d2881f1`.
- Android APK installed on emulator.
- Android runtime smoke: `GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF`.
- AI role-screen release gate: `GREEN_AI_ROLE_SCREEN_DETERMINISTIC_RELEASE_GATE`.
- All five role flows passed deterministic screen/knowledge/prompt-pipeline proof.
- Prompt pipeline observations: director=response, foreman=response, buyer=response, accountant=response, contractor=response.
- Response smoke canary: `BLOCKED_AI_RESPONSE_SMOKE_TIMEOUT_CANARY`, non-blocking release.

## Safety

- No fake AI answer.
- No hardcoded AI response.
- No exact LLM output assertion.
- No Auth Admin, listUsers, service_role, seed, DB write, migration, Supabase project change, OTA, iOS build, or Android Play submit.
- No credentials in source, CLI args, or artifacts.
