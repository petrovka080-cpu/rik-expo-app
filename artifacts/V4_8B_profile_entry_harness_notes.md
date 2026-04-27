## V4-8B Profile Entry Harness Fix Notes

Status: GREEN_READY_FOR_COMMIT

Context:
- V4-8 product a11y changes passed TypeScript, lint, Jest, manual Android launch, and diff checks.
- Maestro critical was blocked by profile/office/market entry selectors and later by RFQ/profile viewport drift.
- The product selectors existed and product code was not proven regressed.

Root cause:
- Maestro `scrollUntilVisible` was unstable in profile and RFQ bottom-sheet contexts.
- In several failures, the debug hierarchy showed the selector existed or the target section was reachable, but Maestro failed or overscrolled.
- A long critical rerun also degraded the emulator system services; rebooting `Pixel_7_API_34` restored package/activity/window services.

Harness approach:
- Keep existing selectors.
- Do not skip flows or reduce the suite.
- Replace brittle profile-entry `scrollUntilVisible` blocks with deterministic `waitForAnimationToEnd` plus explicit `scroll`/`tapOn`.
- Replace RFQ email/note `scrollUntilVisible` with explicit settle/scroll/tap steps.
- Remove an active-context extra scroll that pushed the target back to top diagnostics on fresh emulator boot.

Changed harness files:
- `maestro/flows/critical/accountant-payment.yaml`
- `maestro/flows/critical/active-context-switch.yaml`
- `maestro/flows/critical/buyer-proposal-review.yaml`
- `maestro/flows/critical/buyer-rfq-create.yaml`
- `maestro/flows/critical/contractor-pdf-smoke.yaml`
- `maestro/flows/critical/contractor-progress.yaml`
- `maestro/flows/critical/director-approve-report.yaml`
- `maestro/flows/critical/director-report-pdf-smoke.yaml`
- `maestro/flows/critical/foreman-draft-submit.yaml`
- `maestro/flows/critical/market-entry.yaml`
- `maestro/flows/critical/office-buyer-route-roundtrip.yaml`
- `maestro/flows/critical/office-safe-entry.yaml`
- `maestro/flows/critical/warehouse-receive-issue.yaml`

Proof:
- Targeted `Buyer RFQ Create`: PASS after RFQ scroll fix.
- Targeted `Active Context Switch`: PASS after active-context scroll fix.
- Full `npm run e2e:maestro:critical`: PASS, `14/14`, final report timestamp `2026-04-27 06:32:35 +06`.

Safety:
- Product files changed during recovery: NO.
- Product files beyond original V4-8 seven changed: NO.
- Business logic changed: NO.
- SQL/RPC changed: NO.
- Runtime/app/package/release scripts changed: NO.
- OTA published: NO.
