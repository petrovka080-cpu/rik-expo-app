# WAVE 04 ? Rate Limit 10PCT Marketplace Ramp

final_status: BLOCKED_RATE_LIMIT_10PCT_MARKETPLACE_RAMP_APPROVAL_NOT_TRUTHY

- prerequisite: GREEN_RATE_LIMIT_5PCT_RATCHET_LOCKED
- route: marketplace.catalog.search
- target percent: 10
- blocked_reason: RATE_LIMIT_10_PERCENT_APPROVED present but not truthy true
- rate-limit env write: no
- deploy: no
- cache changes: no
- all-routes: no
- 25/50/100: no
- rollback: not needed, nothing applied
