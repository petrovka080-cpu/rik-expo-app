# ADR-003: AI Estimate Source Of Truth

Status: accepted

Context:
History, revisions, PDF snapshots, and buyer packages must survive reloads and must not be capped at a UI page size. Browser cache and legacy local state cannot be the business source of truth.

Decision:
The durable AI estimate ledger is the source of truth for approved history and revision artifact lifecycle. Browser cache is write-through convenience only. Legacy local storage is read-only migration input. UI component state is transient display state.

Persisted records must carry version information and lineage:

- schema or contract version
- created and updated timestamps
- source SHA or runtime version when the record leaves memory
- immutable revision and artifact identifiers

Consequences:
Approved history reads use the ledger port. Migrations never delete legacy input before a successful durable write. PDF and buyer package artifacts are valid only for the revision they were generated from.
