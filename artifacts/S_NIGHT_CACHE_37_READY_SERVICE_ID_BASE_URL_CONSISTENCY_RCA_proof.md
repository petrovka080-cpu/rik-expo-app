# WAVE 37 Cache Ready Service ID/Base URL Consistency RCA

final_status: BLOCKED_CACHE_READY_HITS_DIFFERENT_SERVICE_OR_BASE_URL

- deploy_commit_equals_head: false
- ready_commit_equals_head: false
- service_url_matches_bff_base_url: true
- render_service_id_belongs_to_same_url: true
- blocked_reason: deploy_commit_not_head_or_absent;ready_commit_not_head_or_absent

Safety: read-only Render API and /ready only; no env writes, deploy, probes, DB writes, or raw env/URL/secret values printed.
