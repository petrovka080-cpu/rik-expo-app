# 50K Background Jobs Integration

Status: disabled by default.

This boundary prepares server-side background jobs for 50K scale without changing current app behavior. The current mobile/app runtime continues to use existing flows. No production or staging queue provider is deployed by this document.

## Why Jobs Are Needed

At 50K users, heavy operations should not stay synchronous in client-driven request paths:

- proposal submit follow-up work
- warehouse receive post-processing
- accountant payment post-processing
- director approval post-processing
- request item update post-processing
- PDF and report generation
- notification fan-out
- cache read-model refresh
- offline replay bridge work

The boundary defines contracts, payload safety, idempotency requirements, retry policy, and dead-letter metadata before any real queue provider is connected.

## Disabled By Default

All job policies use `defaultEnabled: false`.

The default adapter is `NoopJobAdapter`. It accepts no live execution and performs no network calls. `InMemoryJobAdapter` exists only for deterministic local tests. `ExternalJobAdapterContract` is an interface-level contract for a future BullMQ, Inngest, Cloud Tasks, or other queue provider.

## Policy Table

| Job type | Priority | Idempotency | Rate limit | Payload |
| --- | --- | --- | --- | --- |
| `proposal.submit.followup` | high | required | `proposal.submit` | 16 KB |
| `warehouse.receive.postprocess` | high | required | `warehouse.receive.apply` | 16 KB |
| `accountant.payment.postprocess` | high | required | `accountant.payment.apply` | 8 KB |
| `director.approval.postprocess` | high | required | `director.approval.apply` | 8 KB |
| `request.item.update.postprocess` | normal | required | `request.item.update` | 8 KB |
| `pdf.document.generate` | normal | required | `pdf.report.generate` | 32 KB |
| `director.report.generate` | normal | required | `pdf.report.generate` | 32 KB |
| `notification.fanout` | low | required | `notification.fanout` | 8 KB |
| `cache.readmodel.refresh` | low | required | `cache.readModel.refresh` | 16 KB |
| `offline.replay.bridge` | high | required | `offline.replay.bridge` | 16 KB |

## Payload Safety

Job payloads must reject or redact sensitive content before they can be queued:

- raw access tokens
- refresh tokens
- service-role keys
- signed URLs
- raw prompts
- raw AI responses
- full addresses
- phone numbers
- email values unless the policy allows redaction

Payload size is bounded per job policy. Error responses are deterministic and do not include raw payload values.

## Idempotency

Mutating and replay jobs require idempotency metadata:

- `proposal.submit.followup`
- `warehouse.receive.postprocess`
- `accountant.payment.postprocess`
- `director.approval.postprocess`
- `request.item.update.postprocess`
- `offline.replay.bridge`

This wave does not add DB-backed idempotency storage. It only verifies contract-level requirements and maps each job to the existing idempotency contract.

## Retry And Dead Letter

Retry behavior reuses the existing retry policy table. Dead-letter summaries store only operation, reason, attempt count, safe error class, and redacted context. Raw payloads and PII are not stored.

## BFF And Cache Integration

The staging BFF mutation route registry exposes disabled job metadata for:

- `proposal.submit`
- `warehouse.receive.apply`
- `accountant.payment.apply`
- `director.approval.apply`
- `request.item.update`

Cache-related jobs expose invalidation tags for future server execution:

- `cache.readmodel.refresh`
- `notification.fanout`

No invalidation runs live in this wave.

## Future Queue Provider

A future integration can plug in BullMQ, Inngest, Cloud Tasks, or another queue provider behind `ExternalJobAdapterContract`. That work must add provider credentials and deployment separately and must start in staging/shadow mode.

## Rollback

Because execution is disabled by default, rollback is removing the adapter/policy wiring or leaving `NoopJobAdapter` selected. No production queue state is created by this wave.
