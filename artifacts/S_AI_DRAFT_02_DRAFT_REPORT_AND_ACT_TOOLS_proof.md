# S_AI_DRAFT_02_DRAFT_REPORT_AND_ACT_TOOLS

Status: GREEN_AI_DRAFT_REPORT_ACT_TOOLS_READY

Proof summary:
- `draft_report` and `draft_act` expose the W12 document draft contract:
  - `draft_sections[]`
  - `missing_data[]`
  - `evidence_refs[]`
  - `requires_review=true`
  - `requires_approval_for_send=true`
- Existing draft-only behavior is preserved.
- Sending a document remains outside the draft tools and requires `submit_for_approval`.

Role scope:
- Foreman: project/report/act draft contract only.
- Contractor: own act/document draft contract only.
- Director/control: all registered draft document scopes.
- Accountant: finance-readonly report drafts; act drafts denied.

Forbidden action proof:
- `final_pdf_send=0`
- `external_share=0`
- `final_status_change=0`
- `signature=0`
- `payment_status_change=0`
- `mutation_count=0`

Safety confirmations:
- No hook work.
- No UI decomposition.
- No fake AI answer.
- No hardcoded AI response.
- No Auth Admin, `listUsers`, or `service_role`.
- No DB seed, DB writes, migrations, or Supabase project changes.
- No model provider change, OpenAI/GPT enablement, or Gemini removal.
- No OTA, Android build, iOS build, or Play submit.
- No credentials in source, CLI args, or artifacts.
