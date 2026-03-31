# Wave 8: Test Governance

## Scope
- Added canonical verify entrypoints to `package.json`
- Added governance documentation and command registry
- Enabled bounded Jest coverage collection with realistic thresholds for critical governance modules
- No product/runtime semantics changed

## Added Scripts
- `verify:typecheck`
- `verify:wave3-offline-core`
- `verify:wave4-profile-static`
- `verify:wave4-profile-runtime`
- `verify:wave6-pdf`
- `verify:wave7-perf`
- `verify:wave8-coverage`
- `verify:local-role-smoke`
- `verify:governance:static`

## Commands Run
```powershell
npm run verify:wave8-coverage
```

Result: passed
- statements: `62.34%`
- branches: `42.75%`
- functions: `74.61%`
- lines: `64.26%`

```powershell
npm run verify:governance:static
```

Result: passed

This expanded to:
- `npm run verify:typecheck`
- `npm run verify:wave3-offline-core`
- `npm run verify:wave4-profile-static`
- `npm run verify:wave6-pdf`
- `npm run verify:wave7-perf`

## Outcome
- Canonical static gates are now reproducible from `package.json`
- Runtime verify entrypoints are documented and standardized
- Bounded coverage thresholds now enforce a minimal regression barrier across governed critical modules
- Future waves no longer need ad-hoc command discovery to prove `GREEN`
