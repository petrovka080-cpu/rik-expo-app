# S-BFF Staging Smoke 1

Status: `GREEN_BFF_STAGING_SMOKE_READY_ENV_BASE_URL_PENDING`.

## Scope
- Ran staging BFF smoke against the Render Web Service URL provided by the operator.
- No production access, no mobile BFF routing, no provider enablement, no migrations, and no load tests.
- No secrets, env values, DB URLs, auth tokens, or raw payloads were printed.

## Preflight
- HEAD == origin/main at start: YES (`4ce49257dc22657dfc13b4f690d119ea04db327a`)
- worktree clean at start: YES
- public Render URL used: `https://gox-build-staging-bff.onrender.com`
- local `STAGING_BFF_BASE_URL`: missing

Because local env does not expose `STAGING_BFF_BASE_URL` and Render env values were not read, the smoke is green but the base URL env state remains `needs_env_update_or_confirmation`.

## Live Smoke Results
- `GET /health`: HTTP `200`, `ok=true`, `status=ok`, `serverBoundaryReady=true`, `productionTouched=false`
- `GET /ready`: HTTP `200`, `ok=true`, `status=ready`, `readRoutes=5`, `mutationRoutes=5`
- mutation defaults: `mutationRoutesEnabledByDefault=false`, `mutationRoutesEnabled=false`
- validation flags: `requestEnvelopeValidation=true`, `responseEnvelopeValidation=true`, `redactedErrors=true`
- mobile runtime flag: `appRuntimeBffEnabled=false`
- `GET /`: HTTP `404`, `BFF_ROUTE_NOT_FOUND`; this is acceptable for the root route
- unauthenticated mutation probe: HTTP `401`, `BFF_AUTH_REQUIRED`; raw test payload was not returned

## Provider And Routing State
- Provider flags remain disabled by operator-confirmed Render env posture and live `/ready` effective state.
- Mutation routes remain disabled.
- Mobile traffic routing remains disabled.
- Redis, Queue, idempotency persistence, rate enforcement, and external observability remain disabled.

## Decision
- BFF staging smoke ready: YES
- `STAGING_BFF_BASE_URL` env update/confirmation still needed: YES
- Mobile traffic can route to BFF: NO
- Live shadow parity can run: not yet; do it in a later wave after base URL env confirmation.

## Gates
- JSON artifact parse: PASS
- `git diff --check`: PASS
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS
- `npm test`: PASS
- `npm run release:verify -- --json`: PASS

## Safety
- production touched: NO
- mobile BFF routing enabled: NO
- Redis/Queue/idempotency/rate/observability enabled: NO
- load tests run: NO
- migrations run: NO
- secrets/env values/raw payloads printed: NO
