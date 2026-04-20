# PDF-PUR-1 Exec Summary

Verdict: GREEN with Android environment BLOCKED

## What changed

- Added Purchaser-owned proposal PDF manifest/version contract.
- Added deterministic `sourceVersion` from already-loaded proposal details data.
- Added deterministic `artifactVersion` from source/template/render contract versions.
- Added memory + persisted descriptor reuse for same-version proposal PDF opens.
- Added in-flight coalescing keyed by `artifactVersion`, registered before async cache/render work starts.
- Switched the Purchaser proposal details PDF action to pass the loaded `head` + `lines` snapshot into the PDF open service.

## What stayed unchanged

- Proposal PDF formulas: unchanged.
- Totals/grouping/ordering: unchanged.
- Template semantics: unchanged.
- Viewer behavior: unchanged.
- Other roles and PDF families: unchanged.

## Gates

- Targeted Jest: PASS.
- TypeScript: PASS.
- Expo lint: PASS.
- Full Jest: PASS.
- `git diff --check`: PASS.
- Web route proof: PASS on `/office/buyer`.
- Android proof: BLOCKED by adb timeout after one recovery attempt.

## Production risk removed

Before PDF-PUR-1, repeat opens on the Purchaser proposal PDF action had no Purchaser-owned freshness contract and normally entered the shared generator again. After PDF-PUR-1, same-version repeat opens reuse a valid descriptor, concurrent identical opens join one task, and changed visible data triggers a controlled rebuild.

## Residual note

The runtime temp buyer used for web proof reached the Purchaser screen but had no seeded proposal rows for a browser-level PDF button click. The actual PDF repeat/reuse contract is covered by exact service tests and the route itself is verified as reachable with no page errors or 5xx.
