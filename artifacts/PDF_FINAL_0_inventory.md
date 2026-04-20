# PDF-FINAL.0 Global Inventory

Status: implementation artifact.

Baseline before this wave: `926e2d40a87fac41f9f89e3493d6fe14af9b3f3d`.

Scope rule: document logic, formulas, totals, grouping, ordering, template semantics, UI semantics, and global viewer behavior stay unchanged.

## Global Button / Document Inventory

| Role / screen | Action / document kind | Source owner | Render / materialization owner | Open-path owner | Current production model |
| --- | --- | --- | --- | --- | --- |
| Director finance | Management report PDF | `src/screens/director/director.finance.pdfService.ts`, `src/lib/api/directorPdfSource.service.ts` | `supabase/functions/director-pdf-render/index.ts` | Director finance PDF descriptor -> shared preview | Manifest/version/artifact reuse shipped in `PDF-Z1`. |
| Director finance | Supplier summary PDF | `src/lib/api/directorFinanceSupplierPdfBackend.service.ts` | `supabase/functions/director-finance-supplier-summary-pdf/index.ts` | Director finance supplier modal -> shared preview | Backend offload, no formula drift; lower priority than already measured heavy report slices. |
| Director reports | Production report PDF | `src/screens/director/director.reports.pdfService.ts`, `src/lib/api/directorProductionReportPdfBackend.service.ts` | `supabase/functions/director-production-report-pdf/index.ts` | Director reports PDF action -> shared preview | Manifest/version/reuse/concurrency shipped in `PDF-Z2`. |
| Director reports | Subcontract report PDF | `src/lib/api/directorSubcontractReportPdfBackend.service.ts` | `supabase/functions/director-subcontract-report-pdf/index.ts` | Director reports PDF action -> shared preview | Backend offload; not selected as current top remaining latency offender. |
| Director request/proposal | Request/proposal PDFs | `src/lib/api/pdf_request.ts`, `src/lib/api/pdf_proposal.ts` | local/shared PDF render | shared preview | Bounded on-demand / summary-first class. |
| Warehouse reports | Incoming register PDF | `src/screens/warehouse/warehouse.pdfs.ts`, `src/lib/api/warehousePdfBackend.service.ts` | `supabase/functions/warehouse-pdf/index.ts` | Warehouse register button -> shared preview | Manifest/version/artifact reuse shipped in `PDF-Z3`. |
| Warehouse reports | Issue register PDF | `src/screens/warehouse/warehouse.pdfs.ts`, `src/lib/api/warehousePdfBackend.service.ts` | `supabase/functions/warehouse-pdf/index.ts` | Warehouse register button -> shared preview | `PDF-FINAL` adds deterministic source/artifact versioning, server artifact hit, client hot/warm reuse, and in-flight coalescing. |
| Warehouse reports | Materials and object/work PDFs | `src/screens/warehouse/warehouse.pdfs.ts` | `supabase/functions/warehouse-pdf/index.ts` | Warehouse report buttons -> shared preview | Backend offload; next P1 candidates if telemetry shows repeat pain after register fixes. |
| Warehouse documents | Issue/incoming forms | `src/screens/warehouse/warehouse.pdfs.ts` | `supabase/functions/warehouse-pdf/index.ts` | Warehouse document action -> shared preview | Single-document on-demand acceptable. |
| Foreman | Request / history request PDF | `src/screens/foreman/foreman.requestPdf.service.ts`, `src/lib/api/foremanRequestPdfBackend.service.ts` | `supabase/functions/foreman-request-pdf/index.ts` | Foreman request PDF action -> shared preview | Manifest/version/reuse/concurrency shipped in `PDF-Z4`. |
| Purchaser / buyer | Proposal PDF | `src/screens/buyer/buyerProposalPdf.service.ts`, `src/screens/buyer/useBuyerDocuments.ts` | shared proposal render | Buyer proposal action -> shared preview | Manifest/version/reuse/concurrency shipped in `PDF-PUR-1` when a proposal snapshot is available. |
| Accountant | Payment report / order PDF | `src/screens/accountant/accountantPaymentReportPdf.service.ts` | `src/lib/api/pdf_payment.ts` | Accountant report button -> shared preview | Manifest/version/reuse/concurrency shipped in `PDF-ACC-1`. |
| Accountant | Proposal PDF | `src/screens/accountant/accountantProposalPdf.service.ts` | shared proposal render | Accountant document action -> shared preview | Manifest/version/reuse/concurrency shipped in `PDF-ACC-FINAL`. |
| Accountant | PDF attachments | `src/screens/accountant/accountantAttachmentPdf.service.ts` | existing attachment artifact | Accountant document action -> shared preview | Manifest/readiness descriptor reuse shipped in `PDF-ACC-FINAL`; non-PDF files remain direct file opens. |
| Contractor | Act / summary / history PDFs | `src/screens/contractor/contractorPdf.render.ts`, `src/screens/contractor/contractor.pdfService.ts` | local contractor act render | Contractor PDF actions -> shared preview | Manifest/version/reuse/concurrency shipped in `PDF-Z5`. |
| Shared reports dashboard | PDF export | `src/features/reports/ReportsDashboardScreen.tsx` | local report export render | shared preview | Uses already-loaded report rows; on-demand acceptable until saved/scheduled exports exist. |

## PDF-FINAL Exact Code Slice

This wave closes the highest documented remaining top offender from `PDF-Z3.0`: Warehouse `issue_register`.

Changed owner chain:

- Client fingerprint owner: `src/screens/warehouse/hooks/useWarehouseScreenData.ts`.
- Click/open owner: `src/screens/warehouse/warehouse.pdfs.ts`.
- Client reuse/in-flight owner: `src/lib/api/warehousePdfBackend.service.ts`.
- Manifest/version owner: `src/lib/pdf/warehousePdf.shared.ts`.
- Backend artifact hit/miss owner: `supabase/functions/warehouse-pdf/index.ts`.

Unchanged:

- Warehouse issue register source RPC: `acc_report_issues_v2`.
- Warehouse issue register HTML builder: `buildWarehouseIssuesRegisterHtml`.
- Totals, grouping, ordering, template semantics, viewer, and UI flow.
