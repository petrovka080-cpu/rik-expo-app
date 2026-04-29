# 50K Rate Limiting And Abuse Guard Contracts

## 1. Current State

The app now has disabled-by-default BFF/server API, cache/read-model, background job, and idempotency/retry/dead-letter scaffolds. They define future 50K boundaries without moving current app traffic.

This wave adds the next safety layer for future server/BFF/background-job operations: rate limiting and abuse guard contracts.

This wave does not enable live rate limiting.
This wave does not block users.
This wave does not deploy server infrastructure.
This wave does not create database tables.
This wave does not migrate production traffic.
This wave defines disabled-by-default contracts only.

## 2. Why 50K Needs Server-Side Rate Limiting

At 50K, repeated list refreshes, marketplace searches, reconnect storms, duplicate submits, expensive report generation, and notification fan-out can amplify traffic faster than client-side guards can control. Server-side rate limiting gives future BFF and worker layers a shared way to cap abusive or accidental load before it reaches database, cache, external side effects, or report workers.

## 3. Why Client-Side Rate Limiting Is Insufficient

Client-side throttles are useful for user experience, but they cannot protect shared infrastructure by themselves. Clients can be stale, offline, retried by mobile lifecycle events, or bypassed entirely. Future enforcement must happen at the server boundary where opaque subjects, idempotency keys, cache policy, and abuse signals can be evaluated consistently.

## 4. Target Operations Requiring Limits

Initial future rate-limit operations:

- `request.list`
- `proposal.list`
- `marketplace.search`
- `catalog.search`
- `proposal.submit`
- `warehouse.receive.apply`
- `accountant.payment.apply`
- `accountant.invoice.update`
- `director.approval.apply`
- `request.item.update`
- `pdf.report.generate`
- `notification.fanout`
- `cache.readModel.refresh`
- `realtime.channel.setup`
- `offline.replay.bridge`

All are contract-only in this wave.

## 5. Rate Limit Subjects

Future server keys may combine low-cardinality subject classes:

- `user`
- `company`
- `ip`
- `device`
- `session`
- `api_key`
- `global`

The scaffold requires opaque subject keys. It rejects obvious PII, raw payloads, tokens, JWTs, signed URLs, and raw business identifiers.

## 6. Rate Limit Buckets

Buckets:

- `read_light`
- `read_heavy`
- `write_sensitive`
- `expensive_job`
- `external_side_effect`
- `realtime`
- `auth_sensitive`
- `global_safety`

Read-heavy flows cover hot lists and search. Write-sensitive flows cover mutations and approvals. Expensive jobs cover report/cache work. External side effects cover payment, notification, and integration-like operations. Realtime covers setup and reconnect storms.

## 7. Policy Table

| Bucket | Window | Max requests | Burst | Enforcement in this wave |
| --- | ---: | ---: | ---: | --- |
| `read_light` | 60s | 120 | 30 | `disabled_scaffold` |
| `read_heavy` | 60s | 60 | 15 | `disabled_scaffold` |
| `write_sensitive` | 60s | 20 | 5 | `disabled_scaffold` |
| `expensive_job` | 300s | 10 | 2 | `disabled_scaffold` |
| `external_side_effect` | 300s | 5 | 1 | `disabled_scaffold` |
| `realtime` | 60s | 30 | 5 | `disabled_scaffold` |
| `auth_sensitive` | 300s | 10 | 3 | `disabled_scaffold` |
| `global_safety` | 60s | 1000 | 200 | `disabled_scaffold` |

These values are scaffold defaults, not live production limits.

## 8. Abuse Signals

Future abuse signals:

- `too_many_requests`
- `burst_spike`
- `expensive_job_spike`
- `realtime_reconnect_storm`
- `offline_replay_storm`
- `external_side_effect_replay`
- `invalid_payload_repeated`
- `unknown`

In this wave every decision is observe-only and cannot block users.

## 9. Safe Response And Error Rules

Future rate-limited responses must:

- use generic safe messages
- avoid raw database, cache, queue, or external error bodies
- avoid user, company, request, proposal, invoice, payment, or document identifiers
- avoid names, emails, phones, addresses, signed URLs, tokens, and JWTs
- avoid raw payload storage
- use low-cardinality operation and bucket labels

The current abuse guard helper returns observe-only decisions with redacted safe messages.

## 10. PII And Secret Key Rules

Future keys must be built from opaque subject keys only. They must not include:

- names
- phone numbers
- emails
- addresses
- raw invoice/proposal/report payloads
- raw PDF/document contents
- signed URLs
- JWTs
- Supabase keys
- server admin credentials
- raw business identifiers

This wave does not read client secrets, server env, or production credentials.

## 11. Future BFF Integration

Future BFF endpoints should select a policy before executing work. In shadow mode, they can record would-limit decisions without blocking. In enforced mode, owner-approved rollout should start with non-critical read-heavy flows before sensitive mutations.

This wave does not create endpoints or route traffic through a BFF.

## 12. Future Background Job Integration

Future workers should rate-limit enqueue and execution separately for expensive jobs, external side effects, notification fan-out, and cache refresh. Retry policies from the idempotency layer should treat rate-limit responses as bounded transient failures.

This wave does not deploy workers or queues.

## 13. Future Cache / Read-Model Integration

Cache-backed policies should prefer serving safe cached read models over generating repeated DB fan-out. Cache refresh operations still need rate limits so invalidation storms do not flood workers.

This wave does not deploy cache infrastructure.

## 14. Future Idempotency Integration

Sensitive operations should combine:

- opaque idempotency key
- rate-limit policy
- bounded retry policy
- redacted dead-letter record on exhaustion

This wave only links those responsibilities at the contract level.

## 15. Migration Phases

1. Contract-only scaffold.
2. Staging-only shadow decisions with no blocking.
3. Read-heavy BFF shadow metrics.
4. Cache-backed read-heavy enforcement pilot.
5. Expensive job enqueue limits in staging.
6. Mutation-sensitive shadow decisions with idempotency parity.
7. Owner-approved production rollout behind feature flags.
8. Full 50K proof pack with load, limits, rollback, and observability evidence.

## 16. What This Wave Does NOT Do

This wave does not:

- enable live rate limiting
- block users
- deploy server infrastructure
- deploy rate-limit infrastructure
- create database tables
- create migrations
- create Edge Functions
- migrate production traffic
- replace existing Supabase client flows
- change business logic
- change user-visible behavior
- change SQL, RPC, RLS, or storage policies
- change package, app, native, or release config
- publish OTA
- trigger EAS build, submit, or update
- claim 50K readiness
