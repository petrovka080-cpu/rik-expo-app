# S_AI_HARDEN_02_PER_TOOL_RATE_LIMIT_AND_BUDGET

Final status: `GREEN_AI_TOOL_RATE_LIMIT_BUDGET_READY`

Implemented a production-safe per-tool rate-limit and budget contract for all registered AI tools. Each tool now has a scoped rate policy, payload/result/retry budgets, role scope, evidence/audit requirements, and a deterministic decision object exposed through tool planning and the agent BFF shell.

Focused proof:
- `npm test -- --runInBand tests/ai/aiToolRateLimitPolicy.contract.test.ts tests/ai/aiToolBudgetPolicy.contract.test.ts tests/ai/aiToolRateLimitDecision.contract.test.ts tests/architecture/aiToolRateLimitArchitecture.contract.test.ts`
- `npx tsc --noEmit --pretty false`
- `npx expo lint`
- `npm test -- --runInBand`
- `npx tsx scripts/architecture_anti_regression_suite.ts --json`

Runtime proof:
- Android installed build runtime smoke: `PASS`
- Command Center task-stream E2E: `BLOCKED_ROLE_ISOLATION_REQUIRES_SEPARATE_E2E_USERS`
- Android APK rebuild: `BLOCKED_ANDROID_APK_BUILD_FAILED`, EAS Android Free plan quota exhausted until `2026-06-01`

Negative confirmations:
- no hook work
- no UI decomposition
- no temporary shim
- no fake green
- no fake AI answer
- no hardcoded AI response
- no direct mutation from UI
- no direct Supabase from UI
- no model provider import from UI
- no Auth Admin
- no listUsers
- no privileged backend role use added
- no DB seed
- no unbounded reads
- no select-star added
- no uncontrolled external fetch
- no GPT/OpenAI enablement
- no Gemini removal
- no OTA
- no iOS build
- no Android Play submit
- no credentials in source, CLI args, or artifacts
- no secrets printed
