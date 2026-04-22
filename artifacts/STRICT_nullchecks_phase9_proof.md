# STRICT_NULLCHECKS_PHASE_9 Proof

## Probe Result

- Read-only shortlist completed across four candidates.
- Chosen exact slice: `buyer_owner_attachment_prefill_boundary`.
- Reason: it is the prepared buyer-local follow-up slice with real remaining strict-null blockers and a now-limited blast radius.

## Proof That Prep-Wave Reduced Blast Radius

- Before `STRICT_BOUNDARY_PREP_PHASE_1`, buyer PDF work still had shared `busy: unknown` drift across:
  - `src/screens/buyer/useBuyerDocuments.ts`
  - `src/screens/buyer/useBuyerProposalAttachments.ts`
- After prep, those hooks no longer appear in the strict-null blocker list.
- Re-running the global strict probe for buyer/office/pdf-viewer after this wave shows:
  - no remaining matches for:
    - `BuyerScreen.tsx`
    - `useBuyerCreateProposalsFlow`
    - `useBuyerInboxRenderers`
    - `useBuyerRfqPrefill`
  - remaining strict debt is still elsewhere:
    - `app/pdf-viewer.tsx`
    - `src/screens/office/officeHub.sections.tsx`
    - `src/screens/office/OfficeHubScreen.tsx`
- That is the exact Phase 9 proof point: prep removed the shared PDF busy boundary, and strict implementation could then stay local to the buyer owner boundary instead of reopening the PDF hooks.

## Before / After Blocker List

### Before

- `src/screens/buyer/BuyerScreen.tsx(409,5)`
  - `RefObject<DraftAttachmentMap>` was not assignable to the previous attachment ref contract
- `src/screens/buyer/hooks/useBuyerInboxRenderers.tsx(207,62)`
  - attachment updater could return `Attachment | null | undefined`
- `src/screens/buyer/hooks/useBuyerRfqPrefill.ts(43,72)`
  - `string | null | undefined` was passed into `inferCountryCode(..., phoneRaw?: string)`

### After

- The focused global strict probe no longer reports any of the buyer Phase 9 paths above.
- `npx tsc --project tsconfig.strict-null-phase9-buyer-owner-boundary.json --pretty false` passes for the exact strict slice.

## Contract / State Proof

### Attachment Boundary

- `useBuyerCreateProposalsFlow.ts`
  - now accepts the real `DraftAttachmentMap` owner ref
  - normalizes it into the submit payload contract before invoking the mutation owner
- `useBuyerInboxRenderers.tsx`
  - now applies attachment changes through `applyBuyerDraftAttachmentSelection`
  - `null` means remove the attachment entry, not store a fake attachment state

### RFQ Prefill Boundary

- `useBuyerRfqPrefill.ts`
  - now classifies metadata explicitly:
    - `loading`
    - `missing`
    - `invalid`
    - `loaded`
    - `ready`
    - `terminal`
- Contract rules:
  - `null` / `undefined` metadata => `missing`
  - empty object / all-empty strings => `loaded`
  - valid non-empty strings => `ready`
  - malformed non-string payload => `invalid`
  - thrown fetch => `terminal`
- `catch {}` was removed and replaced with explicit observability via `recordCatchDiscipline(...)`

## Regression Proof

Focused tests:

- `tests/strict-null/buyer.owner.boundary.phase9.test.ts`
  - valid input
  - null
  - undefined
  - partial payload
  - malformed payload
  - empty payload
  - invalid state
  - loading state
  - ready state
  - terminal state
  - unchanged valid prefill success path

Changed-file regression:

- `src/screens/buyer/buyer.silentCatch.test.ts`
  - proves `useBuyerRfqPrefill.ts` no longer contains `catch {}`
  - proves the wave surfaces:
    - `rfq_prefill_failed`
    - `rfq_prefill_invalid_payload`

## Unchanged Runtime Semantics

- Valid buyer attachment success path is unchanged:
  - selecting an attachment still stores it by supplier key
  - clearing an attachment now matches the existing buyer sheet behavior by removing the key instead of storing `null`
- Valid RFQ prefill success path is unchanged:
  - country code still comes from the same city/phone inference
  - email still trims the same metadata field
  - phone still strips to the same local digits
- No business logic changed:
  - no permission changes
  - no role changes
  - no RPC changes
  - no network orchestration changes
- Invalid RFQ metadata is no longer silently coerced into a valid prefill state. This is strict boundary hardening on broken input, not a success-path behavior change.

## Compile / Gate Proof

- `npx tsc --project tsconfig.strict-null-phase9-buyer-owner-boundary.json --pretty false` PASS
- `npx tsc --noEmit --pretty false` PASS
- `npx expo lint` PASS
- `npx jest tests/strict-null/buyer.owner.boundary.phase9.test.ts --runInBand` PASS
- `npx jest src/screens/buyer/buyer.silentCatch.test.ts --runInBand` PASS
- `npm test -- --runInBand` PASS
- `npm test` PASS
- `git diff --check` PASS
  - note: Git emitted line-ending conversion warnings for two existing working-copy files, but the command exited successfully and reported no whitespace/diff hygiene violations

## OTA Note

- This wave changes runtime TS/TSX inside the buyer screen boundary, so OTA is required if the full gate set stays green.
