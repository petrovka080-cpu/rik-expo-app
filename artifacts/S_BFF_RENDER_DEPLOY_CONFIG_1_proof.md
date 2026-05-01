# S-BFF Render Deploy Config 1

Status: `GREEN_RENDER_BFF_DEPLOY_CONFIG_READY`.

## Decision
Render's autofill is not correct for this repo:

- `npm install` is too weak for the staging BFF deploy gate.
- `node expo-router/entry` starts the mobile Expo entry, not the staging BFF.

The repo now has a thin staging-only HTTP wrapper for the existing BFF boundary:

- boundary module: `scripts/server/stagingBffServerBoundary.ts`
- boundary export: `handleBffStagingServerRequest`
- HTTP wrapper: `scripts/server/stagingBffHttpServer.ts`
- health endpoint: `GET /health`
- readiness endpoint: `GET /ready`

## Copy-Paste Render Config
Render Name:

```txt
gox-build-staging-bff
```

Root Directory:

```txt

```

Leave Root Directory blank. The repo root is correct because `package.json` and `scripts/server` are at the root.

Build Command:

```txt
npm ci --include=dev && npm run verify:typecheck && npm test -- --runInBand tests/scale/bffStagingServerBoundary.test.ts tests/scale/bffStagingHttpServer.test.ts
```

Start Command:

```txt
npx --no-install tsx scripts/server/stagingBffHttpServer.ts
```

Health Check Path:

```txt
/health
```

Readiness Path for manual smoke:

```txt
/ready
```

Instance Type:

```txt
Starter
```

Auto Deploy:

```txt
No
```

## Environment Variable Names
Set names only in Render; do not print values in artifacts or chat:

- `NODE_ENV`
- `BFF_SERVER_AUTH_SECRET`
- `BFF_DATABASE_READONLY_URL`
- `BFF_MUTATION_ENABLED`
- `BFF_IDEMPOTENCY_METADATA_ENABLED`
- `BFF_RATE_LIMIT_METADATA_ENABLED`
- `STAGING_BFF_BASE_URL`

Render provides `PORT`; do not hard-code it.

Do not invent `STAGING_BFF_BASE_URL`. Leave it missing until Render creates the service URL, then record only redacted presence in a later wave.

## Manual Setup Checklist
1. Choose Render service type `Web Service`.
2. Select repo `petrovka080-cpu/rik-expo-app`.
3. Select branch `main`.
4. Set name `gox-build-staging-bff`.
5. Leave Root Directory blank.
6. Paste the Build Command above.
7. Paste the Start Command above.
8. Set Health Check Path `/health`.
9. Use instance type `Starter` for first smoke.
10. Set Auto Deploy to `No` for first smoke.
11. Add only the env var names listed above.
12. Keep mutation/idempotency/rate/provider posture disabled for smoke.
13. Click Deploy only after reviewing this config.
14. After deploy, check `/health`, then `/ready`.
15. Do not route mobile traffic to BFF until a later live health/readiness and shadow parity wave is green.

## Safety
- BFF deployed: NO
- production touched: NO
- `STAGING_BFF_BASE_URL` invented: NO
- mobile traffic routed to BFF: NO
- Redis/Queue/idempotency/rate/observability enabled: NO
- live 1K / 50K load run: NO
- env values, DB URL, passwords, secrets, raw payloads printed: NO

## Gates
- JSON artifact parse: PASS
- targeted BFF HTTP server test: PASS
- `git diff --check`: PASS
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS
- `npm test`: PASS
- `npm run release:verify -- --json`: PASS
