# Wave 3 Client Thin Adapter Summary

## Removed from the live runtime path

- `finRep` from `loadDirectorFinanceScreenScope(...)`
- `buildCompatibilityFinRep(...)`
- `EMPTY_FIN_REP`
- controller state that stored duplicated finance truth
- UI fallbacks from canonical values back to `finRep`

## What remains on the client

- fetch/invoke orchestration
- screen loading state
- modal/page navigation
- money formatting and text rendering
- mapping canonical supplier rows into the debt modal item shape
- using server-owned spend kind rows for spend modal display

## Why this is now a thin adapter

The live director finance screen no longer computes or re-owns its finance totals through a second compatibility object.

Instead it:
- receives canonical values from the server-owned boundary;
- forwards them into cards and modals;
- keeps only display formatting and interaction logic.

## What was intentionally not removed in this wave

- legacy compute helpers in `director.finance.compute.ts`

Reason:
- they are outside the live runtime path after this cutover;
- keeping them for parity/history is lower risk than broad deletion in the same wave.
