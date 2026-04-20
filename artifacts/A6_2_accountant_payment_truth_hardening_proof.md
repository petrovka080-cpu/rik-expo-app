# A6.2 Accountant Payment Truth Hardening Proof

Status: GREEN

## Commands

```bash
npm test -- accountant.paymentForm.helpers --runInBand --no-coverage
npm test -- ActivePaymentForm --runInBand --no-coverage
npm test -- accountant --runInBand --no-coverage
npx tsc --noEmit --pretty false
npx expo lint
git diff --check
npm test -- --runInBand
npm test
```

## Results

- `accountant.paymentForm.helpers`: PASS, 5 tests
- `ActivePaymentForm`: PASS, 10 tests
- `accountant`: PASS, 22 suites / 88 tests
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `git diff --check`: PASS
- `npm test -- --runInBand`: PASS, 373 suites / 2376 tests / 1 skipped
- `npm test`: PASS, 373 suites / 2376 tests / 1 skipped

## Before / After

Before:

- Visible accountant payment rest could come from server canonical outstanding.
- Submit `amount` could remain empty or stale because it was synchronized only for partial allocation mode.

After:

- Full proposal mode submit `amount` follows server canonical rest.
- Partial proposal mode submit `amount` follows allocation sum.
- Non-proposal/manual amount behavior is unchanged.
- Stale server responses and load failures still do not publish submit amount.
