# H1.8 Release Proof

Final status: GREEN

## Scope

H1.8 adds a production-safe developer break-glass override for exactly one seeded developer account:

- user: `petrovka080@gmail.com`
- user_id: `9adc5ab1-31fa-41be-8a00-17eadbb37c39`

The override is server-side validated, can be disabled, has a 30-day TTL, supports only explicit allowed roles, and writes audit rows for effective-role selection, denial, disable, and RPC use.

## Exact files changed

- `supabase/migrations/20260416193000_h1_8_developer_break_glass_override.sql`
- `scripts/h1_8_developer_override_runtime_verify.ts`
- `src/lib/developerOverride.ts`
- `src/lib/developerOverride.test.ts`
- `src/lib/api/developerBreakGlassMigration.test.ts`
- `src/lib/appAccessModel.ts`
- `src/lib/appAccessModel.test.ts`
- `src/screens/office/officeAccess.types.ts`
- `src/screens/office/officeAccess.services.ts`
- `src/screens/office/officeHub.constants.ts`
- `src/screens/office/OfficeHubScreen.tsx`
- `src/screens/office/officeHub.styles.ts`
- `src/screens/office/officeHub.extraction.test.ts`
- `src/lib/pdf/directorPdfAuth.ts`
- `src/lib/pdf/directorPdfAuth.test.ts`
- `supabase/functions/director-pdf-render/index.ts`
- `supabase/functions/director-production-report-pdf/index.ts`
- `supabase/functions/director-subcontract-report-pdf/index.ts`
- `supabase/functions/director-finance-supplier-summary-pdf/index.ts`
- `artifacts/H1_8_developer_override_design.md`
- `artifacts/H1_8_route_rpc_alignment.md`
- `artifacts/H1_8_test_matrix.json`
- `artifacts/H1_8_runtime_proof.json`
- `artifacts/H1_8_release_proof.md`

## Tests run

### Targeted H1.8 tests

Command:

```bash
npx jest src/screens/office/officeHub.extraction.test.ts src/lib/api/developerBreakGlassMigration.test.ts src/lib/developerOverride.test.ts src/lib/appAccessModel.test.ts src/lib/pdf/directorPdfAuth.test.ts --runInBand --no-coverage
```

Result:

- 5 suites passed
- 31 tests passed

### Typecheck

Command:

```bash
npx tsc --noEmit --pretty false
```

Result: passed.

### Lint

Command:

```bash
npx expo lint
```

Result: passed with existing baseline warnings only:

- `app/(tabs)/add.tsx` import default-name warning
- `app/(tabs)/profile.tsx` import default-name warning
- `app/(tabs)/request/[id].tsx` console warning
- `app/calculator/_webStyleGuard.tsx` Unicode BOM warning
- `app/pdf-viewer.tsx` two unused variable warnings

### Full Jest

Command:

```bash
npx jest --no-coverage
```

Result:

- 274 suites passed
- 1 suite skipped
- 1552 tests passed
- 1 test skipped

## Migration proof

Command:

```bash
$env:SUPABASE_DB_PASSWORD=$env:SUPABASE_SERVICE_ROLE_KEY
npx supabase db push --linked --yes
npx supabase migration list --linked
```

Result:

- migration `20260416193000_h1_8_developer_break_glass_override` applied to linked production project.

## Runtime proof

Command:

```bash
npx tsx scripts/h1_8_developer_override_runtime_verify.ts
```

Result: GREEN.

Proved:

- target developer override exists, is enabled, has allowed roles, and has TTL;
- temporary verifier can select buyer and accountant effective roles;
- non-allowed role is denied with `42501`;
- while effective role is buyer, accountant-only context is denied;
- disabling override returns to base role behavior;
- expired override is inactive;
- audit rows are written.

Runtime proof artifact:

- `artifacts/H1_8_runtime_proof.json`

## Edge functions deployed

Commands:

```bash
npx supabase functions deploy director-pdf-render --project-ref nxrnjywzxxfdpqmzjorh --use-api --yes
npx supabase functions deploy director-production-report-pdf --project-ref nxrnjywzxxfdpqmzjorh --use-api --yes
npx supabase functions deploy director-subcontract-report-pdf --project-ref nxrnjywzxxfdpqmzjorh --use-api --yes
npx supabase functions deploy director-finance-supplier-summary-pdf --project-ref nxrnjywzxxfdpqmzjorh --use-api --yes
```

Result: all four functions deployed to project `nxrnjywzxxfdpqmzjorh`.

## Commit / push / OTA

Code commit:

- `5cb16fe373419814834da3148db04689b04e2730`
- message: `H1.8: add developer break-glass role override`

Push:

- `git push origin main`
- result: `d5f9b02..5cb16fe  main -> main`

Production OTA:

- command: `npx eas update --branch production --message "H1.8 developer override" --non-interactive`
- branch: `production`
- runtime version: `1.0.0`
- platform: `android, ios`
- update group ID: `8ad1943d-5d55-40f5-9c58-eb1607258771`
- Android update ID: `019d953d-5dcb-7b43-9b8f-aacc554942e3`
- iOS update ID: `019d953d-5dcb-7677-9830-5b807b9e82f2`
- EAS dashboard: `https://expo.dev/accounts/azisbek_dzhantaev/projects/rik-expo-app/updates/8ad1943d-5d55-40f5-9c58-eb1607258771`

Release proof commit:

- pending at time of this file update

## Remaining risks

- H1.8 wires the shared server role helper and director PDF Edge boundaries. Individual legacy RPCs that do not call `app_actor_role_context_v1` will not automatically gain impersonation until they are migrated in S2 follow-up work.
- The seeded developer override expires after 30 days and must be renewed deliberately if continued production verification is needed.
- UI role switcher only selects effective role; real mutation access still depends on each RPC using the server-side effective role helper.
