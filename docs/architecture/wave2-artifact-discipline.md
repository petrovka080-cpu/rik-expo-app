# Wave 2 Artifact Discipline

## Purpose

Artifacts must be understandable by batch ownership, not by guesswork.

## Required Naming

Allowed proof naming is standardized:

- `*-smoke.json`
- `*-parity.json`
- `*-proof.md`
- `*-jest.json`
- `*-summary.json`
- `*-chain.json`

## Artifact Classes

### Required

Required artifacts are the minimum evidence set for a batch.

They must be listed in the ledger under `proofArtifacts.required`.

### Optional

Optional artifacts add detail but are not the minimum release gate.

They must be listed in the ledger under `proofArtifacts.optional`.

### Transient

Transient artifacts are useful verifier byproducts but not stable release proof.

They must be listed in the ledger under `proofArtifacts.transient`.

## Ownership Rules

Each artifact must belong to one batch.

The release ledger must make it obvious:

- which artifacts are required for the batch;
- which artifacts are optional;
- which artifacts are transient only;
- which artifacts are unrelated leftovers and excluded from the batch.

## Forbidden Ambiguity

The following is not allowed:

- old proof files silently mixed with a new batch;
- stale JSON outputs left without ownership;
- unrelated artifacts sitting in `artifacts/` with no classification;
- a batch report that says "some artifacts existed already".

## Current Wave 2 Required Proofs

This subphase requires at minimum:

- `artifacts/release-discipline-summary.json`
- `artifacts/release-discipline-proof.md`
- `artifacts/cross-role-regression-summary.json`
- `artifacts/cross-role-regression-proof.md`

Optional chain-level supplements may include:

- `artifacts/request-lifecycle-chain.json`
- `artifacts/proposal-director-accountant-chain.json`
- `artifacts/attachment-evidence-chain.json`
- `artifacts/pdf-runtime-chain.json`
