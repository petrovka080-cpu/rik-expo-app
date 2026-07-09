# ADR-004: AI Estimate Extension Points

Status: accepted

Context:
Marketplace, RFQ, warehouse, fulfillment, pricing, and payment modules will depend on estimates later. They must not backdoor estimate internals or mutate revisions directly.

Decision:
Future modules integrate through explicit extension contracts:

- procurement extension: reads approved procurement-ready items and artifact references.
- pricing extension: supplies price candidates and source metadata without inventing final totals.
- fulfillment extension: consumes approved, immutable handoff records.

The core estimate package must not import marketplace, RFQ, warehouse, or payment modules.

Consequences:
Extension validators reject direct mutation access, unversioned payloads, and raw internal IDs. New downstream features are blocked until they satisfy the extension boundary.
