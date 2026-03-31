# Director PDF Platform Hardening Proof

## Root cause
- Director PDF families had drift across edge CORS handling, client transport ownership, and render execution parity.
- `director.reports.pdfService` still allowed family split between backend-first and screen-owned fallback paths.
- `director-pdf-render` was the outlier: it required browserless-only rendering, while the other director PDF edge families already supported deterministic local browser rendering. That kept the family contract incomplete and blocked platform-safe parity.

## Canonical boundary now
- Director action -> backend PDF service -> Edge Function -> canonical `remote-url` descriptor -> platform-safe open/view boundary.
- All four director PDF families now share one response/CORS contract and one typed transport error model.

## What was verified
- Web preflight: pass
- Web POST success across families: fail
- Error path keeps CORS headers: pass
- Typed transport classification: pass
- Web viewer open: pass
- Android open: fail
- iOS contract-safe source handling: pass
- Invalid source controlled fail: fail
- No fatal crash / process alive: pass
- Family parity safe: fail

## What did not change
- Director finance/report business semantics were not changed.
- Buyer/foreman/accountant/warehouse flows were not touched.
- No client-side PDF generation fallback was reintroduced.
- No UI rewrite or broad PDF subsystem rewrite was done.

## Final status
- NOT_GREEN
