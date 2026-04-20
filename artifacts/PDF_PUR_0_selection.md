# PDF-PUR-1 Selection

Status: GREEN candidate

## Selected slice

- Role: Purchaser / Buyer (`buyer`)
- Route: `app/(tabs)/office/buyer.tsx` -> `/office/buyer`
- Screen owner: `src/screens/buyer/BuyerScreen.tsx`
- Action owner: `src/screens/buyer/components/BuyerPropDetailsSheetBody.tsx`
- PDF open owner before change: `src/screens/buyer/useBuyerDocuments.ts`
- Selected PDF action: proposal details action bar `PDF` button (`onOpenPdf(pid)`)
- Document kind: `buyer_proposal`

## Why this slice

- It is the only direct PDF open action in the Purchaser proposal details surface.
- Before PDF-PUR-1, the action called the shared proposal PDF generator on every click through `generateProposalPdfDocument(..., originModule: "buyer")`.
- There was no Purchaser-owned source version, artifact version, descriptor reuse, or coalesced in-flight discipline for repeat opens.
- The details sheet already owns the exact proposal snapshot (`head` + `lines`), so versioning can be derived without changing formulas, totals, grouping, ordering, template semantics, or viewer behavior.

## Owner chain after change

- Source snapshot: `BuyerScreen` passes `propViewHead` + `propViewLines` from the already-loaded proposal details sheet.
- Manifest/version owner: `src/screens/buyer/buyerProposalPdf.shared.ts`
- Reuse/in-flight owner: `src/screens/buyer/buyerProposalPdf.service.ts`
- Click/open owner: `src/screens/buyer/useBuyerDocuments.ts`
- Viewer owner: unchanged, still `prepareAndPreviewPdfDocument`.
- Render/materialization owner: unchanged, still shared proposal PDF generator.

## Scope controls

- No formula changes.
- No totals/grouping/ordering changes.
- No template changes.
- No broad viewer rewrite.
- No cross-role changes.
- No hooks, adapters, VM shims, ignores, or suppressions.
