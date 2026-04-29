# 50K Scale Observability Boundary

S-50K-OBS-INTEGRATION-1 adds a disabled-by-default server-side scale observability boundary for future 50K platform work. It does not send telemetry, change app behavior, or replace existing app flows.

## Why This Exists

The BFF, cache, job, idempotency, rate-limit, abuse, queue, realtime, and AI boundaries need aggregate-safe signals before they can be enabled safely at higher traffic. Without this layer, the platform can have server-side controls but no structured view of latency, retries, duplicates, cache quality, rate-limit decisions, or abuse pressure.

## Disabled By Default

- External export is disabled by default.
- No Sentry, OpenTelemetry, Datadog, or custom collector calls are made.
- The in-memory adapter exists only for deterministic tests and local proof.
- The noop adapter is the safe default.
- Missing external observability configuration must keep export disabled.

## Event Taxonomy

| Category | Events |
| --- | --- |
| BFF | `bff.route.request`, `bff.route.error` |
| Cache | `cache.hit`, `cache.miss`, `cache.stale`, `cache.invalidation.planned` |
| Jobs | `job.enqueue.planned`, `job.retry.planned`, `job.dead_letter.planned` |
| Idempotency | `idempotency.reserved`, `idempotency.duplicate_in_flight`, `idempotency.duplicate_committed` |
| Rate limit | `rate_limit.allowed`, `rate_limit.soft_limited`, `rate_limit.hard_limited` |
| Abuse | `abuse.suspicious` |
| Queue | `queue.backpressure.warning` |
| AI | `ai.workflow.action.planned` |
| Realtime | `realtime.channel_budget.warning` |

Every event must be redacted, bounded, and free of raw payloads.

## Metric Policies

| Area | Metrics |
| --- | --- |
| BFF | `bff.route.latency`, `bff.route.error_rate` |
| Cache | `cache.hit_rate`, `cache.stale_rate` |
| Jobs | `job.enqueue_rate`, `job.retry_rate`, `job.dead_letter_rate` |
| Idempotency | `idempotency.duplicate_rate` |
| Rate limit | `rate_limit.soft_limit_rate`, `rate_limit.hard_limit_rate` |
| Abuse | `abuse.suspicious_rate` |
| Queue | `queue.backpressure_rate` |
| AI | `ai.workflow.usage_rate` |
| Realtime | `realtime.channel_budget_warning_rate` |

All metric policies are aggregate-safe and `defaultEnabled: false`.

## Redaction Rules

Forbidden event fields:

- `rawPayload`
- `rawPrompt`
- `rawAiResponse`
- `email`
- `phone`
- `address`
- `fullName`
- `accessToken`
- `refreshToken`
- `serviceRoleKey`
- `signedUrl`
- `databaseUrl`
- `supabaseKey`

Event tags and route keys are capped. Token-like, signed URL, email, phone, and address-like values are rejected.

## Future Exporter Mapping

Future server adapters can map this boundary to:

- Sentry spans and breadcrumbs
- OpenTelemetry spans and counters
- Datadog metrics
- A custom internal metrics sink

That future work must keep raw payloads out of telemetry, use server-only credentials, and run an owner-approved staging proof before live export.

## Rollback

Use the noop adapter or remove the future external exporter configuration. Because this wave sends no telemetry and changes no app runtime flow, rollback is a code/config disable only.
