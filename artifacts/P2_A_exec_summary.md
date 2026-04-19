# P2-A Exec Summary

## Status

GREEN.

## Changed

- Removed dormant client-side proposal create/link/status write stages from `catalog.proposalCreation.service.ts`.
- Kept the existing canonical `rpc_proposal_submit_v3` adapter as the only primary create path.
- Added a source-level regression test that blocks reintroducing legacy client write orchestration into the service.

## Not Changed

- UI flow
- proposal business semantics
- RPC request/response contract
- duplicate recovery behavior
- SQL function bodies
- other catalog, PDF, Foreman, Office, AI, or queue modules

## Proof

- Targeted proposal atomic tests: PASS.
- TypeScript: PASS.
- Expo lint: PASS.
- Live RPC smoke: PASS for success, idempotent replay, director readback, and invalid-price rollback.
- Full Jest: PASS, 346/347 suites with 1 skipped and 2193/2194 tests with 1 skipped.
- Web smoke: PASS on `/office/director` and `/office/buyer`, no page errors and no 5xx.
- Android emulator smoke: PASS on `rik:///office/buyer`, no fatal logcat lines.

## Runtime Notes

- `scripts/proposal_atomic_boundary_verify.ts` is the live proposal submit proof for the transactional boundary.
- `scripts/proposal_live_submit_verify.ts` was not used as the final proof because the script currently fails before business logic on a Node/esbuild import of `react-native`.

## Next Gate

Commit, push, and OTA after final `git diff --check` and clean process check.
