# PDF-Z3.0 Selection

Status: COMPLETE.

Start gate:

- `PDF-Z2`: GREEN with Android environment BLOCKED accepted by wave rule.
- `main == origin/main`: yes, `21d28ac5902625fc5fb6054dc71e7b853367d6a3`.
- Worktree at Z3 start: clean.
- Repo process tails at Z3 start: none.

## Candidate Measurement

Method: direct `warehouse-pdf` Edge Function calls with a temporary warehouse user, one call per candidate, then cleanup. This was a selection probe only, not a reusable verifier.

| Candidate | Document kind | Status | Elapsed |
|---|---:|---:|---:|
| Incoming register, all period | `incoming_register` | 200 | 13772 ms |
| Issue register, all period | `issue_register` | 200 | 12472 ms |
| Issue materials, all period | `issue_materials` | 200 | 12144 ms |
| Object/work report, all period | `object_work` | 200 | 11073 ms |
| Incoming materials, all period | `incoming_materials` | 200 | 10390 ms |

## Selected Top-1

Selected path: `incoming_register`.

Owner chain:

- Route/screen: warehouse reports tab, incoming mode.
- UI action: top register PDF action.
- Client owner: `src/screens/warehouse/warehouse.pdfs.ts`.
- Backend client owner: `src/lib/api/warehousePdfBackend.service.ts`.
- Contract owner: `src/lib/pdf/warehousePdf.shared.ts`.
- Edge render owner: `supabase/functions/warehouse-pdf/index.ts`.
- Source owner: `acc_report_incoming_v2`.
- Render/materialization owner: `warehouse-pdf` Edge Function, `backend_warehouse_pdf_v1`.

## Bottleneck

- Each click calls `warehouse-pdf`.
- The backend loads incoming heads, builds HTML, launches Puppeteer/Browserless, uploads a new PDF, and signs a new URL.
- There is no deterministic artifact lookup before render on the selected path.
- Repeat click currently behaves like rebuild, not reuse.

## Scope Freeze

PDF-Z3 only changes `incoming_register`.

Out of scope:

- `issue_register`
- `issue_materials`
- `incoming_materials`
- `object_work`
- day PDFs
- Director/Foreman/Buyer PDFs
- templates/formulas/UI semantics
