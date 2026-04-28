# Performance Tracing Runbook

Wave: S-PERF-1

## Scope

S-PERF-1 adds safe Sentry transaction/span boundaries for five scale-critical flows:

- `proposal.list.load` - director pending proposal window load
- `proposal.submit` - atomic proposal creation/submission
- `warehouse.receive.apply` - warehouse receive apply RPC boundary
- `accountant.payment.apply` - accountant invoice payment apply RPC boundary
- `pdf.viewer.open` - PDF/document open orchestration

This wave does not publish OTA, run EAS, change native config, or claim live production performance visibility.

## Enablement

Tracing is disabled by default. To enable after release approval, use both safe public runtime flags:

```bash
EXPO_PUBLIC_SENTRY_PERFORMANCE_TRACING=1
EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.01
```

The helper clamps sample rate to a conservative maximum of `0.05`.

## Tag Policy

The tracing helper uses an allowlist-only tag policy.

Allowed tags:

- `flow`
- `role`
- `result`
- `error_class`
- `page_size`
- `offline_queue_used`
- `cache_hit`
- `pdf_guard_triggered`
- `platform`
- `duplicate_warning`
- `budget_warning`

Forbidden data:

- user, company, request, proposal, invoice, or payment identifiers
- names, phone numbers, emails, addresses
- raw request/proposal/invoice/payment payloads
- raw SQL/RPC params
- signed URLs, tokens, JWTs, Supabase keys, authorization headers
- PDF file names or document contents

Unsafe keys and values are stripped before they can be attached to spans.

## Verification

Run targeted checks:

```bash
npm test -- --runInBand tracing
npm test -- --runInBand sentry
npm test -- --runInBand proposal
npm test -- --runInBand warehouse
npm test -- --runInBand accountant
npm test -- --runInBand pdf
```

Run full gates:

```bash
git diff --check
npx tsc --noEmit --pretty false
npx expo lint
npm test -- --runInBand
npm test
npm run release:verify -- --json
```

## After Release

To verify Sentry traces after an approved release:

1. Enable a conservative sample rate.
2. Run one known-good staging flow per trace name.
3. Confirm spans appear under stable low-cardinality names.
4. Confirm no trace tag contains private identifiers or payloads.
5. Keep sample rate low during 10K readiness testing.

## Disable / Rollback

Set either flag to disable tracing:

```bash
EXPO_PUBLIC_SENTRY_PERFORMANCE_TRACING=0
EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0
```

The helper also no-ops if the Sentry performance API is unavailable.

## What This Wave Does Not Claim

- Live production tracing is not claimed.
- Production was not touched.
- OTA was not published.
- EAS build, submit, and update were not triggered.
- No package, app, native, SQL, RPC, RLS, or storage policy configuration was changed.
