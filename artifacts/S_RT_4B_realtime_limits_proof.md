# S-RT-4B Realtime Account Limits Proof

Owner goal: 10K/50K+ readiness.

## Status

Status: `PARTIAL_LIMITS_MISSING`.

`SUPABASE_REALTIME_MAX_CHANNELS` and `SUPABASE_REALTIME_MAX_CONCURRENT_CLIENTS` are present in the agent process, but the capacity script could not parse them as positive integer account limits. `SUPABASE_REALTIME_MAX_MESSAGES_PER_SECOND` is missing. Because usable numeric channel/client limits are not available, 1K/5K/10K/50K realtime capacity remains unknown rather than verified.

No realtime load was generated. No channels were opened. Production was not touched.

## Commands Run

```bash
git status --short
git rev-parse HEAD
git rev-parse origin/main
git diff --check
node -e "const names=['SUPABASE_REALTIME_MAX_CHANNELS','SUPABASE_REALTIME_MAX_CONCURRENT_CLIENTS','SUPABASE_REALTIME_MAX_MESSAGES_PER_SECOND']; console.log(JSON.stringify(Object.fromEntries(names.map(n=>[n,process.env[n]?'present_redacted':'missing'])),null,2));"
rg "channelCapacity|S_RT_4|S-RT-4|SUPABASE_REALTIME|realtime capacity|projected.*channels" scripts tests docs artifacts src
rg "claimRealtimeChannel|realtime channel|channel budget|duplicate channel" src tests docs artifacts
node scripts/realtime/channelCapacity.mjs --json
node scripts/realtime/channelCapacity.mjs --scales 1000,5000,10000,50000 --json
npm test -- --runInBand channelCapacity
npm test -- --runInBand realtime
```

## ENV

- `SUPABASE_REALTIME_MAX_CHANNELS`: present_redacted, not parseable as a positive integer limit
- `SUPABASE_REALTIME_MAX_CONCURRENT_CLIENTS`: present_redacted, not parseable as a positive integer limit
- `SUPABASE_REALTIME_MAX_MESSAGES_PER_SECOND`: missing

## Limits Used

- max channels: unavailable
- max concurrent clients: unavailable
- max messages/sec: unavailable
- limits source: partial_env

## Projection

- channels per active user: 14
- 1K projected channels: 14,000
- 5K projected channels: 70,000
- 10K projected channels: 140,000
- 50K projected channels: 700,000

## Conclusions

- 1K realtime: unknown
- 5K realtime: unknown
- 10K realtime: unknown
- 50K realtime: unknown
- 50K requires enterprise/account upgrade: unknown until positive integer account limits are supplied

## Safety

- realtime load generated: NO
- realtime channels opened: 0
- production touched: NO
- production writes: NO
- business logic changed: NO
- app behavior changed: NO
- SQL/RPC changed: NO
- RLS/storage changed: NO
- package/native config changed: NO
- secrets printed: NO
- secrets committed: NO
- OTA published: NO
- EAS build triggered: NO
- EAS submit triggered: NO
- EAS update triggered: NO
- Play Market touched: NO

## Gates

- `git diff --check`: PASS
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand channelCapacity`: PASS
- `npm test -- --runInBand realtime`: PASS
- `npm test -- --runInBand`: PASS
- `npm test`: PASS
- `npm run release:verify -- --json`: pending post-push final gate

## Readiness Impact

S-RT-4B did not verify 10K or 50K realtime limits because numeric account limits were not usable. The proof still confirms the static projection baseline and keeps the wave production-safe: no realtime load, no channel storm, no production data access, and no writes.

## Next Recommended Wave

Provide positive integer values for `SUPABASE_REALTIME_MAX_CHANNELS` and `SUPABASE_REALTIME_MAX_CONCURRENT_CLIENTS`, provide `SUPABASE_REALTIME_MAX_MESSAGES_PER_SECOND`, then rerun S-RT-4B. If 10K verifies, continue with S-QUEUE-1 or S-PAG-6 based on latest hotspots.
