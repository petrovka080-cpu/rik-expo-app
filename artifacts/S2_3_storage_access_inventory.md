# S2.3 Storage / PDF Access Inventory

Status: ROOT GAPS FOUND

| Path | Access decision | URL issuance | Risk |
| --- | --- | --- | --- |
| Foreman request PDF edge | `foreman-request-pdf` checks authenticated user, request existence, company membership, same-company director, foreman owner. | Server uploads into `role_pdf_exports` and returns signed URL via service client. TTL from canonical env, default 3600s. | Good policy shape; should be the same-company/owner baseline. |
| Warehouse PDF edge | `warehouse-pdf` uses membership rows through `resolveWarehousePdfAccess`. | Server uploads into `role_pdf_exports` and returns signed URL. TTL default 3600s. | Good policy shape for role-restricted docs. |
| Director PDF render edge | `director-pdf-render` checks signed app metadata before RPC and can skip RPC. | Server uploads into `director_pdf_exports` and returns signed URL. TTL default 3600s. | Role policy differs from membership-first S2 contract. |
| Director report PDF edges | production/subcontract/finance supplier summary check signed metadata plus `get_my_role()`. | Server uploads into `director_pdf_exports`, signed URL TTL default 3600s. | No company membership priority; stale app metadata can be authoritative. |
| Proposal attachment read | `proposal_attachment_evidence_scope_v1` plus client compatibility fallback to `proposal_attachments`. | Client calls `storage.createSignedUrl` when row has bucket/path and no URL. TTL default 3600s. | Compatibility fallback can bypass canonical visibility read if table rows are visible via client policies. |
| Attachment opener | `openAppAttachment` signs storage paths directly when given bucket/path. | Client `createSignedUrl(bucket,path,3600)`. | Should only receive rows from a prior authorized read model; not a standalone access policy. |
| Supplier files | `src/lib/files.ts` uses public URLs for `supplier_files`. | Public URL. | Separate marketplace file model, not S2 PDF policy target. |

## S2 Policy Direction

Generated role PDFs should be issued only after:

1. authenticated JWT validation;
2. canonical role resolution;
3. company/owner/resource check where the document is company-bound;
4. server-side upload/signing with bounded TTL.

Client-side signed URL creation remains only a compatibility reader and must not be treated as authorization.
