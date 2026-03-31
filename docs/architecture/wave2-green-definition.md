# Wave 2 Green Definition

## Meaning

`GREEN` no longer means "one command passed".

For Wave 2, `GREEN` means **releaseable with evidence**:

- scope stayed narrow and explicit;
- exact changed files are known;
- exact tests and verifiers are known;
- required proof artifacts exist;
- worktree state is classified, not hand-waved;
- commit / push / OTA mapping is explicit;
- the relevant cross-role production chain is not red;
- no silent fallback masks a regression.

## Mandatory GREEN Conditions

A batch can be marked `GREEN` only if all conditions below hold at the same time:

1. Scope is still the intended batch scope.
2. Exact changed files are listed in the release ledger.
3. Exact SQL / migrations are listed in the release ledger.
4. Exact verifier scripts are listed in the release ledger.
5. Exact test commands are listed in the release ledger.
6. Required proof artifacts exist on disk.
7. Dirty worktree entries are either:
   - part of the current batch, or
   - explicitly classified as known exclusions.
8. No forbidden local-only junk remains in the release worktree.
9. Cross-role regression gate is `GREEN` for the affected production chain.
10. Commit / push / OTA mapping is explicit and internally consistent.
11. Status reflects reality without fallback-based masking.

## NOT GREEN Triggers

`NOT GREEN` is mandatory if any of the following is true:

- proof artifacts are missing;
- dirty files are unclassified;
- local-only junk is present in the release worktree;
- commit / push / OTA mapping is absent or contradictory;
- cross-role gate fails any required chain;
- exact failed chain / step / boundary cannot be named;
- release proof is ambiguous about what belongs to the batch.

## Releaseable Batch

A releaseable batch is a batch that has:

- one release ledger entry;
- one exact scope statement;
- one exact evidence set;
- one exact regression verdict;
- one exact release mapping.

This definition deliberately rejects:

- "almost green";
- "green except for...";
- "the module passed, the rest we did not check";
- "there were other files in the worktree but they are probably unrelated".
