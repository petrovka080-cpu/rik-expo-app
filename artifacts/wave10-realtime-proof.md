# Wave 10: Realtime Hygiene / Channel Ownership Stabilization

## Scope
- Fixed only the active director realtime naming hygiene gap in `src/screens/director/director.lifecycle.ts`.
- Kept realtime transport, auth, payloads, cleanup rules, and business subscription semantics unchanged.

## What changed
- Replaced unstable `notif-director-rt:${Date.now()}` with stable `director:screen:realtime`.
- Centralized director handoff broadcast naming constants in `src/lib/realtime/realtime.channels.ts` so sender and receiver share the same ownership source without changing the wire value `director-handoff-rt`.

## Why this is safe
- The screen channel still binds the same `notifications`, `proposals`, `requests`, and `request_items` listeners.
- The handoff broadcast channel/event values did not change.
- Cleanup still uses the same `unsubscribe()` plus `removeChannel()` path.

## Lifecycle proof
- First mount: subscribes `director:screen:realtime` and `director-handoff-rt`.
- Blur/reopen: previous channels are unsubscribed and removed, then recreated with the same stable names.
- Unmount: both reopened channels are unsubscribed and removed.
- Timestamp churn proof: no created channel name matches `notif-director-rt:<timestamp>`.

## Commands
- `node node_modules/typescript/bin/tsc --noEmit --pretty false`
- `node node_modules/jest/bin/jest.js src/screens/director/director.lifecycle.realtime.test.tsx --runInBand --json --outputFile artifacts/wave10-director-realtime-jest.json`

## Result
- `GREEN`
