# 50K Idempotency Integration Boundary

S-50K-IDEMPOTENCY-INTEGRATION-1 adds a disabled-by-default server-side idempotency boundary for future BFF/job execution. It does not create tables, deploy storage, change RPC behavior, or enable live enforcement.

## Why This Exists

At 50K scale, retries, offline replay, double taps, and job replays can duplicate expensive or state-changing work. The boundary defines deterministic policies before live DB-backed or external idempotency storage is introduced.

## Disabled By Default

- `NoopIdempotencyAdapter` is the default-safe adapter.
- `InMemoryIdempotencyAdapter` is for deterministic local tests only.
- `ExternalIdempotencyAdapter` is a contract only.
- No production or staging storage is used.
- Existing app flows still run unchanged.

## Policy Table

| Operation | Strict | Payload hash | Replay id | Default enabled |
| --- | --- | --- | --- | --- |
| `proposal.submit` | yes | required | no | false |
| `warehouse.receive.apply` | yes | required | no | false |
| `accountant.payment.apply` | yes | required | no | false |
| `director.approval.apply` | yes | required | no | false |
| `request.item.update` | yes | required | no | false |
| `offline.replay.bridge` | yes | required | required | false |
| `proposal.submit.followup` | yes | required | no | false |
| `warehouse.receive.postprocess` | yes | required | no | false |
| `accountant.payment.postprocess` | yes | required | no | false |
| `director.approval.postprocess` | yes | required | no | false |

## Key Format

Keys are deterministic opaque fingerprints:

```text
idem:v1:<operation>:<hash>
```

Raw actor ids, request ids, replay ids, emails, phones, addresses, names, tokens, signed URLs, prompts, and AI responses are never included in the generated key. Payloads are represented by a deterministic canonical JSON hash only.

## Duplicate Behavior

- `duplicate_in_flight`: do not run the handler again.
- `duplicate_committed`: return a safe duplicate status.
- `failed_retryable`: allow a new reservation according to policy.
- `failed_final`: block repeated execution.
- `expired`: release before a future storage adapter re-reserves.

## Offline Replay

`offline.replay.bridge` requires:

- actor id
- request id
- replay mutation id
- operation type
- payload hash

This is metadata only. No live offline replay behavior changes in this wave.

## Future Storage

A future DB/external adapter can implement the same `reserve`, `commit`, `fail`, `getStatus`, `releaseExpired`, and `getHealth` methods. That adapter must be introduced in a separate owner-approved wave with migrations or provider credentials if needed.

## Rollback

Because this boundary is not imported by active app flows and is disabled by default, rollback is removing the integration files and artifacts. No production data or migrations are involved.
