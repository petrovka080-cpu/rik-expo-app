# S-WAVE-2 safe JSON parse notes

## Scope

- Added a shared safe JSON parsing/stringifying utility in `src/lib/format.ts`.
- Used an existing source module instead of adding `src/lib/safeJson.ts` because the repo performance budget is strict about source module count.
- Migrated high-risk persisted/offline/draft/breadcrumb JSON.parse call-sites only.
- Left runtime-only, AI-response, HTTP-response, and clone/serialization JSON.parse call-sites untouched.

## Migrated call-sites

- `src/lib/localCache.ts`: AsyncStorage foreman recents/favorites.
- `src/lib/offline/offlineStorage.ts`: shared persisted JSON read boundary for offline queues and durable draft stores.
- `src/lib/storage/classifiedStorage.ts`: classified storage envelopes and JSON values.
- `src/lib/navigation/officeReentryBreadcrumbs.persistence.ts`: office reentry breadcrumbs.
- `src/lib/navigation/warehouseBackBreadcrumbs.ts`: warehouse back breadcrumbs.
- `src/lib/pdf/pdfCrashBreadcrumbs.ts`: PDF crash breadcrumbs.
- `src/screens/foreman/foreman.localDraft.ts`: legacy foreman local draft recovery.
- `src/screens/warehouse/warehouse.utils.ts`: warehouse storage JSON helper.
- `src/screens/warehouse/warehouseReceiveQueue.ts`: warehouse receive queue and quarantine storage.

## Skipped call-sites

- `src/lib/ai/geminiGateway.ts`: AI/runtime response parsing; not persisted storage.
- `src/screens/foreman/foreman.ai.ts`: AI response parsing; needs separate behavior decisions.
- `src/lib/api/proposalIntegrity.ts`: runtime detail parsing; not persisted storage.
- `src/lib/pdf/directorPdfPlatformContract.ts`: HTTP response body parsing; not persisted storage.
- `src/screens/contractor/contractor.utils.ts`: pure runtime string parsing.
- `src/screens/foreman/foreman.localDraft.ts` clone/serialized snapshot call-sites: in-memory clone/persistence serialization, not corrupted storage reads.

## Safety notes

- Queue item shape changed: NO.
- Draft schema changed: NO.
- Mutation payload changed: NO.
- `client_mutation_id` changed: NO.
- Retry/quarantine semantics changed: NO.
- Raw JSON logged: NO.
- Warehouse receive queue still preserves its existing quarantine behavior for corrupted queue JSON.
- SQL/RPC/RLS/UI/Maestro YAML/app config/package changes: NO.

## Gate note

Maestro critical was rerun with a full-suite timeout budget and passed 14/14 flows in 25m 51s on the Android emulator.
