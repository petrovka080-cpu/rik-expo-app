# S_RUNTIME_04_FLATLIST_TUNING_BATCH_B

final_status: GREEN_FLATLIST_TUNING_BATCH_B

## Selected Files

- `src/features/chat/ChatScreen.tsx`
- `src/features/market/MarketHomeScreen.tsx`
- `src/screens/buyer/components/BuyerInboxSheetBody.tsx`
- `tests/perf/flatListTuningBatchB.contract.test.ts`

## Reason Selected

This continues the FlatList audit priority after Batch A. The wave is capped at three components, so it selects the next safe candidates: ChatScreen, MarketHomeScreen, and BuyerInboxSheetBody. DirectorDashboard remains for a later batch.

## Proof

- ChatScreen: added bounded thread list tuning, a stable message key extractor, and a stable empty component while preserving send, delete, read-marking, and scroll-to-end behavior.
- MarketHomeScreen: added bounded feed tuning and a stable listing key extractor while preserving the existing refresh and end-reached pagination behavior.
- BuyerInboxSheetBody: added bounded sheet-list tuning while preserving sticky attachment header behavior, focus-scroll recovery, existing key extractor, existing renderItem, and `removeClippedSubviews: false`.
- No list data arrays, ordering, item identity, selection/focus handlers, data fetching, visual behavior, or pagination semantics were changed.

## Metrics

- ChatScreen tuning prop occurrences: 0 -> 5; stable key extractor props: 0 -> 1; stable renderItem props: 1 -> 1.
- MarketHomeScreen tuning prop occurrences: 0 -> 5; stable key extractor props: 0 -> 1; stable renderItem props: 1 -> 1.
- BuyerInboxSheetBody tuning prop occurrences: 1 -> 5; stable key extractor props: 1 -> 1; stable renderItem props: 1 -> 1.

## Gates

- PASS: focused list/component tests, 3 suites / 11 tests.
- PASS: `npx tsc --noEmit --pretty false`.
- PASS: `npx expo lint`.
- PASS: `npm test -- --runInBand`, 679 suites passed / 1 skipped; 4026 tests passed / 1 skipped.
- PASS: architecture scanner, `GREEN_ARCHITECTURE_ANTI_REGRESSION_SUITE_ADDED`.
- PASS: `git diff --check`.
- PASS: forbidden pattern sweep for `@ts-ignore`, `as any`, and empty `catch {}`.
- PASS: artifact JSON parse.
- PENDING_POST_PUSH: `npm run release:verify -- --json`.

## Negative Confirmations

No force push, tags, secrets, Supabase project changes, spend cap changes, Realtime load test, destructive/unbounded DML, OTA/EAS/TestFlight/native builds, production mutation route broad enablement, cache enablement/route expansion, rate-limit changes, list ordering change, item identity change, selection/focus behavior change, visual behavior change, data fetching change, or pagination behavior change.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE.
