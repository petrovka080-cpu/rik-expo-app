# O1.1 Sync Rules

Status: GREEN for first-slice design.

## Version Rules

1. If a local snapshot has `baseServerRevision`, it means the local draft was last aligned with that server high-water mark.
2. Local edits update `updatedAt`, but preserve `baseServerRevision`.
3. Remote rehydrate sets `baseServerRevision` to the server high-water mark.
4. Successful sync sets `baseServerRevision` to the returned server high-water mark.
5. Missing revision metadata falls back to the previous semantic compare.

## O1.2 First Slice Rule

In foreman mutation worker remote inspection:

```text
local.baseServerRevision == remote.baseServerRevision
  -> server has not advanced beyond local base
  -> do not classify retryable failure as remote divergence

revision missing or inconclusive
  -> semantic snapshot fallback
```

## Not Changed

- submit flow
- approve/payment flow
- request item write semantics
- queue FIFO ordering
- queue persistence model
- offline fallback

## Future Rule

When DB has `draft_revision bigint`, compare should become:

```text
local.baseServerRevision == remote.draft_revision -> no remote divergence
local.baseServerRevision < remote.draft_revision  -> remote changed
local.localRevision > local.baseServerRevision     -> local dirty
```
