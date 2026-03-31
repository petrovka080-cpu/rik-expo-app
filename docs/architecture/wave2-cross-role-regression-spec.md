# Wave 2 Cross-Role Regression Spec

## Goal

The regression gate must prove that production-critical chains still work as chains, not just as isolated modules.

## Chain 1: Request -> Proposal -> Director -> Accountant

### Actors

- foreman
- buyer
- director
- accountant

### Core entities

- request
- proposal
- attachment / evidence
- canonical finance state
- PDF/document handoff

### Required invariants

- one request lifecycle boundary stays canonical;
- buyer proposal submit stays atomic;
- proposal becomes director-visible;
- director truth comes from canonical server read model;
- accountant truth comes from canonical server finance chain;
- evidence remains bound to the business entity;
- PDF open path does not crash runtime.

### Failure classes

- `request_lifecycle_regression`
- `proposal_atomicity_regression`
- `director_fact_regression`
- `finance_chain_regression`
- `attachment_evidence_regression`
- `pdf_runtime_regression`

## Chain 2: Request Lifecycle Safety

### Required route

1. draft create / sync
2. submit
3. post-submit edit blocked
4. post-submit delete blocked
5. stale sync blocked
6. second-device overwrite blocked
7. canonical reopen
8. resubmit-ready draft state restored

### Required invariants

- submitted content is immutable;
- stale local state cannot overwrite submitted truth;
- reopen exists only through canonical path.

## Chain 3: Attachment / Commercial Evidence Visibility

### Required route

1. buyer uploads attachment
2. server binds attachment to canonical entity
3. director sees correct evidence
4. accountant sees correct finance basis evidence
5. invalid context rejected
6. unbound blob invisible

### Required invariants

- storage object alone is not business truth;
- evidence visibility follows canonical linkage;
- orphan attachments do not become business-visible.

## Chain 4: PDF Runtime Safety

### Required route

1. director PDF open
2. accountant PDF open
3. warehouse PDF open
4. attachment PDF open
5. invalid source controlled fail

### Required invariants

- no fatal runtime crash;
- process stays alive after open;
- remote/local boundary is deterministic;
- invalid source is controlled, not process death.

## Output Contract

The consolidated verifier must produce:

- one machine-readable summary JSON
- one human-readable proof MD
- exact failed chain
- exact failed step
- exact failure class

## Honest Failure Model

The gate must fail loudly on:

- partial chain success;
- silent fallback masking;
- visibility mismatch;
- stale guard violation;
- duplicate creation;
- evidence orphan leak;
- PDF runtime crash regression.
