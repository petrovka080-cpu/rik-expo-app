# Enterprise Release Candidate Rollback

1. Disable AI_ESTIMATE_TO_PDF_ENABLED
2. Disable GLOBAL_ESTIMATE_AI_TOOL_ENABLED
3. Disable GLOBAL_ESTIMATE_ENGINE_ENABLED
4. Disable CONSUMER_MARKETPLACE_SEND_ENABLED
5. Keep existing PDFs/history readable
6. Keep old marketplace and Office flows working
7. Roll back compatible OTA update when applicable
8. Roll back Edge Function version when needed
9. Do not delete estimate snapshots
10. Do not drop migrations
