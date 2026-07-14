# ADR-001: AI Estimate Layered Architecture

Status: accepted

Context:
The estimate product must scale across the full 11610-work catalog without adding screen-local calculators, second parsers, or route-specific patches. The existing estimate engine remains the only calculation core.

Decision:
The AI estimate module is organized into explicit layers:

- `domain`: pure construction estimate rules, classifiers, parameter graphs, formulas, revision state, and artifact invariants.
- `application`: composition services and use-case orchestration that bind domain logic to ports.
- `runtime`: the public facade used by UI and product flows.
- `ports`: stable interfaces for ledger, catalog, pricebook, PDF, buyer package, and telemetry.
- `adapters`: browser, server, and in-memory implementations of ports.
- `contracts`: versioned persisted object contracts and compatibility checks.
- `migrations`: idempotent migration registry and safety validators.
- `observability`: runtime telemetry and redaction policy.
- `testing`: architecture fixtures and deterministic test helpers.

Consequences:
React screens and hooks may render state, collect input, focus fields, and dispatch user commands. They must not calculate BOQ, build formula graphs, mutate revisions, write ledger history, or decide artifact lifecycle. Future marketplace, RFQ, warehouse, and payment features must integrate only through extension contracts.
