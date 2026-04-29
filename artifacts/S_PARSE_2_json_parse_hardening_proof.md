# S-PARSE-2 JSON Parse Hardening Proof

Owner goal: 10K/50K+ readiness.

Status: GREEN.

## Scope

This production-safe wave removes direct `JSON.parse` from externally sourced runtime strings and routes those call-sites through the existing `safeJsonParse` helper.

This wave does not touch production, staging, Play Market, Android submit, OTA, EAS, SQL, RPC implementations, RLS, storage policies, package config, or native config.

## Counts

- Pre-wave direct runtime `JSON.parse` call-sites: 8.
- Post-wave direct runtime `JSON.parse` call-sites: 3.
- Pre-wave runtime `safeJsonParse` references: 24.
- Post-wave runtime `safeJsonParse` references: 33.

Remaining direct runtime `JSON.parse` call-sites:

- `src/lib/format.ts`: central `safeJsonParse` helper implementation.
- `src/screens/foreman/foreman.localDraft.ts`: local clone roundtrip.
- `src/screens/foreman/foreman.localDraft.ts`: local snapshot serialization roundtrip.

## Fixed Call-Sites

1. `src/lib/api/proposalIntegrity.ts`
   - Before: direct `JSON.parse` of RPC degraded error detail string.
   - After: `safeJsonParse`, preserving invalid-detail fail-closed fallback.
   - Safety: no raw detail payload in user-facing error.

2. `src/lib/ai/geminiGateway.ts`
   - Before: direct `JSON.parse` of Edge Function error body.
   - After: `safeJsonParse`, preserving parsed error extraction and raw-text fallback.
   - Safety: no new logging, no production env use.

3. `src/lib/pdf/directorPdfPlatformContract.ts`
   - Before: direct `JSON.parse` of Director PDF function error body.
   - After: `safeJsonParse`, preserving structured error extraction and raw-text fallback.
   - Safety: no PDF/report behavior change.

4. `src/screens/contractor/contractor.utils.ts`
   - Before: direct `JSON.parse` of `ACT_META` note suffix.
   - After: `safeJsonParse`, preserving selected-works extraction and observability fallback.
   - Safety: no contractor act business behavior change.

5. `src/screens/foreman/foreman.ai.ts`
   - Before: direct `JSON.parse` of cleaned AI response text.
   - After: `safeJsonParse` wrapper, preserving degraded parse error behavior.
   - Safety: no AI resolution business behavior change.

## Skipped

- `src/lib/format.ts`: intentional central helper implementation.
- `src/screens/foreman/foreman.localDraft.ts`: intentional in-process JSON serialization roundtrips for local draft clone/snapshot behavior.

## Tests

- Added malformed RPC detail test in `src/lib/api/proposalIntegrity.test.ts`.
- Added S-PARSE-2 source contract test in `tests/scale/sParse2JsonParse.contract.test.ts`.

## Safety Confirmations

Owner goal: 10K/50K+ readiness.
Raw JSON.parse risk reduced: YES.
Business logic changed: NO.
App behavior changed: NO.
Raw payload logged: NO.
PII logged: NO.
Production/staging touched: NO.
OTA/EAS triggered: NO.
Play Market / Android submit: DEFERRED_BY_OWNER, not touched.

## Gates

- `git diff --check`: PASS.
- `npx tsc --noEmit --pretty false`: PASS.
- `npx expo lint`: PASS.
- targeted tests: PASS.
  - `npm test -- --runInBand sParse2JsonParse proposalIntegrity foreman.ai`
  - `npm test -- --runInBand contractor directorPdfPlatform geminiGateway pdfPlatform contractor.utils`
- `npm test -- --runInBand`: PASS.
- `npm test`: PASS.
- `npm run release:verify -- --json`: pre-commit gates PASS; readiness blocked only because the S-PARSE-2 worktree was intentionally dirty before commit. Final clean-state `release:verify` must be run after commit/push.
