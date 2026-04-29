# Rate Limit Runbook

S-50K-RATE-ENFORCEMENT-1 is a production-safe disabled boundary. It is not live enforcement.

## Default State

- App runtime rate enforcement: disabled.
- Server-side enforcement: disabled.
- External store calls: disabled.
- Real users blocked: no.
- Production/staging traffic migrated: no.

## Operations Covered

- BFF reads: request proposal list, marketplace catalog search, warehouse ledger list, accountant invoice list, director pending list.
- Load hotspots: warehouse issue queue, buyer summary inbox, warehouse stock page.
- BFF mutations: proposal submit, warehouse receive apply, accountant payment apply, director approval apply, request item update.
- Jobs: notification fanout, cache read-model refresh, offline replay bridge.
- Realtime: channel setup and subscription refresh.
- AI: workflow action.

## Abuse Reason Codes

- `too_many_requests`
- `burst_exceeded`
- `duplicate_mutation_attempt`
- `missing_idempotency_key`
- `payload_too_large`
- `invalid_actor_scope`
- `suspicious_fanout`
- `disabled`

Reason codes are safe operational categories. Do not log raw payloads, prompts, responses, tokens, signed URLs, emails, phone numbers, or addresses.

## Enabling Later

Future live enforcement requires:

1. A server-side deployment target.
2. A real external store adapter, such as Redis or edge storage.
3. A staged shadow run proving no false positives.
4. A rollback switch that returns to noop enforcement.

Do not enable enforcement from mobile/app runtime.

## Rollback

Set the boundary back to noop or remove the server-side integration metadata. Since this wave does not create storage, migrations, or live enforcement, rollback does not require database action.
