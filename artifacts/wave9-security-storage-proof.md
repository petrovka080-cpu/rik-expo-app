# Wave 9 Security / Storage Hardening

- Status: `GREEN`
- Scope stayed narrow: storage minimization, auth/bootstrap hardening, and `eval("require")` removal

## Storage treatment

- FIO confirm flows now use bounded envelopes instead of raw duplicate plaintext keys on every new write.
- Accountant cross-storage prefs now have policy-based TTL by key class.
- AI chat/session persistence is now treated as session-like:
  - `24h` retention
  - `sessionStorage` on web
  - bounded snapshots on native storage

## Auth/bootstrap hardening

- `src/lib/supabaseClient.ts` no longer uses `eval("require")`.
- Bootstrap failures now emit explicit observability events instead of disappearing silently:
  - `ensure_signed_in_session_check_failed`
  - `ensure_signed_in_router_redirect_failed`
  - `current_user_id_session_check_failed`

## Commands run

1. `node node_modules/typescript/bin/tsc --noEmit --pretty false`
   - passed
2. `node node_modules/jest/bin/jest.js src/lib/storage/fioPersistence.test.ts src/features/ai/assistantStorage.test.ts src/lib/crossStorage.test.ts src/lib/server/supabaseBoundary.test.ts --runInBand --json --outputFile artifacts/wave9-security-storage-jest.json`
   - passed
   - 4 suites passed
   - 8 tests passed
3. `npm run verify:local-role-smoke`
   - passed
   - web auth/session route smoke green
4. `npm run verify:wave4-profile-runtime`
   - passed
   - web green
   - android green
   - iOS host-blocked as before

## Artifacts

- `artifacts/wave9-storage-matrix.json`
- `artifacts/wave9-auth-bootstrap-note.json`
- `artifacts/wave9-eval-require-decision.json`
- `artifacts/wave9-security-storage-proof.json`
- `artifacts/wave9-security-storage-jest.json`
- `artifacts/local-role-screen-access-proof.json`
- `artifacts/wave4-profile-runtime.json`
