# S-LOAD-FIX-6 Warehouse Issue Queue Explain Index Patch Proof

Status: GREEN_SOURCE_PATCH_READY

Evidence status: PARTIAL_EXPLAIN_DNS_BLOCKED

This wave stayed narrow: it did not touch production, did not apply staging DDL, did not run S-LOAD-8, and did not change `warehouse_issue_queue_scope_v4` business semantics.

## Preflight

- `HEAD == origin/main` before patch: YES
- worktree clean before patch: YES
- `.env.staging.local` ignored: YES
- `STAGING_SUPABASE_DB_URL` exists: YES
- env values printed: NO
- env file committed: NO

## Staging Connectivity

The local staging hosts from `.env.staging.local` did not resolve:

- Supabase URL parse: OK
- Supabase URL DNS: `ENOTFOUND`
- DB URL parse: OK
- DB URL DNS: `ENOTFOUND`
- public DNS retry: unresolved

Because of this, direct staging DB `EXPLAIN ANALYZE` could not be captured in this run. A PostgREST anon fallback also could not execute the RPC because it did not have the required RPC access. No raw rows, raw plan, env values, or secrets were printed.

## Diagnosis

Live plan node timings are unavailable until staging DNS/access is corrected. The safe source-shape diagnosis is:

- Fix-5/Fix-5b/Fix-5c lower-bound/probe rewrites must not be repeated because they caused staging timeout `57014`.
- Fix-4 already added a request_items text-cast join index for fallback item reads.
- Fix-3 already added the warehouse issue context order index.
- The active queue source still uses `coalesce(submitted_at, created_at)` ordering and request id text comparisons.
- Existing request order index used `submitted_at` and `created_at` as separate keys, which does not exactly match the source ordering expression.

## Patch

Migration:

- `supabase/migrations/20260430143000_s_load_fix_6_warehouse_issue_queue_explain_index_patch.sql`

The patch is additive index-only:

- `idx_requests_issue_queue_coalesced_order_sloadfix6`
- `idx_requests_issue_queue_id_text_sloadfix6`

It does not change:

- public RPC signature
- RPC source body
- row payload shape
- ordering semantics
- visibility semantics
- warehouse stock math
- package/native config
- OTA/EAS/Play Market

## Skipped

- S-LOAD-8: forbidden in this wave.
- staging migration apply: forbidden in this wave.
- production: forbidden and untouched.
- service-role: not used.
- Fix-5 lower-bound rewrite: skipped because it already caused timeout `57014`.
- warehouse stock math: untouched.

## Required Follow-Up

Before any S-LOAD-8 run:

1. Fix the local staging DNS/access values or provide a resolvable staging DB URL.
2. Rerun bounded RPC smoke and sanitized `EXPLAIN ANALYZE`.
3. Apply the additive patch to staging in a separate staging-only apply wave if still appropriate.
4. Then run bounded staging regression as a separate S-LOAD-8 wave.

No 10K readiness claim is made by this proof.
