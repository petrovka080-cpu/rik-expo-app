# S-BFF Staging Deploy Target Decision 1

Status: `GREEN_BFF_DEPLOY_TARGET_DECISION_READY`.

## Scope
- Chose a concrete BFF staging deployment target.
- No deploy, no production access, no mobile traffic routing, no provider enablement, and no invented `STAGING_BFF_BASE_URL`.
- No env values or secrets were printed.

## BFF Boundary
- runtime type: Node.js TypeScript server-boundary module
- server boundary: `scripts/server/stagingBffServerBoundary.ts`
- entrypoint export: `handleBffStagingServerRequest`
- current HTTP listener: missing
- health endpoint contract: `GET /health`
- readiness endpoint contract: `GET /ready`
- read routes: 5
- mutation routes: 5
- mutation routes enabled by default: NO
- local fixture shadow support: YES
- mobile BFF runtime enabled: NO

## Provider Decision
Recommended target: Render Web Service.

Why:
- It matches the intended normal Node HTTP service shape once a thin HTTP wrapper exists.
- It supports Git-linked service deployment with build and start commands.
- It keeps BFF capacity separate from the Supabase Edge Functions platform, which is already under limits review.
- It is lighter than Fly.io for the first staging URL and better aligned than Vercel serverless or Supabase Edge Functions for this boundary.

Provider comparison:
- Render: recommended.
- Railway: compatible alternative.
- Fly.io: compatible but more ops-heavy.
- Vercel serverless: possible only with a function adapter; not recommended as first target.
- Supabase Edge Functions: not recommended for the current Node boundary and current Supabase capacity posture.
- Custom VPS: blocked until repo and ops support exist.

Official docs consulted:
- Render Web Services: https://render.com/docs/web-services
- Render deploys: https://render.com/docs/deploys
- Railway services: https://docs.railway.com/develop/services
- Railway public networking: https://docs.railway.com/reference/public-networking
- Fly deploys: https://fly.io/docs/apps/deploy/
- Fly Dockerfile deploys: https://fly.io/docs/languages-and-frameworks/dockerfile/
- Vercel runtimes/limits: https://vercel.com/docs/functions/runtimes and https://vercel.com/docs/functions/limitations/
- Supabase Edge Functions/limits/secrets: https://supabase.com/docs/guides/functions, https://supabase.com/docs/guides/functions/limits, https://supabase.com/docs/guides/functions/secrets

## Exact Setup Checklist
1. Do not deploy in this wave.
2. In the next implementation wave, add a thin Node HTTP wrapper around `handleBffStagingServerRequest`.
3. Add a staging-only start command for that wrapper without enabling mobile BFF traffic.
4. Create a Render Web Service named `gox-build-staging-bff` from GitHub `main`.
5. Set the Render build command to install dependencies and run the deploy-wave verification.
6. Set the Render start command to the staging BFF HTTP wrapper command after the wrapper exists.
7. Set server-only env names in Render without printing values: `BFF_SERVER_AUTH_SECRET`, `BFF_DATABASE_READONLY_URL`, `BFF_MUTATION_ENABLED=false`, `BFF_IDEMPOTENCY_METADATA_ENABLED=false`, `BFF_RATE_LIMIT_METADATA_ENABLED=false`.
8. Keep Redis, Queue, idempotency persistence, rate enforcement, and external observability disabled.
9. Configure health check path `/health` and readiness verification path `/ready`.
10. After Render creates the staging service URL, set `STAGING_BFF_BASE_URL` in staging env and record only redacted presence in artifacts.
11. Run a later staging health/readiness wave.
12. Run staging shadow parity only after `/health` and `/ready` pass; do not route mobile traffic to BFF.

## Decision
- deploy target selected: Render Web Service
- human provider choice still required: NO
- deploy now: NO
- `STAGING_BFF_BASE_URL`: missing
- BFF URL invented: NO

## Gates
- JSON artifact parse: PASS
- targeted BFF deploy target decision test: PASS
- `git diff --check`: PASS
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS
- `npm test`: PASS
- `npm run release:verify -- --json`: PASS

## Safety
- production touched: NO
- BFF deployed: NO
- live BFF checks run: NO
- mobile traffic routed to BFF: NO
- Redis/Queue/idempotency/rate/observability enabled: NO
- 50K load run: NO
- env values/secrets/raw payloads printed: NO

