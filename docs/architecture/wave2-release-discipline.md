# Wave 2 Release Discipline

## Purpose

Wave 2 release discipline turns release reporting into a reproducible production process instead of an informal note.

## Release Ledger Standard

Each release-grade batch must have one ledger entry. The ledger must include:

- `batchName`
- `date`
- `scope`
- `exactChangedFiles`
- `exactSqlMigrations`
- `exactScriptsVerifiers`
- `exactTestCommands`
- `proofArtifacts.required`
- `proofArtifacts.optional`
- `proofArtifacts.transient`
- `commitSha`
- `pushTarget`
- `ota.published`
- `ota.development`
- `ota.preview`
- `ota.production`
- `ota.note`
- `rollbackNote`
- `honestStatus`
- `knownExclusions`

Ledger files for releaseable batches live under:

- `artifacts/release-ledgers/*.json`

## Worktree Hygiene

Before a batch is considered releaseable, the verifier must inspect:

- `git branch --show-current`
- `git status --short`
- staged vs unstaged change set
- untracked files
- unrelated modified files

Dirty files are classified into:

1. `release-critical`
   - source code
   - SQL / migrations
   - verifier scripts
   - required proof docs
2. `generated-allowed`
   - `*-smoke.json`
   - `*-parity.json`
   - `*-proof.md`
   - `*-jest.json`
   - `*-summary.json`
   - `*-chain.json`
3. `local-only`
   - shell/OS leftovers
   - random logs
   - temporary dumps
   - untracked local garbage

`local-only` files are forbidden in a releaseable worktree.

## Known Exclusions

If unrelated leftovers already exist, they must be explicitly listed in the ledger with:

- `path`
- `reason`
- `classification`

An unrelated leftover is acceptable only if:

- it is explicitly declared;
- it is not part of the current batch;
- it is not ambiguous;
- it is not forbidden local-only junk.

## OTA Mapping Discipline

For every release-grade batch, the ledger must state one of two honest outcomes:

1. OTA published
   - all relevant channel IDs recorded
   - commit SHA recorded
   - push target recorded
2. OTA not published
   - explicit note explains why

No silent omission is allowed.

## Release Flow

1. Narrow scope and freeze it.
2. Run exact tests and verifiers.
3. Generate proof artifacts.
4. Classify worktree.
5. Update release ledger.
6. Run release discipline verifier.
7. If and only if the result is `GREEN`, do commit / push / OTA.
8. Re-run release discipline verifier against final release mapping.
