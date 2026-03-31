# Director Finance Supplier PDF Web Click Proof

## What was already fixed
- Exact 403 root cause was inside the supplier PDF function auth guard.
- Canonical auth fix remains in `src/lib/pdf/directorPdfAuth.ts` and `supabase/functions/director-finance-supplier-summary-pdf/index.ts`.
- This batch did not relax security, did not trust `user_metadata`, and did not route through a service-role client bypass.

## Real localhost web click path
- Base URL: `http://localhost:8081`
- Supplier row visible: true
- Supplier detail opened: true
- Exact PDF button clicked: true
- Function status: 200
- signedUrl returned: true
- /pdf-viewer reached: true
- iframe src present: true
- viewer ready: true

## Next blocker
- No post-function blocker remained on the exact supplier PDF web path.
- Runtime symptom: none

## Verdict
- supplierPdfRealClickPathExercised = true
- supplierPdfFunctionPostStatus = 200
- supplierPdfSignedUrlReturned = true
- supplierPdfViewerOrOpenReached = true
- supplierPdfOpened = true
- Final status: GREEN
