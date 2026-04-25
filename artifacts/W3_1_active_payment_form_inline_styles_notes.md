# W3.1 ActivePaymentForm Inline Style Extraction

## Scope

- Roadmap wave: `Wave 3 - INLINE_STYLE_HOTPATH_EXTRACTION`
- Slice: `ActivePaymentForm` hot render-path style extraction
- Domain: `PERFORMANCE`

## Why this slice

`src/screens/accountant/components/ActivePaymentForm.tsx` was one of the highest remaining Wave 3 hot-path files from the latest roadmap audit.

The risky part was not business logic. The form still created repeated render-time style objects in a high-churn surface:

- segmented payment-kind buttons
- full/partial mode buttons
- allocation clear/MAX controls
- invoice/date opacity fragments
- note/bank field opacity fragments
- full-mode summary pill

That adds avoidable allocation churn on a screen that already re-renders during proposal loads and per-line allocation edits.

## What changed

- Removed render-time style builder helpers from `ActivePaymentForm`:
  - `segBtn`
  - `smallBtn`
  - `miniBtn`
  - `pillBox`
  - `pillBoxTxt`
- Moved those static fragments into the local `StyleSheet.create(...)` block.
- Replaced repeated inline opacity/border fragments with stable style entries:
  - `opacity60`
  - `opacity55`
  - `opacity90`
  - `minHeight56`
  - `segBtnBase`, `segBtnActive`, `segBtnInactive`
  - `smallBtnBase`, `smallBtnNeutral`
  - `miniBtnBase`
  - `pillBox`, `pillBoxText`
  - `allocBoxOk`, `allocBoxWarn`
- Added a focused source-contract guard in `src/screens/accountant/components/ActivePaymentForm.test.tsx` so those render-time builders do not quietly return later.

## Explicit non-goals

- No payment formula changes
- No accounting RPC / SQL changes
- No observability flow changes
- No UI copy changes
- No navigation/runtime policy changes
- No temporary hooks or compatibility shims

## Changed files

- `src/screens/accountant/components/ActivePaymentForm.tsx`
- `src/screens/accountant/components/ActivePaymentForm.test.tsx`

## Pre-commit result

- Code slice status: `GREEN candidate`
- Remaining release step at artifact creation time: clean commit/push and post-push `release:verify`
