# Transport Ownership Map

Status: locked baseline
Generated from: `npx tsx scripts/architecture_anti_regression_suite.ts --json`
Baseline date: 2026-09-08
Scanner source SHA-256: `45a63b16999fb2857cbb78e367442eef7a896ac64a252de597aecd45d0d4a864`
Scanner inventory SHA-256: `7dc654a501ed1695d8977f792d7f16b92e306ecaa61e71f6d987ce95d0da5d0f`
Production feature enablement: NO
Production traffic migrated: NO
Deploy or OTA implied: NO
Realtime capacity changed: NO

## Ownership Rules

- `src/lib/supabaseClient.ts` is the irreducible root client initializer. It may initialize and expose the Supabase client, but it is not a service-layer bypass.
- Provider calls are owned only by transport files, BFF client files, server files, or the root client initializer.
- Non-transport service files must not call `supabase.from`, `supabase.rpc`, `supabase.storage`, `supabase.channel`, `supabase.realtime`, or auth lifecycle/listener APIs directly.
- The service layer owns validation, payload shaping, result mapping, and error semantics only.
- Auth lifecycle listener ownership is in auth transport, primarily `src/lib/auth/useAuthLifecycle.auth.transport.ts`.
- Request item mutation ownership is in item mutation transport: `src/lib/api/requests.itemMutations.transport.ts`.
- Adding a provider surface means updating this map and keeping `serviceBypassFindings` at `0`.

## Scanner Baseline

- Total direct Supabase findings: 187
- Transport-controlled findings: 143
- Transport-owned files with provider findings: 70
- Service bypass findings: 0
- Service bypass files: 0
- Test-only findings: 44
- Generated or ignored findings: 0

## Provider Surface Summary

- auth: 51 findings across 32 files
- read: 22 findings across 10 files
- realtime: 7 findings across 2 files
- rpc: 32 findings across 20 files
- storage: 13 findings across 6 files
- write: 18 findings across 13 files

## Provider Surface Ownership

### rpc

RPC calls are allowed only in `.transport.*`, `.bff.*`, `/server/`, or root-client owned files when the scanner classifies them as transport-controlled. Service code may call typed transport functions and keep business validation/error semantics outside the provider call site.

### from/select/update/insert/delete

Table reads and writes are transport-owned. Service files may choose the payload, validate domain state, and interpret typed results, but must not build direct Supabase query chains.

### storage

Storage bucket operations are transport-owned. UI and services may request a file operation through a storage transport, but must not call `supabase.storage` directly.

### auth listener

Auth session reads, user reads, sign-in/sign-up/reset flows, and auth lifecycle listeners are transport-owned. Lifecycle subscription ownership moved to auth transport so screens and services do not subscribe directly.

### realtime/channel

Realtime auth, channel creation, and channel cleanup are transport-owned. This map does not approve Realtime capacity work while Supabase support status is waiting.

## Transport-Owned Files

- `src/components/foreman/calcModal.rpc.transport.ts` - rpc
- `src/components/map/MapScreen.market.transport.ts` - read, write
- `src/features/ai/assistantActions.transport.ts` - auth, read
- `src/features/market/market.auth.transport.ts` - auth
- `src/features/market/market.repository.transport.ts` - rpc, write
- `src/features/profile/currentProfileIdentity.auth.transport.ts` - auth
- `src/features/supplierShowcase/supplierShowcase.auth.transport.ts` - auth
- `src/lib/ai_reports.transport.ts` - write
- `src/lib/api/canonicalPdfAuth.transport.ts` - auth
- `src/lib/api/director.return.transport.ts` - rpc
- `src/lib/api/directorPdfSource.transport.ts` - rpc
- `src/lib/api/directorReportsTransport.transport.ts` - rpc
- `src/lib/api/foremanAiResolve.transport.ts` - rpc
- `src/lib/api/paymentPdf.transport.ts` - rpc
- `src/lib/api/profile.transport.ts` - rpc
- `src/lib/api/proposals.transport.ts` - rpc
- `src/lib/api/request.repository.auth.transport.ts` - auth
- `src/lib/api/requestDraftSync.auth.transport.ts` - auth
- `src/lib/api/requestDraftSync.transport.ts` - realtime, rpc, write
- `src/lib/api/requests.auth.transport.ts` - auth
- `src/lib/api/requests.itemMutations.transport.ts` - rpc, write
- `src/lib/api/storage.transport.ts` - storage
- `src/lib/assistant_store_read.bff.client.ts` - auth
- `src/lib/assistant_store_read.low_risk.transport.ts` - read
- `src/lib/auth/passwordReset.transport.ts` - auth
- `src/lib/auth/protectedIdentity.transport.ts` - auth
- `src/lib/auth/signIn.transport.ts` - auth
- `src/lib/auth/signUp.transport.ts` - auth
- `src/lib/catalog/catalog.bff.client.ts` - auth
- `src/lib/catalog/catalog.proposalCreation.transport.ts` - rpc
- `src/lib/catalog/catalog.request.transport.ts` - read, rpc, write
- `scripts/server/stagingBffCatalogTransportReadPort.ts` - canonical server-side catalog read/RPC owner; client transport fails closed
- `src/lib/chat.auth.transport.ts` - auth
- `src/lib/documents/attachmentOpener.storage.transport.ts` - storage
- `src/lib/estimate/backendPlatform/canonicalEstimateAuth.transport.ts` - auth
- `src/lib/files.storage.transport.ts` - storage, write
- `src/lib/media/services/mediaBackendUpload.transport.ts` - rpc, storage
- `src/lib/pdfRunner.auth.transport.ts` - auth
- `src/lib/store_supabase.write.transport.ts` - rpc, write
- `src/lib/supabaseClient.ts` - auth, root client initializer
- `src/screens/accountant/accountant.history.transport.ts` - rpc
- `src/screens/accountant/accountant.inbox.transport.ts` - rpc
- `src/screens/accountant/accountant.return.transport.ts` - rpc
- `src/screens/accountant/accountant.screen.auth.transport.ts` - auth
- `src/screens/accountant/useAccountantCardFlow.auth.transport.ts` - auth
- `src/screens/buyer/BuyerSubcontractTab.auth.transport.ts` - auth
- `src/screens/buyer/buyer.actions.auth.transport.ts` - auth
- `src/screens/buyer/buyer.repo.storage.transport.ts` - storage
- `src/screens/buyer/buyer.summary.auth.transport.ts` - auth
- `src/screens/buyer/hooks/useBuyerAccountingFlags.transport.ts` - write
- `src/screens/buyer/hooks/useBuyerAutoFio.auth.transport.ts` - auth
- `src/screens/buyer/hooks/useBuyerRequestProposalMap.transport.ts` - rpc
- `src/screens/buyer/hooks/useBuyerRfqPrefill.auth.transport.ts` - auth
- `src/screens/contractor/contractor.profileService.auth.transport.ts` - auth
- `src/screens/contractor/contractor.screenData.auth.transport.ts` - auth
- `src/screens/contractor/contractor.workModalService.transport.ts` - read
- `src/screens/director/director.finance.bff.client.ts` - auth
- `src/screens/director/director.lifecycle.auth.transport.ts` - auth
- `src/screens/director/director.lifecycle.realtime.transport.ts` - realtime
- `src/screens/director/director.metrics.transport.ts` - read
- `src/screens/foreman/foreman.dicts.transport.ts` - read
- `src/screens/foreman/foreman.requests.transport.ts` - read, write
- `src/screens/office/officeAccess.transport.ts` - write
- `src/screens/profile/profile.auth.transport.ts` - auth
- `src/screens/profile/profile.data.transport.ts` - read, write
- `src/screens/profile/profile.storage.transport.ts` - storage
- `src/screens/security/SecurityScreen.auth.transport.ts` - auth
- `src/screens/subcontracts/subcontracts.shared.transport.ts` - rpc
- `src/screens/warehouse/warehouse.api.bff.client.ts` - auth
- `src/screens/warehouse/warehouse.nameMap.ui.transport.ts` - read
- `src/screens/warehouse/warehouse.seed.transport.ts` - write

## Production Safety Notes

This document is an ownership map only. It does not enable production traffic, does not switch BFF traffic on by default, does not publish OTA, does not run migrations, does not write remote environment, and does not change Supabase project settings or spend caps.
