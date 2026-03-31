**Wave 12 Proof**

- `tsc`: `node node_modules/typescript/bin/tsc --noEmit --pretty false`
- `jest`: `npm run verify:wave12-tests`
- `smoke`: `npm run verify:wave12-smoke`

**Results**

- `tsc`: passed
- `jest`: 5 suites passed, 17 tests passed
- `smoke`: passed

**Smoke coverage**

- protected route `/profile` opened with seeded auth session
- edit profile modal opened and closed
- listing modal opened and closed
- web runtime finished with `pageErrors=[]` and `badResponses=[]`

**Artifacts**

- `artifacts/wave12-residual-jest.json`
- `artifacts/wave12-minimal-web-smoke.json`
- `artifacts/wave12-minimal-web-smoke.md`
