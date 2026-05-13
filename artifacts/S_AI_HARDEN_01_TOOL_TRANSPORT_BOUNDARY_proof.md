# S_AI_HARDEN_01_AI_TOOL_TRANSPORT_BOUNDARY

Status: GREEN_AI_TOOL_TRANSPORT_BOUNDARY_READY

What changed:

- Added permanent `src/features/ai/tools/transport/*` boundary files for all registered AI tools.
- Moved default catalog, supplier, warehouse, finance, approval submit, and action status runtime calls behind typed transport files.
- Kept runtime tool files focused on auth, policy, validation, bounded DTO mapping, evidence, and no-mutation output.
- Added architecture scanner check `ai_tool_transport_boundary`.

Safety proof:

- Runtime tools no longer import catalog/screen BFF clients or action ledger repository directly.
- UI surfaces do not import AI tool transport internals.
- Transport contracts require bounded request, DTO-only return, redaction, no model provider imports, and no Supabase imports from runtime tools.
- No hook work, no UI decomposition, no fake AI answer, no direct UI mutation, no DB seed, no migrations, no env mutation.

Runtime proof:

- Android runtime smoke: PASS (`GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF`).
- Command Center task-stream E2E: BLOCKED_ROLE_ISOLATION_REQUIRES_SEPARATE_E2E_USERS because explicit director E2E credentials are required and discovery/seed fallbacks are forbidden.
- Fresh Android rebuild attempt: BLOCKED_ANDROID_APK_BUILD_FAILED because the EAS Free plan Android build quota is exhausted until 2026-06-01.
