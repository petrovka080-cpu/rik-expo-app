# S Audit Night Battle 132: Attachment Web Fallback Observability

## Selected Files
- `src/lib/documents/attachmentOpener.ts`
- `src/lib/documents/attachmentOpener.test.ts`

## Reason Selected
- The A1/R7 audit backlog had a live attachment opener risk: the web blob fetch/open path could fail and silently fall back to direct open.
- The fallback behavior is useful and was preserved, but the failure is now observable and redacted.

## Before
- `openAttachmentOnWeb` used a silent `catch { openDirect(); }`.
- A failed blob fetch/open path gave no event trail.
- The direct fallback could hide popup/fetch/browser differences during support triage.

## After
- `openAttachmentOnWeb` catches `error`, records `web_blob_open_fallback_to_direct`, and then calls the same `openDirect()` fallback.
- The observability event uses `fallbackUsed: true`, `errorStage: "web_blob_open"`, redacted error text, and hashed URI/file-name metadata only.
- The focused test proves the signed URL, query token, and file name do not land in the event payload.

## Fresh Scan Notes
- Target file was read before editing.
- `git grep -n "web_blob_open_fallback_to_direct\\|catch {" src/lib/documents/attachmentOpener.ts src/lib/documents/attachmentOpener.test.ts` confirms the new event and shows only pre-existing bounded `catch {}` blocks outside this selected risk.
- Added-line scan found no `as any`, `@ts-ignore`, or new `catch {}`.

## Gates
- focused tests: PASS
  - `npx jest src/lib/documents/attachmentOpener.test.ts --runInBand`
  - `npx jest tests/observability/noSilentRuntimeCatch.test.ts tests/observability/devStyleGuardCatchDiscipline.test.ts --runInBand`
- typecheck: PASS
  - `npx tsc --noEmit --pretty false`
- lint: PASS
  - `npx expo lint`
- full Jest runInBand: PASS
  - `npm test -- --runInBand`
  - 665 test suites passed, 1 skipped; 3939 tests passed, 1 skipped
- architecture scanner: PASS
  - `npx tsx scripts/architecture_anti_regression_suite.ts --json`
  - service bypass findings 0, service bypass files 0, transport controlled findings 175, unclassified current findings 0, production raw loop findings 0
- git diff --check: PASS
- release verify post-push: PASS
  - `npm run release:verify -- --json`
  - verified `501987d325ec5c8dd4f360b38a75aba35488e379`
  - synced with `origin/main`, release gates passed: tsc, expo-lint, architecture anti-regression, Jest runInBand, Jest, git diff check

## Safety
- No production calls, DB writes, migrations, remote env writes, deploy, OTA, live load tests, Supabase project changes, spend cap changes, Realtime capacity work, force push, tags, secrets printed, `catch {}` additions, `@ts-ignore`, or `as any`.
- Supabase Realtime status: `WAITING_FOR_SUPABASE_SUPPORT_RESPONSE`
