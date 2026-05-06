# S-BUYER-INBOX-LEGACY-API-WINDOW-CONTRACT-1 Proof

Status: `GREEN_BUYER_INBOX_LEGACY_API_WINDOW_CONTRACT_RELEASE_INTEGRATED`

## Scope

- Targeted `src/lib/api/buyer.ts::listBuyerInbox`.
- Replaced the unwindowed legacy `list_buyer_inbox` runtime call with the existing typed `buyer_summary_inbox_scope_v1` window contract.
- Preserved the returned legacy row array shape, request status gate, and rejected-row enrichment path.
- Kept compatibility fallback only as bounded fail-closed `request_items` reads with deterministic ordering.

## Contract

- Request: `p_offset`, `p_limit`, `p_search`, `p_company_id`.
- Legacy compatibility request uses `p_search: null` and `p_company_id: null`, matching the previous full-list scope.
- Response must be an envelope with recognized `document_type`, non-empty `version`, `rows`, and optional `meta`.
- Ceiling: 100 groups per page, 5000 groups/rows max, 50 pages max.
- Overflow behavior: throw, no partial success and no silent truncation.

## Proof

- Targeted tests passed:
  - `tests/api/buyerLegacyApiWindow.test.ts`
  - `tests/api/buyerInboxLegacyApiWindowContract.contract.test.ts`
  - `tests/api/sRpc6HighRiskRpcValidation.contract.test.ts`
  - `tests/api/riskClassifiedRemainingSelectsBatch9.contract.test.ts`
- `npm run verify:typecheck` passed.
- `npm run lint` passed.
- `git diff --check` passed.

## Safety

- No production DB writes.
- No migrations or repair/apply actions.
- No deploy or redeploy.
- No Render env writes.
- No BFF traffic changes.
- No business endpoint calls.
- No raw payloads, raw DB rows, URLs, tokens, or secret values printed in artifacts.
