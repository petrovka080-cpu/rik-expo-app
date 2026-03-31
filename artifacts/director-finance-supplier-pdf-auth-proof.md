# Director Finance Supplier PDF Auth Proof

## What was already fixed
- Exact old 403 root cause lived inside the function auth guard, not in missing JWT and not in CORS.
- Canonical auth boundary remains in `src/lib/pdf/directorPdfAuth.ts` and `supabase/functions/director-finance-supplier-summary-pdf/index.ts`.
- Auth still requires an authenticated user and still refuses `user_metadata` as a trusted role source.

## Runtime proof
- Remote function URL: `https://nxrnjywzxxfdpqmzjorh.supabase.co/functions/v1/director-finance-supplier-summary-pdf`
- Positive signed app role case: HTTP 200, renderBranch=backend_supplier_summary_v1, signedUrl=present
- Negative user_metadata-only case: HTTP 403, errorCode=auth_failed

## Verdict
- supplierPdfAuthBoundaryFixed = true
- supplierPdfFunctionPostStatus = 200
- supplierPdfSignedUrlReturned = true
- Final status: GREEN
