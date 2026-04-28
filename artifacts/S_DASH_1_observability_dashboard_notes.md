# S-DASH-1 Observability Dashboard Notes

Production-safe dashboard/report generation was added as scripts only.

## Data Sources
- app_errors: read-only query when PROD_SUPABASE_URL and PROD_SUPABASE_READONLY_KEY are present
- offline queue/replay: derived from redacted app_errors contexts/messages
- realtime channel budget/duplicates: derived from redacted app_errors contexts/messages
- release/update lineage: updateGroupId/runtimeVersion fields inside app_errors.extra when present
- PDF/WebView: derived from redacted app_errors contexts/messages
- RPC validation and JSON corruption: derived from redacted app_errors contexts/messages

## Live Snapshot
- status: env_missing
- missing env: PROD_SUPABASE_URL, PROD_SUPABASE_READONLY_KEY

No production mutation, service_role usage, OTA, EAS build, or EAS submit is performed by this wave.
