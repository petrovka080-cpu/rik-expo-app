# S-BUYER-SUMMARY-BUCKETS-RPC-SHAPE-HOTFIX-1 Proof

## Result

Final status: `GREEN_BUYER_SUMMARY_BUCKETS_RPC_SHAPE_FIXED`

## Root Cause

The SQL definition for `buyer_summary_buckets_scope_v1` returns a redacted contract envelope with `document_type = buyer_summary_buckets_scope`. The frontend validator accepted only `buyer_summary_buckets_scope_v1`, so otherwise valid bucket responses were rejected by `validateRpcResponse`.

## Fix

- Kept `validateRpcResponse` enabled.
- Updated the buyer buckets validator to accept the current SQL document type and the previous `_v1` type.
- Kept required bucket arrays and canonical count validation strict.
- Redacted user-facing publication messages so `Invalid RPC response shape`, `src/screens/`, and `loadBuyerBucketsDataRpcInternal` are not rendered on `/office/buyer`.
- Redacted buyer bucket RPC validation messages before publication telemetry/log handoff.

## Tests

- Added buyer fetcher coverage for the current SQL `document_type`.
- Added malformed bucket validation redaction coverage.
- Added UI publication redaction coverage for `BuyerMainList`.
- Updated S-RPC-6 high-risk validation contract coverage.

## Safety

- Production touched: false.
- Production DB touched: false.
- Production deploy triggered: false.
- BFF traffic changed: false.
- Mutations/providers enabled: false.
- OTA/EAS/App Store/Play Market touched: false.
- Raw RPC payloads/business rows printed: false.
- Secrets/env values/DB URLs printed: false.

## Gates

- Targeted buyer RPC/screen/validation tests: pass.
- `npx tsc --noEmit --pretty false`: pass.
- `npx expo lint`: pass.
- `git diff --check`: pass.
- `npm test -- --runInBand`: pass.
- `npm test`: pass.
- Pre-commit `npm run release:verify -- --json`: all internal gates passed; release guard blocked final readiness because the hotfix worktree was intentionally dirty before commit.
- Clean `npm run release:verify -- --json` after commit/push: pass.
- Release readiness: pass.
- OTA disposition: allow.

## Next Safe Wave

`S-OTA-ALL-EAS-CHANNELS-BUYER-RPC-HOTFIX-1`
