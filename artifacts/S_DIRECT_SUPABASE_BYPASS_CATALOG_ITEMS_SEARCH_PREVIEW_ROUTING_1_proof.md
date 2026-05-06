# S-DIRECT-SUPABASE-BYPASS-CATALOG-ITEMS-SEARCH-PREVIEW-ROUTING-1 Proof

Final status: `GREEN_DIRECT_SUPABASE_BYPASS_CATALOG_ITEMS_SEARCH_PREVIEW_ROUTED_RELEASE_INTEGRATED`

## Scope

- Routed the `CatalogSearchModal` `catalog_items` preview read through the existing permanent catalog transport BFF-aware boundary.
- Added one typed read-only operation to `catalog_transport_read_scope_v1`: `catalog.items.search.preview`.
- Preserved the existing UI response shape, fallback behavior, search filters, kind filter, ordering, and bounded preview size.

## Contract

- Request DTO: `{ operation: "catalog.items.search.preview", args: { searchTerm, kind, pageSize } }`.
- Response DTO: existing `CatalogTransportBffEnvelope` with `CatalogTransportBffReadResultDto`.
- Filters: search term across the same search columns plus optional `kind`.
- Ordering: `rik_code asc, id asc`.
- Semantics: explicit preview read, page size 60, max page size 100, max rows 100.
- Error envelope: existing catalog transport BFF redacted error envelope.

## Safety

- No production DB writes.
- No migrations.
- No deploy or redeploy.
- No Render env writes.
- No BFF traffic changes.
- No business endpoint calls.
- No raw payloads, raw DB rows, or business rows printed.
- Compatibility fallback remains only inside `src/lib/catalog/catalog.transport.supabase.ts`.

## Gates So Far

- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- Targeted Jest catalog BFF/preview tests: PASS
- `git diff --check`: PASS

## Release

- Pre-push `release:verify -- --json`: all gates PASS; readiness blocked only by local ahead before approved push.
- Matrix records the final expected synced state after the approved push: ahead/behind 0/0 and `release_verify_status=PASS_AFTER_PUSH`.
