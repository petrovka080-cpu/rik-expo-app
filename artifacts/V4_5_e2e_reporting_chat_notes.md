# V4-5 E2E Reporting And Chat Notes

## Goal
Close the remaining Phase 2 E2E blind spots after Director, Foreman, Accountant, and Contractor by adding:

- chat critical path coverage
- director report PDF smoke coverage
- contractor PDF smoke coverage

## Scope Kept

- Maestro YAML flows
- deterministic E2E seed data
- minimal selector surface for stable automation
- contract coverage for runner, seed wiring, and selectors
- inline text cleanup only inside files already touched by this wave

## Changes

- Added deterministic marketplace chat seed support in `scripts/e2e/_shared/maestroCriticalBusinessSeed.ts`
- Added `maestro/flows/critical/chat-message.yaml`
- Added `maestro/flows/critical/contractor-pdf-smoke.yaml`
- Added `maestro/flows/critical/director-report-pdf-smoke.yaml`
- Wired the new flows into `scripts/e2e/run-maestro-critical.ts`
- Added stable chat selector coverage in `src/features/chat/ChatScreen.tsx`
- Extended `tests/e2e/maestroCriticalBusinessPhase1.contract.test.ts`
- Normalized readable text in the active wave files where encoding artifacts were encountered

## Stabilization Notes

- Fresh release APK installs could surface an Android package-launch race; the runner now waits until the installed app is actually launchable before starting Maestro
- Chat flow now relies on stable input and send-button selectors instead of brittle visual-only matching
- Proof logs intentionally summarize noisy bundle output as successful bundle/build completion rather than preserving progress-bar noise

## Safety

- No business logic changes
- No SQL or RPC changes
- No runtime or `app.json` changes
- No fake backend responses
- No temporary hooks or hidden bypasses
