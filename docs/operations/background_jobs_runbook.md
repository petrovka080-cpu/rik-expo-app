# Background Jobs Runbook

Status: disabled by default.

This runbook covers the server-side background job boundary added for future 50K scale work. It does not describe a live production queue because no queue provider is deployed in this wave.

## Current Safe State

- Production touched: NO
- Staging touched: NO
- External queue calls: NO
- App runtime jobs enabled: NO
- Existing app flows replaced: NO
- SQL/RPC/RLS/storage changed: NO
- Package/native config changed: NO

## Adapters

- `NoopJobAdapter`: default disabled adapter. Returns a safe disabled response.
- `InMemoryJobAdapter`: deterministic local test adapter only.
- `ExternalJobAdapterContract`: future provider contract. It does not perform network calls.

## Enablement Rules

Future live execution must require all of the following:

1. Owner-approved queue provider.
2. Staging deployment and shadow proof.
3. Explicit server-side enable flag.
4. Idempotency metadata for mutating jobs.
5. Rate-limit metadata for notification and mutation-heavy jobs.
6. Payload safety validation.
7. Dead-letter handling that stores no raw payload or PII.

Missing configuration must keep jobs disabled.

## Job Submission Checklist

Before any future job can be submitted:

- Confirm `defaultEnabled: false` is intentionally overridden only on server.
- Validate payload envelope.
- Confirm payload size is below the policy cap.
- Confirm no forbidden fields are present.
- Confirm idempotency requirement is present for mutating jobs.
- Confirm retry policy and dead-letter policy are attached.
- Confirm no raw payload is logged.

## Dead Letter Handling

Dead-letter summaries may include:

- job type
- idempotent operation
- reason
- retryable flag
- payload summary status

Dead-letter summaries must not include:

- raw payloads
- email, phone, address
- JWTs, tokens, signed URLs
- service-role or admin credentials
- raw prompts or AI responses

## Queue Provider Plug-In Plan

When a real queue provider is approved:

1. Implement a server-only adapter behind `ExternalJobAdapterContract`.
2. Keep mobile/client code free of provider credentials.
3. Run local contract tests.
4. Deploy to staging only.
5. Run shadow jobs against seeded fixtures only.
6. Prove cleanup and dead-letter behavior.
7. Only then consider production enablement as a separate wave.

## Disable Strategy

Set the server adapter back to `NoopJobAdapter` or remove the provider enable flag. Because this wave creates no queue storage and performs no live queue calls, there is no production drain or migration step.
