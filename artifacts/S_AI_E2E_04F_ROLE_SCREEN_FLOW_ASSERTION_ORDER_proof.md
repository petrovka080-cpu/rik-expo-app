# S_AI_E2E_04F_ROLE_SCREEN_FLOW_ASSERTION_ORDER

Status: `GREEN_ROLE_SCREEN_FLOW_ASSERTION_ORDER_READY`

Runtime observation:

- Fresh Android APK installed on emulator.
- Runtime smoke passed.
- `ai.assistant.response` became targetable after the response visibility fixes.
- The remaining failure was assertion order: Maestro scrolled down to the response, then tried to assert the top `AI APP KNOWLEDGE BLOCK` preview.

Bounded fix:

- Each role-screen Maestro flow now asserts the knowledge preview and role policy strings before scrolling to `ai.assistant.response`.
- The generated response is still required and asserted after the knowledge preview checks.
- No app source, auth logic, roles, AI provider, database, or Supabase configuration changed.
- No Android rebuild is required for this YAML-only change.
