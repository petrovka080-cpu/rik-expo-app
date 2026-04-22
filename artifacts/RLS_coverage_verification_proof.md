## RLS_COVERAGE_VERIFICATION Proof

### Focused Verification Command
```powershell
npx jest tests/security/rlsCoverageVerification.test.ts --runInBand --no-coverage
```

### Focused Result
- `1` suite passed
- `6` tests passed

### What The Focused Suite Proves
- Buyer proposal submit keeps:
  - `proposal_submit_mutations_v1` under RLS
  - direct table access revoked from `anon` / `authenticated`
  - authenticated execute on `rpc_proposal_submit_v3(...)`
  - empty `search_path` hardening for wrapper/core/replay functions
- Warehouse receive keeps:
  - `warehouse_receive_apply_idempotency_v1` under RLS
  - no direct grants on the ledger
  - authenticated execute only on `wh_receive_apply_ui(...)`
  - hardened empty `search_path` wrapper using the idempotency ledger
- Warehouse request/free issue keep:
  - their idempotency ledgers under RLS
  - no direct table grants
  - authenticated execute on the exact public wrappers
  - empty `search_path` hardened wrappers in the warehouse P0 migration
- Accountant payment keeps:
  - `accounting_pay_invoice_mutations_v1` under RLS
  - direct table access revoked
  - internal apply boundary execute revoked
  - authenticated execute only on `accounting_pay_invoice_v1(...)`
  - empty `search_path` hardening on wrapper/apply/legacy helper signatures

### Global Gates
- `npx tsc --noEmit --pretty false` PASS
- `npx expo lint` PASS
- `npm test -- --runInBand` PASS
- `npm test` PASS
- `git diff --check` PASS

### Runtime / OTA Classification
- Runtime JS/TS semantics changed: `false`
- SQL/runtime host behavior changed: `false`
- OTA required: `false`
- OTA classification: `skipped`

### Why This Wave Is GREEN
- The selected highest-risk mutation boundaries are now guarded by one exact verification suite instead of scattered assumptions.
- No business logic changed.
- No runtime path changed.
- Full repository gates remained green after adding the verification guard.
