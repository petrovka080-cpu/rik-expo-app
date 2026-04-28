# S-DB-2 Index Query Plan Notes

Wave: S-DB-2 DB_INDEX_QUERY_PLAN_HARDENING

Mode: production-safe database scale-hardening.

Scope:
- Added one additive-only SQL migration.
- Added one narrow migration safety test.
- No app runtime logic changed.
- No SQL/RPC function behavior changed.
- No RLS policy changed.
- No production SQL deployed.
- No OTA published.

Existing index count before:
- 76 CREATE INDEX / CREATE UNIQUE INDEX statements found in supabase/migrations.

Selected index targets:
1. requests submitted window ordering
2. request_items request detail ordering
3. request_items director pending fan-in
4. proposals director pending queue
5. proposals request/supplier lookup
6. proposal_items proposal detail ordering
7. market_listings company/status feed slice
8. market_listings user/status feed slice
9. work_progress_log contractor progress history
10. wh_ledger warehouse incoming date range

Skipped:
- Chat messages: existing indexes already cover supplier/company/object/user created_at paths; is_deleted refinement can be S-DB-3 if chat volume proves it.
- PDF/export full-data reads: intentionally not capped or behavior-changed.
- RPC internals: no function rewrites in this wave.
- Unique client_mutation_id indexes: not added because duplicate-free production data was not proven in this wave.

EXPLAIN proof:
- Not available locally in this wave.
- Code-to-index mapping proof is included in the migration comments and matrix.

Production deployment note:
- The repo migration intentionally avoids CREATE INDEX CONCURRENTLY because Supabase migration transaction behavior can vary by runner.
- If tables are large in production, apply equivalent statements with CONCURRENTLY in a separate deployment wave.
