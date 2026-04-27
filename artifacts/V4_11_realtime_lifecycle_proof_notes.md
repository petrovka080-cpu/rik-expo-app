# V4-11 Realtime Lifecycle Proof Notes

## Scope

V4-11 audited realtime and lifecycle subscription cleanup symmetry. This was a proof wave first. Runtime behavior was not refactored.

## Inventory

- Direct `.subscribe(` sites under `src`: 10 total.
- Production direct `.subscribe(` sites: 8.
- Test-only direct `.subscribe(` sites: 2.
- `subscribeChannel` consumer sites: 7.
- `.unsubscribe(` call sites: 7.
- `.removeChannel(` call sites: 10.
- `AppState.addEventListener` sites: 5.
- `NetInfo` sites: 0.
- `Network.addNetworkStateListener` sites: 1.

## Findings

- Real cleanup gap found: `src/lib/api/requestDraftSync.service.ts` created a one-shot director handoff channel and removed it only after successful subscribe/send.
- Failure path risk: `CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED`, or send rejection skipped `removeChannel`.
- Fix: moved one-shot channel cleanup into `Promise.finally`.
- Runtime semantics changed: NO. The broadcast and notification behavior stays the same; only cleanup symmetry changed.
- Additional proof added for warehouse expense realtime cleanup in the existing warehouse lifecycle test file to avoid increasing source module count.

## Existing Cleanup Paths Verified

- `src/lib/realtime/realtime.client.ts`: central `subscribeChannel` cleanup through returned detach, channel replacement guard, token guard, and session boundary `clearRealtimeSessionState`.
- `src/screens/director/director.lifecycle.realtime.ts`: screen and handoff channels unsubscribe/remove on blur/unmount and previous-channel replacement.
- `src/screens/buyer/buyer.subscriptions.ts`: legacy helper returns detach and removes both direct channels.
- `src/screens/warehouse/hooks/useWarehouseExpenseRealtime.ts`: tab/unmount cleanup unsubscribes and removes channel.
- `src/lib/offline/platformNetwork.service.ts`: service listener has explicit `stopPlatformNetworkService`, and store subscribers receive caller-owned unsubscribe functions.
- `AppState` listeners inspected have remove paths through hook cleanup, batcher dispose, or screen lifecycle cleanup.

## Safety

- Business logic changed: NO.
- Network behavior changed: NO.
- Offline queue behavior changed: NO.
- Auth lifecycle behavior changed: NO.
- Zustand store contracts changed: NO.
- SQL/RPC changed: NO.
- Runtime/app.json/eas.json changed: NO.
- Maestro YAML changed: YES, profile-entry harness only after root cause was proven.
- Performance/style files touched: NO.
- OTA published: NO.

## Maestro Recovery

- Initial blocker: `npm run e2e:maestro:critical` failed on profile/office entry selectors after manual launch and infra smoke passed.
- Root cause evidence: screenshot/hierarchy showed the Profile screen was open and the Office card existed below the viewport, but fixed `scroll` steps stopped above `profile-open-office-access`.
- Harness fix: replaced fixed profile-entry `scroll` steps with `scrollUntilVisible` against existing stable selectors.
- Product UI/testIDs/business logic changed for this recovery: NO.
- Critical after recovery: PASS, 14/14 flows, report timestamp `2026-04-27 17:56:14 Asia/Bishkek`.

Conclusion: V4-11 lifecycle proof is GREEN after one narrow cleanup fix, focused proof tests, and a measured profile-entry harness repair. OTA was not published.
