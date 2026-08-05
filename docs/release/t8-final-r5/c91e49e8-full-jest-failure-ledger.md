# c91e49e8 terminal full-Jest failure ledger

The frozen candidate completed naturally with exit code 1 after 36,685,683 ms. It was not interrupted or force-terminated, did not OOM, emitted no open-handle warning, and preserved all canonical evidence byte-for-byte.

Exact result: 5,159/5,168 suites passed and 11,115/11,124 tests passed. Nine suites and nine assertions failed; none were skipped or todo.

## One evidenced root cause

All nine failures are `EPERM` writes into correctly read-only canonical evidence. They are not nine independent product defects:

- two scoped observability/security producers attempted atomic rename into canonical matrices;
- five contracts invoked the same Real10000 type-ratchet producer, which wrote the same canonical `type_ratchet_before.json`;
- two internal-canary drills wrote their canonical drill JSON files.

The shared defect is an incomplete Jest output-routing boundary. The repair routes all four producer families through one PID/worker-scoped resolver under `.release-runtime/test-evidence`, while canonical writes remain available only through explicit `VERIFICATION_CANONICAL_WRITE=1` producer authorization. Tests that validate file content read the freshly generated isolated output.

Focused proof is GREEN: 10/10 suites and 11/11 tests, including a new routing-boundary contract. `git diff --exit-code -- artifacts` is clean after the focused run.

Machine-readable suite/assertion mapping and exact timestamps are in `c91e49e8-full-jest-failure-ledger.json`. Byte-identical read-only terminal evidence is stored outside the worktree at `C:/dev/rik-expo-t8-r5-evidence/c91e49e8cae430c14a76ea516c6327eb672d6a69/final-full-jest`.
