# Scale Observability Runbook

S-50K-OBS-INTEGRATION-1 is a production-safe, disabled-by-default observability boundary. It prepares server-side scale events and aggregate metrics without sending external telemetry.

## Safe Defaults

- Use `NoopScaleObservabilityAdapter` by default.
- Do not enable external export without an owner-approved staging proof.
- Do not print or commit telemetry credentials.
- Do not send raw payloads, prompts, AI responses, tokens, signed URLs, database URLs, emails, phones, addresses, or full names.

## Pre-Enable Checklist

1. Confirm BFF/cache/jobs/idempotency/rate boundaries are present and disabled by default.
2. Confirm the exporter credential is server-only.
3. Confirm sampling and aggregation settings are conservative.
4. Run tests for `scaleObservabilityBoundary`.
5. Run full release gates.
6. Run a staging-only telemetry proof with synthetic or seeded data.
7. Confirm no production writes or user payload export.

## Event Handling

Use the event contract registry as the only allowed event taxonomy. New events must be:

- redacted
- bounded
- aggregate-safe where possible
- sampled intentionally
- free of raw payloads and private data

## Metrics Handling

Metric policies are aggregate-safe and disabled by default. The current policy table covers:

- BFF latency and error rate
- cache hit/miss/stale rate
- job enqueue/retry/dead-letter rate
- idempotency duplicate and final-failure rate
- rate-limit soft/hard limit rate
- abuse suspicious rate
- queue backpressure rate
- AI workflow usage rate
- realtime channel budget and limit projection warning rates

## External Exporter Plan

Future adapters may send to Sentry, OpenTelemetry, Datadog, or a custom collector. The adapter must:

- use server-only credentials
- keep export disabled unless explicitly enabled
- redact before export
- cap event and tag size
- avoid raw payload logging
- expose health without printing secrets

## Incident Response

If telemetry export causes noise or risk:

1. Switch the server to the noop adapter.
2. Disable external exporter configuration.
3. Flush only safe aggregate buffers.
4. Verify no secrets or raw payloads were exported.
5. Rerun release gates before reenabling.

## Rollback

Return to `NoopScaleObservabilityAdapter`. No database rollback, migration rollback, queue drain, or app traffic migration is required for this wave.
