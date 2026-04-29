# S-RT-4B Realtime Account Limits Proof

Owner goal: 10K/50K+ readiness.
Production writes: NO.
Realtime load generated: NO.
Service-role used: NO.
OTA/EAS triggered: NO.
Play Market / Android submit: DEFERRED_BY_OWNER, not touched.

## Status

Status: `PARTIAL_OWNER_ACTION_REQUIRED`.

Local projection command:

```bash
node scripts/realtime/channelCapacity.mjs --scales 1000,5000,10000,50000 --json
```

Result:

- account limits verified: NO
- channels per active user: 14
- projected channels at 10K active users: 140000
- projected channels at 50K active users: 700000
- realtime load generated: NO

## Missing Account Limits

- `SUPABASE_REALTIME_MAX_CHANNELS`: MISSING
- `SUPABASE_REALTIME_MAX_CONCURRENT_CLIENTS`: MISSING
- `SUPABASE_REALTIME_MAX_MESSAGES_PER_SECOND`: MISSING

## Tests

```bash
npm test -- --runInBand channelCapacity
```

Result: PASS, 7 tests.

## Owner Action Required

Provide account-specific Supabase realtime channel/client/message limits or an owner-approved account/tier proof. Without account-specific limits, 10K/50K realtime capacity is not verified.

## Safety

- Production touched: NO
- Production writes: NO
- Realtime load generated: NO
- SQL/RPC changed: NO
- RLS/storage changed: NO
- Secrets printed: NO
