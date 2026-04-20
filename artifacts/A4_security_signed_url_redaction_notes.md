# A4.SECURITY_SIGNED_URL_REDACTION Notes

## Status

GREEN. Runtime implementation was completed in commit `a3ec5a61e3fed47c895d0dc37161b4a75699f6cc`.

This artifact uses the exact `A4_security_signed_url_redaction_*` naming requested by the final handoff. It documents the same completed A4 security scope without changing runtime code.

## Confirmed Leak Paths

- `app/pdf-viewer.tsx`: viewer route, snapshot, iframe, native handoff, file inspection, and error-state diagnostics could include `openToken`, `uri`, `href`, or signed iframe source values.
- `src/lib/documents/attachmentOpener.ts`: Android intent and remote PDF diagnostics could include a token-bearing remote PDF URL.
- `src/lib/api/directorProductionReportPdfBackend.service.ts`: backend dev diagnostics included `signedUrl`.
- `src/lib/api/canonicalPdfBackendInvoker.ts`: transport errors and response summaries could include token-bearing details.
- Adjacent PDF diagnostic sinks also carried the same risk: `pdfRunner`, `pdfDocumentActions`, `pdfDocumentSessions`, platform observability, `logError`, logger output, and PDF crash breadcrumbs.

## Sensitive Fields

- Signed Supabase storage URLs.
- Query secrets such as `token`, `signature`, `sig`, `expires`, `access_token`, `refresh_token`, `openToken`, and `X-Amz-*`.
- Bearer tokens and JWT-like strings.
- Object keys such as `signedUrl`, `openToken`, `authorization`, API keys, service role keys, and refresh/access tokens.

## Redaction Contract

- `src/lib/security/redaction.ts` owns the shared diagnostic redaction boundary.
- `redactSensitiveText` redacts token-bearing strings.
- `redactSensitiveValue` recursively redacts diagnostic payloads and `Error` messages.
- `redactSensitiveRecord` keeps structured diagnostics useful while removing secrets.

## What Changed

- Diagnostic sinks now redact sensitive strings/records before console output, observability storage, app error payload persistence, and PDF crash breadcrumb persistence.
- PDF viewer and PDF document diagnostics keep operational signal such as source kind, scheme, document type, platform branch, and path context.
- Backend transport and Director PDF diagnostics still return real runtime URLs to product code, but diagnostic copies are redacted.

## Deliberately Unchanged

- PDF opening behavior.
- Signed URL generation and runtime handoff.
- Viewer route semantics and `openToken` matching.
- Backend transport protocol.
- PDF formulas, report formulas, templates, totals, grouping, ordering, and artifact reuse semantics.

## Why This Is Production-Safe

The fix follows `keep signal, remove secret`: production behavior still uses the original runtime values, while diagnostics receive deterministic redaction through one shared security boundary.
