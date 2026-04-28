# Realtime Capacity Runbook

## Current Model

S-RT-2 added deterministic realtime budget and duplicate detection around the
current channel surfaces:

- Central lifecycle helper: `src/lib/realtime/realtime.client.ts`
- Shared binding declarations and budget constants:
  `src/lib/realtime/realtime.channels.ts`
- Direct legacy/broadcast paths:
  `src/screens/buyer/buyer.subscriptions.ts`
  `src/screens/director/director.lifecycle.realtime.ts`
  `src/screens/warehouse/hooks/useWarehouseExpenseRealtime.ts`
  `src/lib/api/requestDraftSync.service.ts`
  `src/lib/api/request.repository.ts`

S-RT-4 does not open realtime channels. It uses repo-static binding data to
estimate the active channel count at fixed scale points.

## Run The Capacity Script

```bash
node scripts/realtime/channelCapacity.mjs --scales 1000,5000,10000,50000 --json
```

The script is analysis-only. It does not import Supabase, read production
credentials, connect to realtime, publish OTA, or mutate release channels.

## Providing Account Limits

Only provide account-specific Supabase limits through these safe variables:

```text
SUPABASE_REALTIME_MAX_CHANNELS
SUPABASE_REALTIME_MAX_CONCURRENT_CLIENTS
SUPABASE_REALTIME_MAX_MESSAGES_PER_SECOND
```

Example:

```bash
SUPABASE_REALTIME_MAX_CHANNELS=200000 \
SUPABASE_REALTIME_MAX_CONCURRENT_CLIENTS=20000 \
SUPABASE_REALTIME_MAX_MESSAGES_PER_SECOND=100000 \
node scripts/realtime/channelCapacity.mjs --scales 1000,5000,10000,50000 --json
```

Do not pass Supabase URLs, anon keys, service-role keys, EXPO tokens, Sentry
tokens, JWTs, signed URLs, or user data to this script.

## Interpreting Results

`GREEN_IMPLEMENTATION_LIMITS_OWNER_ACTION` means the capacity matrix and
projection math are implemented, but account-specific Supabase limits were not
provided. This is implementation-ready, not a verified 10K/50K capacity claim.

`GREEN_VERIFIED` means all required account limits were provided and the script
compared projections against them.

`owner_action_required` means the owner must verify Supabase account limits in
the dashboard, support plan, or provider documentation before claiming verified
capacity.

The script currently uses a conservative static upper-bound model: projected
channels equal active users multiplied by all covered channel-producing sources.
This can overestimate a normal role-specific session, but it is safer for
10K/50K readiness planning.

## What Makes 10K Unverified

10K remains unverified when:

- account-specific max channels are missing
- account-specific concurrent client limits are missing
- account-specific messages/sec limits are missing
- projected channels exceed the provided max channel limit
- active users exceed the provided concurrent client limit

## What Makes 50K Architecture-Required

50K should be treated as architecture/account-limit work when projected channel
counts exceed verified limits or when message-rate capacity cannot be proven.
Safe next actions include reducing per-user mounted realtime sources, moving
some flows to polling or server-side fan-in, and splitting channels by role or
tenant only after RLS and visibility semantics are proven.

## Incident Signals

Watch for:

- `realtime_channel_duplicate_detected`
- `realtime_channel_budget_warning`
- subscription error spikes
- reconnect storms
- channel closed/timed-out spikes
- client refresh coalescing queues that do not drain

## Safe Next Actions

If projections exceed verified limits:

1. Do not raise app-side budgets silently.
2. Confirm Supabase account limits with the owner.
3. Identify the highest channel-per-user surfaces in the matrix.
4. Prefer reducing mounted channels or consolidating safe flows.
5. Do not add broader filters or tenant-specific channel names unless business
   visibility and RLS behavior are proven.
6. Re-run `npm run release:verify -- --json` after script/docs changes.

## S-RT-4 Safety

This wave does not publish OTA, run EAS build/submit/update, touch production,
generate realtime load, or change app behavior.
