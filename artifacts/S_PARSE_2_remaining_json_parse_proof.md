# S-PARSE-2 Remaining JSON Parse Hardening Proof

Owner goal: 10K/50K+ readiness.

Status: GREEN.

## Scope

This production-safe wave reduced remaining raw `JSON.parse` risk in runtime paths by routing externally sourced JSON strings through the existing `safeJsonParse` helper.

This wave did not touch production, staging, Play Market, Android submit, OTA, EAS, SQL, RPC implementations, RLS, storage policies, package config, or native config.

## Counts

- Raw `JSON.parse` before: 8.
- Raw `JSON.parse` after: 3.
- Fixed call-sites: 5.
- Runtime `safeJsonParse` references before: 24.
- Runtime `safeJsonParse` references after: 33.

Remaining raw parse call-sites:

- `src/lib/format.ts`: central guarded `safeJsonParse` helper implementation.
- `src/screens/foreman/foreman.localDraft.ts`: local clone serialization roundtrip.
- `src/screens/foreman/foreman.localDraft.ts`: local snapshot serialization roundtrip.

## Fixed Call-Sites

1. `src/lib/api/proposalIntegrity.ts`
   - Before: direct `JSON.parse` of RPC degraded error detail string.
   - After: `safeJsonParse`, preserving invalid-detail fail-closed fallback.
   - Fallback behavior preserved: YES.

2. `src/lib/ai/geminiGateway.ts`
   - Before: direct `JSON.parse` of Edge Function error body.
   - After: `safeJsonParse`, preserving parsed error extraction and raw-text fallback.
   - Fallback behavior preserved: YES.

3. `src/lib/pdf/directorPdfPlatformContract.ts`
   - Before: direct `JSON.parse` of Director PDF function error body.
   - After: `safeJsonParse`, preserving structured error extraction and raw-text fallback.
   - PDF/report/export completeness changed: NO.

4. `src/screens/contractor/contractor.utils.ts`
   - Before: direct `JSON.parse` of `ACT_META` note suffix.
   - After: `safeJsonParse`, preserving selected-works extraction and observability fallback.
   - Business behavior changed: NO.

5. `src/screens/foreman/foreman.ai.ts`
   - Before: direct `JSON.parse` of cleaned AI response text.
   - After: `safeJsonParse` wrapper, preserving degraded parse error behavior.
   - AI prompt behavior changed: NO.

## Remaining Raw Parse Classification

- `src/lib/format.ts`: central helper implementation, intentionally contains raw `JSON.parse` to provide guarded parsing to the rest of the app.
- `src/screens/foreman/foreman.localDraft.ts`: intentional in-process serialization roundtrips. These are not external payload parses; changing them would require separate runtime compatibility proof for clone/snapshot semantics.

## Tests

- Added malformed RPC detail coverage in `src/lib/api/proposalIntegrity.test.ts`.
- Added source contract coverage in `tests/scale/sParse2JsonParse.contract.test.ts`.

Targeted test commands passed:

- `npm test -- --runInBand sParse2JsonParse proposalIntegrity foreman.ai`
- `npm test -- --runInBand contractor directorPdfPlatform geminiGateway pdfPlatform contractor.utils`

Full gates passed:

- `git diff --check`
- `npx tsc --noEmit --pretty false`
- `npx expo lint`
- `npm test -- --runInBand`
- `npm test`
- `npm run release:verify -- --json`

## Safety Confirmations

Owner goal: 10K/50K+ readiness.
Raw JSON.parse risk reduced: YES.
Malformed JSON crash risk reduced: YES.
Business logic changed: NO.
AI prompt behavior changed: NO.
PDF/report/export completeness changed: NO.
Production/staging touched: NO.
OTA/EAS triggered: NO.
Play Market / Android submit: DEFERRED_BY_OWNER, not touched.

No raw payloads, PII, secrets, Supabase keys, service-role keys, JWTs, signed URLs, or production/staging credentials were added or committed.
