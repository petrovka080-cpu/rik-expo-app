# STRICT_NULLCHECKS_PHASE_9 Notes

## Shortlist Probe

- Candidate A — `buyer_pdf_busy_boundary`
  - Domain: buyer PDF busy boundary
  - Entry / owner path:
    - `src/screens/buyer/useBuyerDocuments.ts`
    - `src/screens/buyer/useBuyerProposalAttachments.ts`
  - Real strict-null blockers:
    - none remain after `STRICT_BOUNDARY_PREP_PHASE_1`
  - Blast radius:
    - effectively closed; no new strict implementation value left for Phase 9
  - Cross-domain dependencies:
    - none worth reopening
  - Real touched-file count if selected:
    - 0-1
  - Focused tests:
    - `tests/strict-null/buyer.pdf.busy.boundary.phase1.test.ts`
  - Verdict:
    - safe, but too weak for a strict implementation wave because prep already removed the blockers

- Candidate B — `office_invite_access_boundary`
  - Domain: office route/access boundary
  - Entry / owner path:
    - `src/screens/office/officeHub.sections.tsx`
    - `src/screens/office/OfficeHubScreen.tsx`
  - Real strict-null blockers:
    - `invite.inviteHandoff` possibly null
    - `Promise<... | undefined>` not assignable to `Promise<... | null>`
  - Blast radius:
    - medium to high
  - Cross-domain dependencies:
    - office access screen data and route-level orchestration
  - Real touched-file count if selected:
    - 2+ owner files plus support types
  - Focused tests:
    - office screen tests exist, but the slice is still broad
  - Verdict:
    - blocked by remaining shared office dependencies; not the prepared buyer cluster

- Candidate C — `pdf_viewer_session_boundary`
  - Domain: route / viewer session lifecycle
  - Entry / owner path:
    - `app/pdf-viewer.tsx`
  - Real strict-null blockers:
    - `next.session` possibly null in multiple lifecycle branches
  - Blast radius:
    - medium
  - Cross-domain dependencies:
    - route lifecycle, viewer state, fallback rendering
  - Real touched-file count if selected:
    - at least 1 large route owner plus route tests
  - Focused tests:
    - `tests/routes/pdf-viewer.lifecycle.test.tsx`
  - Verdict:
    - real candidate, but too wide for the exact prepared buyer follow-up wave

- Candidate D — `buyer_owner_attachment_prefill_boundary`
  - Domain: buyer owner/process boundary
  - Entry / owner path:
    - `src/screens/buyer/hooks/useBuyerCreateProposalsFlow.ts`
    - `src/screens/buyer/hooks/useBuyerInboxRenderers.tsx`
    - `src/screens/buyer/hooks/useBuyerRfqPrefill.ts`
  - Real strict-null blockers before fixes:
    - `BuyerScreen.tsx(409,5)` incompatible attachment ref contract
    - `useBuyerInboxRenderers.tsx(207,62)` updater could write `Attachment | null`
    - `useBuyerRfqPrefill.ts(43,72)` `string | null | undefined` passed into `string | undefined`
  - Blast radius:
    - low after prep
  - Cross-domain dependencies:
    - buyer-local presentation/component/type graph only
  - Real touched-file count:
    - 11 source/test files plus 1 phase config
  - Focused tests:
    - existing `src/screens/buyer/buyer.silentCatch.test.ts`
    - new `tests/strict-null/buyer.owner.boundary.phase9.test.ts`
  - Verdict:
    - chosen for Phase 9

## Why This Cluster Was Chosen

- `STRICT_BOUNDARY_PREP_PHASE_1` removed the shared buyer PDF busy-contract blockers.
- That prep left a genuinely narrower buyer-local owner boundary:
  - attachment state selection
  - attachment submit contract normalization
  - RFQ prefill metadata normalization
- This slice improves process/boundary control without reopening the already-prepared PDF busy boundary and without pulling in office/pdf-viewer cross-domain work.

## What Stayed Out Of Scope

- office invite/access lifecycle
- pdf-viewer session lifecycle
- the already-green buyer PDF busy boundary
- any SQL/RPC semantics
- any broad buyer screen refactor
- any global `strictNullChecks` rollout

## Real Nullable Blockers Closed

- Attachment ref contract now accepts the actual `DraftAttachmentMap` owner shape and normalizes it before submit.
- Attachment picker updates no longer store `null` as a fake ready attachment state.
- RFQ prefill now classifies `missing / invalid / loaded / ready / terminal` explicitly and no longer uses `catch {}`.
- Narrow strict compile was kept honest by replacing barrel/aggregator type imports with direct local type/component imports inside the chosen buyer cluster.
