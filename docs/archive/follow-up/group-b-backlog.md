# Group B Follow-Up Backlog

Status: Review completed, not accepted in current phase.
Scope: Rejected and moved files from `isolation:B-risk-shared`.
Rule: This file is planning-only documentation. No logic changes.

## 1) Buyer inbox filtering review
- Files:
  - `src/lib/api/buyer.ts`
- Status:
  - `Rejected in current phase`
- Why moved:
  - UUID-only filter for `request_id` and fallback `return list` can change inbox dataset.
- Risk:
  - High `data-risk`
  - High `logic-risk`
- Checks:
  - Legacy/non-UUID `request_id` coverage
  - Inbox composition before/after
  - False positives/false negatives in rows
  - Empty/broken `request_id` behavior
- Acceptance criteria:
  - Dataset behavior documented and approved
  - Legacy cases validated
  - No silent selection drift
- Forbidden:
  - Ad-hoc filter changes without test comparison
- Tests/validation:
  - Manual scenario diff + SQL-backed sample validation
- Dependencies:
  - `requests` id formats, buyer inbox RPC behavior

## 2) Buyer request labels preload legacy compatibility
- Files:
  - `src/screens/buyer/hooks/useBuyerRequestLabels.ts`
- Status:
  - `Moved to separate task`
- Why moved:
  - UUID gate in preload may skip PR labels for legacy/non-UUID ids.
- Risk:
  - Medium `logic-risk`
  - Medium `compatibility-risk`
- Checks:
  - Presence of non-UUID ids in production data
  - PR label preload before/after
  - UI label rendering impact
- Acceptance criteria:
  - Legacy compatibility confirmed or formally dropped
  - Deterministic preload behavior
  - No silent label loss
- Forbidden:
  - Hard UUID gate without real-data verification
- Tests/validation:
  - Manual with mixed UUID/non-UUID fixtures
- Dependencies:
  - `resolve_req_pr_map` input expectations

## 3) Foreman screen refactor audit
- Files:
  - `app/(tabs)/foreman.tsx`
- Status:
  - `Rejected in current phase`
- Why moved:
  - Large functional refactor, not visual-only; PDF/share and flow wiring changed.
- Risk:
  - High `logic-risk`
  - High `flow-risk`
  - High `side-effect-risk`
- Checks:
  - Full 4-input flow
  - Draft/meta sync behavior
  - PDF preview/share behavior parity
  - Effect and state transition parity
- Acceptance criteria:
  - End-to-end scenarios pass
  - No functional drift proven
  - `onPdfShare` decision explicitly documented
- Forbidden:
  - Merge as "cleanup" without scenario acceptance
- Tests/validation:
  - Manual regression checklist on phone + web
- Dependencies:
  - Foreman hooks and editor section contracts

## 4) Shared role card primitive introduction
- Files:
  - `src/ui/AppRoleCard.tsx`
- Status:
  - `Moved to separate task`
- Why moved:
  - New shared primitive changes interaction contract and rollout surface.
- Risk:
  - Medium `shared-interaction-risk`
- Checks:
  - Press/disabled states
  - Scale animation behavior
  - Layout and accessibility contract
- Acceptance criteria:
  - Public props contract documented
  - Clear adoption boundaries by role
  - Interaction consistency validated
- Forbidden:
  - Mass rollout without explicit acceptance
- Tests/validation:
  - Visual + interaction parity checks
- Dependencies:
  - Director/Buyer row components

## 5) Director proposal row migration to shared card
- Files:
  - `src/screens/director/DirectorProposalRow.tsx`
  - Dependency: `src/ui/AppRoleCard.tsx`
- Status:
  - `Moved to separate task`
- Why moved:
  - Shared-card migration changes CTA/loading presentation behavior.
- Risk:
  - Medium `shared-interaction-risk`
  - Medium `presentation-behavior-risk`
- Checks:
  - Loading affordance parity
  - Disabled/open behavior parity
  - CTA readability parity
- Acceptance criteria:
  - No regression in loading/disabled signaling
  - Action remains unambiguous
- Forbidden:
  - Treating migration as style-only by default
- Tests/validation:
  - Manual review in Director list states
- Dependencies:
  - Director dashboard list wiring

## 6) Director dashboard card interaction changes
- Files:
  - `src/screens/director/DirectorDashboard.tsx`
- Status:
  - `Moved to separate task`
- Why moved:
  - Added press animations and row rendering changes (mixed behavior/presentation).
- Risk:
  - Medium `interaction-risk`
- Checks:
  - Press feedback and clickability
  - Content readability under animation
  - No behavior drift in open actions
- Acceptance criteria:
  - Interaction changes explicitly approved
  - Usability non-regression
  - Single-screen "Контроль" model preserved
- Forbidden:
  - Director flow changes under cosmetic scope
- Tests/validation:
  - Manual on mobile + web
- Dependencies:
  - `DirectorProposalRow` and shared card decision

## 7) Buyer search bar extraction
- Files:
  - `src/screens/buyer/components/BuyerSearchBar.tsx`
- Status:
  - `Optional standalone patch`
- Why moved:
  - Potentially safe, but only if independent from risky buyer rewiring.
- Risk:
  - Low/Medium `wiring-risk`
  - `encoding/UI-risk`
- Checks:
  - Standalone compatibility without `buyer.tsx` rewiring
  - Placeholder encoding
  - Props contract parity
- Acceptance criteria:
  - Can be applied independently without logic drift
  - Encoding is clean
  - Search behavior unchanged
- Forbidden:
  - Bundling with large buyer wiring refactor
- Tests/validation:
  - Snapshot/manual parity with previous search block
- Dependencies:
  - `buyer.styles.ts` and existing header/search layout

## 8) Buyer screen wiring refactor audit
- Files:
  - `app/(tabs)/buyer.tsx`
- Status:
  - `Rejected in current phase`
- Why moved:
  - Large wiring reshuffle with high functional drift risk.
- Risk:
  - High `wiring-risk`
  - High `flow-risk`
- Checks:
  - Search flow
  - Action handlers and hook contracts
  - FIO modal open path
  - Tabs/filters/details transitions
- Acceptance criteria:
  - Scenario parity confirmed
  - No hidden dependency on rejected changes
- Forbidden:
  - Labeling as import cleanup/extraction-only
- Tests/validation:
  - Manual regression matrix for Buyer screen
- Dependencies:
  - Buyer hooks/components contracts across tabs

## Operational note
- Group B remains isolated in stash and must not be reintroduced as a single batch.
- Any work from this backlog must be implemented as small, scoped tasks with separate acceptance.

## Review outcomes
- File: `src/lib/api/buyer.ts`
  Verdict: `REJECT`
  Why: UUID-only filtering plus `return list` fallback changes inbox dataset behavior.
  Phase note: `Rejected in current safe style phase`
- File: `src/screens/buyer/hooks/useBuyerRequestLabels.ts`
  Verdict: `MOVE TO SEPARATE TASK`
  Why: UUID gate can silently skip preload for legacy/non-UUID request IDs.
  Phase note: `Separate compatibility task`
- File: `app/(tabs)/foreman.tsx`
  Verdict: `REJECT`
  Why: Large functional rewiring (PDF/share and flow), not visual-only.
  Phase note: `Rejected in current safe style phase`
- File: `src/ui/AppRoleCard.tsx`
  Verdict: `MOVE TO SEPARATE TASK`
  Why: Opinionated interactive primitive (press scale, shell, chevron, disabled behavior).
  Phase note: `Separate shared UI contract task`
- File: `src/screens/director/DirectorProposalRow.tsx`
  Verdict: `MOVE TO SEPARATE TASK`
  Why: Migrating to `AppRoleCard` removes explicit loading/CTA affordance and changes disabled contract.
  Phase note: `Separate director interaction task`
- File: `src/screens/director/DirectorDashboard.tsx`
  Verdict: `MOVE TO SEPARATE TASK`
  Why: Introduces card press animation and chevron-driven affordance drift (interaction change).
  Phase note: `Separate director interaction task`
- File: `src/screens/buyer/components/BuyerSearchBar.tsx`
  Verdict: `MOVE TO SEPARATE TASK`
  Why: Potentially safe wrapper, but requires wiring in `buyer.tsx` to be complete.
  Phase note: `Optional standalone micro-task only`
- File: `app/(tabs)/buyer.tsx`
  Verdict: `REJECT`
  Why: Large buyer screen rewiring with high flow/contract drift risk.
  Phase note: `Rejected in current safe style phase`
