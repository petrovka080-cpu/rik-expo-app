# T8 Final R5 Root-Cause-to-Fix Matrix

Baseline SHA: `a117116b42ff6aca597e7b2e332c88180deb0157`.

The initial 43 failed suites and 57 failed assertions reduce to five evidenced root causes, not 43 independent defects. Exact mappings and suite names are in `initial-full-jest-failure-ledger.json` and the machine-readable matrix beside this file.

- Prerequisite/evidence lineage: exact 343-file manifest, hash/schema/producer validation, content-addressed cache, deterministic RPC/RT producers, and read-only preflight.
- Replay/readiness and previous BOQ proof: restored only through exact attested lineage; assertions remain unchanged.
- FlatList drift: the legitimate 62nd production instance is explicitly inventoried and tuned; exact equality remains mandatory.
- Real10000: refreshed runtime inputs stay in memory and Jest writes only to PID/worker-scoped runtime evidence; `after_p0_holes=0`.
- Verification Architecture V1: real-diff shadow selection includes all 43 original failed consumers; missing consumers are zero.

Current status: focused functional clusters are GREEN. Final clean exact-SHA gates and remote CI remain mandatory before admission.
