## V4-6 Inline Styles Phase 2

### Scope

This wave stays inside 5 production hotpath UI files:

- `src/screens/contractor/components/ActBuilderMaterialRow.tsx`
- `src/screens/contractor/components/ActBuilderWorkRow.tsx`
- `src/screens/accountant/components/AccountantCardContent.tsx`
- `src/screens/buyer/components/BuyerMobileItemEditorModal.tsx`
- `src/screens/buyer/components/BuyerRfqSheetBody.tsx`

No business logic, validation, callbacks, SQL/RPC, runtime config, or E2E flow logic changed.

### Why These Files

- `ActBuilderMaterialRow.tsx`: repeated row inside contractor act builder material list; rendered many times in a hot form surface.
- `ActBuilderWorkRow.tsx`: repeated row inside contractor act builder work list; same repeated-card pressure on Android renders.
- `AccountantCardContent.tsx`: dense accountant inbox/details card with attachment chips and action buttons.
- `BuyerMobileItemEditorModal.tsx`: input-heavy editor modal used in buyer item editing flows.
- `BuyerRfqSheetBody.tsx`: large RFQ sheet form with many pills, inputs, and repeated preview rows.

### Inline Style Reduction

| File | Before | After |
| --- | ---: | ---: |
| `ActBuilderMaterialRow.tsx` | 20 | 0 |
| `ActBuilderWorkRow.tsx` | 19 | 0 |
| `AccountantCardContent.tsx` | 24 | 0 |
| `BuyerMobileItemEditorModal.tsx` | 34 | 0 |
| `BuyerRfqSheetBody.tsx` | 32 | 0 |

Total selected-file reduction: `129 -> 0`.

### Dynamic Styles Intentionally Kept

- `ActBuilderMaterialRow.tsx`: include-state card and toggle styling still compose style arrays from `it.include`.
- `ActBuilderWorkRow.tsx`: include-state card and toggle styling still compose style arrays from `w.include`.
- `AccountantCardContent.tsx`: attachment-state palette colors, busy dimming, and web monospace styling remain state/platform-driven.
- `BuyerMobileItemEditorModal.tsx`: web/native shell-card selection and picker/button color or opacity remain platform/state-driven.
- `BuyerRfqSheetBody.tsx`: active pill states, remember/doc toggles, and publish-busy state remain selection-driven.

### Regression Coverage

- Added `tests/perf/v4_6_inline_styles_phase2.contract.test.ts` to enforce `0` raw `style={{}}` occurrences in the selected files.
