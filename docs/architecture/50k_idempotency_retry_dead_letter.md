# 50K Idempotency, Retry, And Dead-Letter Contracts

## 1. Current State

The app now has disabled-by-default BFF/server API, cache/read-model, and background job scaffolds. They define future 50K boundaries without moving current app traffic.

This wave adds the next safety layer for future server/BFF/background-job operations: idempotency, bounded retries, and redacted dead-letter contracts.

This wave does not deploy queue infrastructure.
This wave does not create database tables.
This wave does not migrate production traffic.
This wave does not execute background jobs.
This wave defines disabled-by-default contracts only.

## 2. Why 50K Needs Idempotency

At 50K, retries, reconnects, mobile app resumes, and duplicate submits can turn a single user action into repeated server work. Future BFF and worker flows must treat sensitive operations as idempotent so a repeated request can be safely recognized instead of double-applying a mutation.

The first operations that require idempotency are proposal submit, warehouse receive/apply, accountant payment/invoice state changes, director approvals, request item updates, report/PDF generation, notification fan-out, cache refresh, and any bridge from offline replay into a server operation.

## 3. Why Retries Must Be Bounded

Retries protect transient failures, but unbounded retries create load storms and support ambiguity. Future server/job execution must:

- retry only transient classes
- cap attempt count
- cap delay
- add jitter for retryable transient classes
- stop immediately for validation, permission, and business-rule failures
- route exhausted failures into a redacted dead-letter contract

This wave does not change existing offline replay behavior.

## 4. Why Dead-Letter Handling Is Required

Dead-letter handling gives support and operations a safe place to inspect retry-exhausted or invalid work without retaining raw payloads. Future records must store operation kind, reason, attempts, timestamp, safe error class, and redacted context only.

No dead-letter storage is created in this wave.

## 5. Target Operations Requiring Idempotency

Target operation contracts:

- `proposal.submit`
- `warehouse.receive.apply`
- `accountant.payment.apply`
- `accountant.invoice.update`
- `director.approval.apply`
- `request.item.update`
- `pdf.report.generate`
- `notification.fanout`
- `cache.readModel.refresh`
- `offline.replay.bridge`

All are contract-only in this wave.

## 6. Idempotency Key Rules

Future idempotency keys must be opaque and safe:

- key required for sensitive operations
- raw payload storage forbidden
- PII in keys forbidden
- user names, phones, emails, addresses, raw invoice/proposal payloads, document contents, signed URLs, JWTs, Supabase keys, and server admin credentials forbidden
- replay window must be positive
- TTL must be bounded
- future server implementation may derive keys from safe fingerprints only

The scaffold validates contract shape and can build a safe fingerprint wrapper for opaque keys. It does not claim cryptographic hashing.

## 7. Retry Policy Table

| Retry class | Retryable | Max attempts | Backoff | Jitter | Dead-letter on exhaustion |
| --- | --- | ---: | --- | --- | --- |
| `network` | yes | 3 | exponential | yes | yes |
| `rate_limit` | yes | 5 | exponential | yes | yes |
| `server_error` | yes | 3 | exponential | yes | yes |
| `external_timeout` | yes | 3 | exponential | yes | yes |
| `validation` | no | 1 | none | no | yes |
| `permission` | no | 1 | none | no | yes |
| `business_rule` | no | 1 | none | no | yes |
| `unknown` | no | 1 | none | no | yes |

Unknown failures are conservative until business context proves a narrower retry class.

## 8. Dead-Letter Record Rules

Dead-letter contracts must:

- never store raw payload
- never store PII
- store redacted context only
- include operation kind
- include reason
- include attempt count
- include created timestamp
- include a safe generic error class
- avoid raw external error bodies

The dead-letter scaffold is disabled by default and does not write storage.

## 9. PII And Secret Redaction Rules

Future logging and storage must redact or omit:

- token-like strings
- JWT-like strings
- signed URLs
- email, phone, and address-like strings
- raw user/company/request/proposal/invoice/payment identifiers
- Supabase keys
- server admin credentials
- raw external error bodies

Only low-cardinality context is allowed.

## 10. Future Server/BFF Integration

Future BFF endpoints should require idempotency for mutation-sensitive operations before executing them. A request with a repeated safe key should return the previously recorded outcome or a safe replay status without reapplying the mutation.

This wave does not create endpoints.

## 11. Future Background Job Integration

Future workers should require idempotency keys for queue enqueue and execution phases. Job contracts should use bounded retry policies and produce redacted dead-letter records when retries are exhausted.

This wave does not deploy workers or queues.

## 12. Future Cache Invalidation Integration

Cache/read-model refresh jobs should use idempotency keys so duplicate invalidation events can coalesce safely. Read-after-write-sensitive models must not serve stale data as correctness proof.

This wave does not emit or consume invalidation events.

## 13. Migration Phases

1. Contract-only scaffold.
2. Staging-only server idempotency store proof.
3. Staging-only retry/dead-letter dry runs.
4. Shadow execution for one non-user-visible job class.
5. Parity proof against current client behavior.
6. Owner-approved production rollout behind feature flag.
7. Incident playbooks and dead-letter support workflow.
8. Full 50K proof pack.

## 14. What This Wave Does NOT Do

This wave does not:

- deploy server infrastructure
- deploy queue or worker infrastructure
- create database tables
- create migrations
- create dead-letter storage
- migrate production traffic
- replace existing Supabase client flows
- execute jobs
- change business logic
- change user-visible behavior
- change SQL, RPC, RLS, or storage policies
- change package, app, native, or release config
- publish OTA
- trigger EAS build, submit, or update
- claim 50K readiness
