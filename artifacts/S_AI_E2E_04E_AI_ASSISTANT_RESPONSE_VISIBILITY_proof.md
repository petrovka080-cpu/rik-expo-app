# S_AI_E2E_04E_AI_ASSISTANT_RESPONSE_VISIBILITY

Status: `GREEN_AI_ASSISTANT_RESPONSE_VISIBILITY_READY_FOR_ANDROID_BUILD`

Runtime observation before this source change:

- Android runtime smoke passed on the installed APK.
- Explicit role credentials resolved from process env.
- Maestro reached the real AI assistant screen.
- `ai.assistant.response` existed in the Android UI tree after the prompt, but it was clipped below the visible message viewport.

Bounded fix:

- Kept `ai.assistant.response` on the latest generated assistant reply only.
- Kept prior assistant messages on `ai.assistant.response.history`.
- Compact only prior assistant history after a user prompt with `numberOfLines={2}`.
- No auth, navigation, hook, provider, role, Supabase, DB, model, or AI response logic changed.

Required next step:

- Rebuild and reinstall the Android preview APK because source targetability changed.
- Re-run `verifyAndroidInstalledBuildRuntime`.
- Re-run `runAiRoleScreenKnowledgeMaestro` with explicit process env role credentials.
