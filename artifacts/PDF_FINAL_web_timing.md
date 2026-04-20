# PDF-FINAL Web Timing

Status: PASS
Checked at: 2026-04-20T19:09:52.205Z

## Runtime Proof

- Scope: Warehouse top-priority `issue_register` register PDF.
- Route: `/office/warehouse` -> Reports -> issue register PDF -> `/pdf-viewer`.
- Function: `warehouse-pdf`.
- Function response status: `200`.
- Cache mode: `artifact_hit`.
- Renderer: `artifact_cache`.
- Template version: `warehouse_issue_register_template_v1`.
- Source version: `wissue_src_v1_f408b3282ee4588a34c723a293bd04baf562e89445215aacb4430152f54ff1ee`.
- Artifact version: `wissue_art_v1_cb4c991276a4ed956a1951ab235fc7816770ff60f7802233b8f4129bd6e6d4e4`.

## Telemetry

| Metric | Value | Result |
| --- | ---: | --- |
| sourceMs | 318 | observed |
| renderMs | 0 | PASS |
| uploadAndSignMs | 0 | PASS |
| backendTotalMs | 2607 | observed network/source/signing envelope |
| viewerReadyMs | 184 | PASS, <= 300 ms |

## Safety Checks

- Page errors: 0.
- Bad HTTP responses: 0.
- Blocking console errors: 0.
- Raw signed URL/token leakage in proof artifacts: none after redaction scan.

## Notes

- The browser proof confirms the product path reaches the viewer through an already-built artifact and does not re-render or re-upload.
- Repeat/warm no-rebuild behavior is covered by targeted service tests: same-version cache hit, persisted warm handoff, and concurrent coalescing.
