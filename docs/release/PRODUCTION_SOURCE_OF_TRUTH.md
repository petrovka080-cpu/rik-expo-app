# Production Source Of Truth

Wave:
`S_PRODUCTION_SOURCE_OF_TRUTH_RELEASE_CANDIDATE_CI_BASELINE_AND_STAGING_DEPLOY_GUARD_POINT_OF_NO_RETURN`

Target status:
`GREEN_PRODUCTION_SOURCE_OF_TRUTH_RELEASE_CANDIDATE_CI_BASELINE_AND_STAGING_DEPLOY_GUARD_READY_NO_RELEASE`

## Branch Contract

The production candidate source branch is `release/production-candidate`.
It must descend from `origin/main` and from the sealed 11610 professional BOQ commit
`3fa29e4d507e8967790543986911563b6f23f98f`.

`main` remains unchanged until an owner explicitly approves the merge outside this wave.
This wave creates and verifies the candidate branch only.

## CI Contract

Required source gates:

- `npm run verify:typecheck`
- `npm run lint`
- `git diff --check`
- `npx tsx scripts/release/assertNoTestWeakening.ts`
- `npx tsx scripts/release/assertProductionCandidateStaticGuards.ts`
- `npx tsx scripts/release/auditProductionCandidateSourceOfTruth.ts`
- focused architecture Jest for source-of-truth, version lineage, and staging guard
- `npm run ci:office-market`
- `npm run verify:web-public-smoke`
- `npm run render:build:web`
- `npm run release:verify:core -- --json`
- artifact secret scan

CI workflows are:

- `.github/workflows/production-candidate-baseline.yml`
- `.github/workflows/production-candidate-heavy-seal.yml`

Both workflows use `permissions: contents: read`.
They must not use `pull_request_target`, force pushes, release jobs, or real staging trigger flags.

## Version Lineage

`/api/version` is the runtime lineage endpoint for staging diagnostics.
It must expose the source SHA, source SHA env key, source SHA format, branch, branch env key,
runtime, catalog version, and provider.

Valid source SHA identity is a full 40-character git SHA. Random IDs, timestamps, branch names,
or missing values are not release identity.

## Staging Guard

Staging service name: `rik-expo-app-staging`.
Render branch: `release/production-candidate`.
`autoDeploy` remains `false`.

The staging deploy helper is dry-run/read-only by default.
Real staging deployment is blocked unless all of the following are true:

- the caller passes `--confirm-staging-deploy`
- branch is `release/production-candidate`
- worktree is clean
- HEAD matches upstream
- source SHA is valid
- `PRODUCTION_CANDIDATE_CI_GREEN=1`
- credentials point only to staging
- `/api/version` proves the deployed SHA after the trigger

No production deploy.
No release.
No OTA, EAS build, TestFlight, App Store, Play Store, production Supabase, or production Render action.

## Owner Actions

The following remain owner-controlled and cannot be hidden by a green technical baseline:

- branch protection alignment
- Render branch alignment confirmation
- Render deploy hook rotation confirmation
- repository visibility and required-check policy

Until the owner confirms hook rotation, the final report must include:
`BLOCKED_OWNER_RENDER_DEPLOY_HOOK_ROTATION_REQUIRED`.
