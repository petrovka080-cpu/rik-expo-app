# T1.1 Text Pipeline Inventory

Generated: 2026-04-16T14:26:23.857Z

## Source Data

Read-only remote scan covered critical free-text tables: requests, request_items, warehouse_issues, and subcontracts.

Corrupted DB fields found: 0

## SQL / RPC / Snapshot

- R2.2 director issue fact migration: no selected mojibake literals detected.
- R2.4 snapshot envelope migration: no selected mojibake literals detected.
- Selected T1.2 path has no SQL/RPC boundary.

## Client / Render

- Corruption is observed in hardcoded client/render literals.
- Highest-impact selected slice: `app/pdf-viewer.tsx`, because it is the shared PDF viewer chrome for Director/PDF workflows.

## PDF / Export

- Generated Director production PDF renderer source was checked and is not the selected corruption point.
- Selected slice is PDF viewer chrome text, not PDF document glyph/font mapping.

## Residual Backlog

Residual corrupted source literals remain outside this first slice, especially warehouse/subcontract UI/PDF files. They are intentionally not changed in T1.2.
