# ADR-005: No Hooks And No Kostyl Policy

Status: accepted

Context:
Previous estimate regressions came from UI-local fixes, hidden fallbacks, hardcoded route behavior, and hook-based rewrites. Those patterns produce fake green states and break as soon as another work type is used.

Decision:
Hooks are allowed only for UI concerns: focus, keyboard state, layout state, input debounce, display-only memoization, and event wiring. Hooks are forbidden for:

- BOQ calculation
- parameter graph or formula evaluation
- revision creation or mutation
- ledger writes or history mutation
- PDF or buyer package lifecycle decisions
- migration, idempotency, compaction, and telemetry policy

Consequences:
Architecture audits count hook business-logic violations as blockers. Substring parameter matching, generic `area_m2` capture for specialized work, route-equivalent proof, and environment-only browser claims are also blocked.
