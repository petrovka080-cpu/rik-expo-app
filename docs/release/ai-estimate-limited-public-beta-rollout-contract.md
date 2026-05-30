# AI Estimate Limited Public Beta Rollout Contract

Wave:

`S_AI_ESTIMATE_LIMITED_PUBLIC_BETA_ALLOWLIST_AND_RELEASE_CLOSEOUT_POINT_OF_NO_RETURN`

This contract does not enable public rollout. It only defines the governance conditions that must be true before AI Estimate limited public beta execution can be allowed.

Required contract:

```json
{
  "external_beta_flag_approval": true,
  "full_public_rollout_enabled": false,
  "limited_public_beta_enabled_by_default": false,
  "manual_enable_required": true,
  "initial_public_beta_percent": 0.1,
  "max_public_beta_percent": 0.5,
  "eligible_users": "explicit_allowlist_only",
  "country_city_allowlist": [
    { "country": "Kyrgyzstan", "city": "Bishkek" },
    { "country": "Kazakhstan", "city": "Almaty" }
  ],
  "regulated_high_risk_public_beta_enabled": false,
  "monitoring_owner": "ai-estimate-release-owner",
  "rollback_owner": "ai-estimate-release-owner",
  "daily_error_budget_required": true,
  "kill_switch_required": true,
  "rollback_required": true
}
```

Execution remains blocked unless real external allowlist IDs are present. Test or staging entries may prove the control plane, but they are not rollout evidence.

