# S-RT-4 realtime channel capacity proof

Status: GREEN_IMPLEMENTATION_LIMITS_OWNER_ACTION

## Scope inspected

- S-RT-2 matrix: `artifacts/S_RT_2_realtime_budget_filtering_matrix.json`
- S-RT-2 proof: `artifacts/S_RT_2_realtime_budget_filtering_proof.md`
- Shared budget declarations: `src/lib/realtime/realtime.channels.ts`
- Central lifecycle helper: `src/lib/realtime/realtime.client.ts`
- Direct realtime/broadcast surfaces:
  - `src/screens/buyer/buyer.subscriptions.ts`
  - `src/screens/director/director.lifecycle.realtime.ts`
  - `src/screens/warehouse/hooks/useWarehouseExpenseRealtime.ts`
  - `src/lib/api/requestDraftSync.service.ts`
  - `src/lib/api/request.repository.ts`
- Central lifecycle call-sites:
  - `src/screens/buyer/buyer.realtime.lifecycle.ts`
  - `src/screens/accountant/accountant.realtime.lifecycle.ts`
  - `src/screens/warehouse/warehouse.realtime.lifecycle.ts`
  - `src/screens/contractor/contractor.realtime.lifecycle.ts`
  - `src/screens/director/director.finance.realtime.lifecycle.ts`
  - `src/screens/director/director.reports.realtime.lifecycle.ts`
  - `src/lib/chat_api.ts`

## Changed files

- `scripts/realtime/channelCapacity.mjs`
- `tests/realtime/channelCapacity.test.ts`
- `docs/operations/realtime_capacity_runbook.md`
- `artifacts/S_RT_4_channel_capacity_matrix.json`
- `artifacts/S_RT_4_channel_capacity_proof.md`

## Implementation

Added `scripts/realtime/channelCapacity.mjs`.

The script:

- supports JSON output
- defaults to static analysis only
- never imports Supabase
- never opens realtime channels
- never mutates production
- never reads production credentials
- accepts `--scales 1000,5000,10000,50000`
- reads only safe account-limit variables:
  - `SUPABASE_REALTIME_MAX_CHANNELS`
  - `SUPABASE_REALTIME_MAX_CONCURRENT_CLIENTS`
  - `SUPABASE_REALTIME_MAX_MESSAGES_PER_SECOND`
- reports `owner_action_required` when account limits are missing
- redacts dynamic channel identifiers such as `chat:listing:<redacted>`

## Extracted binding matrix

The static upper-bound model covers 12 current channel-producing sources.

| Source | Path | Channels per mounted source | Cleanup exists | Duplicate detection exists | Filtering exists |
| --- | --- | ---: | --- | --- | --- |
| buyer-summary | `src/screens/buyer/buyer.realtime.lifecycle.ts` | 1 | YES | YES | YES |
| accountant-screen | `src/screens/accountant/accountant.realtime.lifecycle.ts` | 1 | YES | YES | YES |
| warehouse-screen | `src/screens/warehouse/warehouse.realtime.lifecycle.ts` | 1 | YES | YES | NO |
| contractor-screen | `src/screens/contractor/contractor.realtime.lifecycle.ts` | 1 | YES | YES | NO |
| director-finance | `src/screens/director/director.finance.realtime.lifecycle.ts` | 1 | YES | YES | NO |
| director-reports | `src/screens/director/director.reports.realtime.lifecycle.ts` | 1 | YES | YES | NO |
| listing-chat | `src/lib/chat_api.ts` | 1 | YES | YES | YES |
| buyer-legacy-subscriptions | `src/screens/buyer/buyer.subscriptions.ts` | 2 | YES | YES | YES |
| warehouse-expense-legacy | `src/screens/warehouse/hooks/useWarehouseExpenseRealtime.ts` | 1 | YES | YES | NO |
| director-screen-handoff | `src/screens/director/director.lifecycle.realtime.ts` | 2 | YES | YES | YES |
| request-draft-sync-handoff | `src/lib/api/requestDraftSync.service.ts` | 1 | YES | NO | YES |
| request-repository-handoff | `src/lib/api/request.repository.ts` | 1 | YES | NO | YES |

Conservative total: 14 channels per active user.

This intentionally overestimates normal role-specific usage because it assumes
every active user mounts every covered source. That gives safer planning math
without generating live realtime load.

## Projection table

| Active users | Projected channels | Verified within account limits |
| ---: | ---: | --- |
| 1,000 | 14,000 | UNKNOWN - account limits missing |
| 5,000 | 70,000 | UNKNOWN - account limits missing |
| 10,000 | 140,000 | UNKNOWN - account limits missing |
| 50,000 | 700,000 | UNKNOWN - account limits missing |

10K realtime capacity: IMPLEMENTATION_READY_BUT_ACCOUNT_LIMITS_UNVERIFIED

50K realtime capacity: ARCHITECTURE_OR_ACCOUNT_LIMIT_VERIFICATION_REQUIRED

## Account limits

- `SUPABASE_REALTIME_MAX_CHANNELS`: missing
- `SUPABASE_REALTIME_MAX_CONCURRENT_CLIENTS`: missing
- `SUPABASE_REALTIME_MAX_MESSAGES_PER_SECOND`: missing
- status: `owner_action_required`

No verified 10K realtime capacity claim is made in this wave.

## Commands run

- `git status --short`
- `git rev-parse HEAD`
- `git rev-parse origin/main`
- `git diff --check`
- `git diff --name-only`
- `git diff --stat`
- `npm run release:verify -- --json`
- `rg "realtime|Realtime|channel|subscribe|subscription|removeChannel|unsubscribe|channel budget|channelBudget|duplicate|budget" src app tests docs artifacts`
- `rg "S_RT_2|S-RT-2|realtime budget|channel budget" artifacts docs tests src app`
- `rg "supabase.channel|supabase.removeChannel|on\\(" src app`
- `rg "buyer|accountant|warehouse|contractor|director|finance|reports" src app`
- `node scripts/realtime/channelCapacity.mjs --scales 1000,5000,10000,50000 --json`
- `npm test -- --runInBand channelCapacity`

## Tests

Added `tests/realtime/channelCapacity.test.ts`.

Coverage includes:

- valid JSON output
- scale parsing
- invalid scale rejection
- missing account limits return `owner_action_required`
- provided account limits produce true/false capacity checks
- projection math
- null limit verification when limits are missing
- dynamic/private channel name redaction
- no Supabase realtime API usage in the capacity script
- no production env credential reads
- no secret output

Targeted result:

- `npm test -- --runInBand channelCapacity`: PASS

## Gates

Full gates are run after this proof is written:

- `git diff --check`
- `npx tsc --noEmit --pretty false`
- `npx expo lint`
- `npm test -- --runInBand`
- `npm test`
- `npm run release:verify -- --json`

## Safety confirmations

- Business logic changed: NO
- App behavior changed: NO
- SQL/RPC changed: NO
- RLS/storage changed: NO
- Production touched: NO
- Production writes: NO
- Realtime load generated: NO
- Raw production data read: NO
- Secrets printed: NO
- Secrets committed: NO
- OTA published: NO
- EAS build triggered: NO
- EAS submit triggered: NO
- EAS update triggered: NO
