# S_TYPE_01_RUNTIME_CAST_HARDENING

Final status: `GREEN_RUNTIME_CAST_HARDENING_READY`

Scope:
- `src/lib/catalog/catalog.request.service.ts`
- `src/lib/api/paymentPdf.service.ts`
- `src/screens/director/director.finance.rpc.ts`

What changed:
- Replaced redundant catalog `as unknown[]` array assertions with typed transport flow and existing record guards.
- Replaced payment PDF `attachments_meta` assertion with an explicit optional-array validator.
- Replaced one director finance runtime env `as unknown as` double cast with a structural runtime type.

Safety:
- No query shape, limit, pagination, RPC name, UI, hook, provider config, migration, or DB write changed.
- No broad allowlist was added.
- Full Jest and architecture anti-regression suite passed before commit.
