## V4-8 Accessibility Roles Phase 1

Status: GREEN_READY_FOR_COMMIT

Scope:
- Additive-only accessibility metadata on critical interactive controls.
- No business logic changes.
- No callback changes.
- No validation changes.
- No UI layout or style changes.
- No SQL/RPC changes.
- No runtime, app.json, eas.json, package.json, or release script changes.
- Maestro YAML changed only under V4-8B harness recovery.

Selected production files:
- `src/features/chat/ChatScreen.tsx`
- `src/screens/accountant/components/BottomBar.tsx`
- `src/screens/buyer/components/BuyerPropDetailsSheetBody.tsx`
- `src/screens/contractor/components/WorkModalOverviewSection.tsx`
- `src/screens/director/DirectorDashboard.tsx`
- `src/screens/foreman/ForemanEditorSection.tsx`
- `src/screens/warehouse/components/StockFactHeader.tsx`

Why selected:
- These files sit on critical business flows already covered by Maestro.
- They contain high-value interactive controls: submit, approve, receive, payment, progress, chat send, modal/card actions, and tabs.
- The changes are additive accessibility props only.

Accessibility coverage delta on selected files:
- `accessibilityRole`: `1 -> 37`
- `accessibilityLabel`: `11 -> 15`
- `accessibilityHint`: `0 -> 23`
- `accessibilityState`: `0 -> 13`

Per-file summary:
- `ChatScreen.tsx`: empty-state CTA, back button, assistant button, route chips, send button state/hint.
- `BottomBar.tsx`: PDF and Excel export buttons.
- `BuyerPropDetailsSheetBody.tsx`: PDF/accounting/rework actions and attachment header controls.
- `WorkModalOverviewSection.tsx`: contract details, progress submit, retry, act builder, summary PDF.
- `DirectorDashboard.tsx`: tabs, subtabs, finance cards, reports card.
- `ForemanEditorSection.tsx`: catalog, calc, and AI action buttons.
- `StockFactHeader.tsx`: pickers, recipient modal, remove action, clear action, submit action.

V4-8B harness recovery:
- Root cause: Maestro `scrollUntilVisible` and profile/RFQ viewport drift, not a proven product regression.
- Harness fix: replace brittle `scrollUntilVisible` profile-entry/RFQ steps with deterministic wait/scroll/tap sequences against existing selectors.
- Product files changed beyond original 7: NO.
- Critical suite before harness recovery: FAIL on profile/office/market entry selectors.
- Critical suite after harness recovery: PASS, `14/14` flows, report timestamp `2026-04-27 06:32:35 +06`.

Final gates before commit:
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS
- `npm test`: PASS
- `npm run e2e:maestro:critical`: PASS, `14/14`
- `git diff --check`: PASS
- `npm run release:verify -- --json`: gates PASS, readiness blocked only by expected dirty worktree before commit

Release disposition:
- OTA published: NO
- OTA command run: NO
- EAS build/submit run: NO
- Post-commit clean-tree `release:verify` required before marking final repository GREEN.
