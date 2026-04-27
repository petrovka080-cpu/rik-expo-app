# V4-10A noImplicitAny Phase 1 Notes

## Scope

V4-10A prepares and enables `noImplicitAny` without enabling full `strict: true`.

This wave is limited to compiler/type-safety cleanup. It does not change runtime behavior,
business logic, validation, callbacks, app runtime config, SQL/RPC, or Maestro YAML.

## Precheck

- HEAD before: `5354c2c5b559761aee9bab56a68bc971ba4eaf92`
- origin/main before: `5354c2c5b559761aee9bab56a68bc971ba4eaf92`
- Worktree before: clean
- Baseline `npx tsc --noEmit --pretty false`: PASS
- Baseline release guard: PASS, OTA disposition `skip`

## noImplicitAny Probe

- Initial `npx tsc --noEmit --pretty false --noImplicitAny`: FAIL
- Total diagnostics: 42
- Error codes: TS7006, TS7024, TS7022, TS7053, TS2322
- Decision rule: 42 <= 80, so fixes were allowed.

Top initial files by diagnostic count:

- `artifacts/office-warehouse-avd-login-probe.ts`: 10
- `tests/office/officeAccess.members.service.pagination.test.ts`: 4
- `src/lib/pdf/director/production.ts`: 4
- `src/lib/pdf/director/subcontract.ts`: 4
- `scripts/buyer_tender_publish_runtime_verify.ts`: 4
- `scripts/profile_stabilization_verify.ts`: 3
- `src/lib/api/requests.test.ts`: 2
- `src/screens/director/director.observability.test.tsx`: 2
- `src/screens/buyer/buyer.subscriptions.test.ts`: 2
- `src/lib/catalog/catalog.request.service.ts`: 2

## Implementation Notes

- Enabled `"noImplicitAny": true` while keeping `"strict": false`.
- Excluded generated local diagnostics folders from normal project compilation:
  `artifacts/**/*` and `diagnostics/**/*`.
- Replaced implicit callback/self-referential mock types with explicit narrow types.
- Reused existing PDF domain model types instead of broad `Record<string, any>`.
- Typed script probe rows and Android XML predicates explicitly.
- Replaced dynamic catalog payload indexing with a typed key picker.

## Guardrails

- `strict: true` enabled: NO
- New `as any` added: NO
- New `@ts-ignore` added: NO
- New `@ts-expect-error` added: NO
- New `@ts-nocheck` added: NO
- Business logic changed: NO
- Runtime behavior changed: NO
- SQL/RPC changed: NO
- Maestro YAML changed: NO
- App runtime config changed: NO
- OTA published: NO
