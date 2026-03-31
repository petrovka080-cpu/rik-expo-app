# Wave 8: Test Governance

## Scope
- Added canonical verify entrypoints to `package.json`
- Added governance documentation and command registry
- No product/runtime semantics changed

## Added Scripts
- `verify:typecheck`
- `verify:wave3-offline-core`
- `verify:wave4-profile-static`
- `verify:wave4-profile-runtime`
- `verify:wave6-pdf`
- `verify:wave7-perf`
- `verify:local-role-smoke`
- `verify:governance:static`

## Commands Run
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
- Future waves no longer need ad-hoc command discovery to prove `GREEN`
