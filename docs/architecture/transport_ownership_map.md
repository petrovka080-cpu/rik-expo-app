# Transport Ownership Map

Status: locked baseline
Generated from: `npx tsx scripts/architecture_anti_regression_suite.ts --json`
Baseline date: 2026-05-09
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

- Total direct Supabase findings: 220
- Transport-controlled findings: 173
- Transport-owned files with provider findings: 89
- Service bypass findings: 0
- Service bypass files: 0
- Test-only findings: 47
- Generated or ignored findings: 0

## Provider Surface Summary

- auth: 49 findings across 32 files
- read: 18 findings across 11 files
- realtime: 7 findings across 2 files
- rpc: 71 findings across 42 files
- storage: 11 findings across 5 files
- write: 17 findings across 12 files

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
- `src/features/supplierShowcase/supplierShowcase.transport.ts` - read
- `src/lib/ai_reports.transport.ts` - write
- `src/lib/api/_core.transport.ts` - rpc
- `src/lib/api/canonicalPdfAuth.transport.ts` - auth
- `src/lib/api/director.return.transport.ts` - rpc
- `src/lib/api/directorPdfSource.transport.ts` - rpc
- `src/lib/api/directorReportsTransport.transport.ts` - rpc
- `src/lib/api/foremanAiResolve.transport.ts` - rpc
- `src/lib/api/integrity.guards.transport.ts` - rpc
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
- `src/lib/auth/signIn.transport.ts` - auth
- `src/lib/auth/signUp.transport.ts` - auth
- `src/lib/auth/useAuthLifecycle.auth.transport.ts` - auth
- `src/lib/catalog/catalog.bff.client.ts` - auth
- `src/lib/catalog/catalog.proposalCreation.transport.ts` - rpc
- `src/lib/catalog/catalog.request.transport.ts` - read, rpc, write
- `src/lib/catalog/catalog.transport.supabase.ts` - read, rpc
- `src/lib/chat.auth.transport.ts` - auth
- `src/lib/documents/attachmentOpener.storage.transport.ts` - storage
- `src/lib/files.storage.transport.ts` - storage, write
- `src/lib/infra/queueLatencyMetrics.transport.ts` - rpc
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
- `src/screens/buyer/buyer.actions.write.transport.ts` - rpc
- `src/screens/buyer/buyer.repo.storage.transport.ts` - storage
- `src/screens/buyer/buyer.summary.auth.transport.ts` - auth
- `src/screens/buyer/hooks/useBuyerAccountingFlags.transport.ts` - write
- `src/screens/buyer/hooks/useBuyerAutoFio.auth.transport.ts` - auth
- `src/screens/buyer/hooks/useBuyerRequestProposalMap.transport.ts` - rpc
- `src/screens/buyer/hooks/useBuyerRfqPrefill.auth.transport.ts` - auth
- `src/screens/contractor/contractor.profileService.auth.transport.ts` - auth
- `src/screens/contractor/contractor.screenData.auth.transport.ts` - auth
- `src/screens/contractor/contractor.workModalService.transport.ts` - read, rpc
- `src/screens/contractor/contractor.workSearch.transport.ts` - rpc
- `src/screens/contractor/contractorPdfSource.transport.ts` - rpc
- `src/screens/director/director.approve.transport.ts` - rpc
- `src/screens/director/director.data.transport.ts` - read
- `src/screens/director/director.finance.bff.client.ts` - auth
- `src/screens/director/director.finance.rpc.transport.ts` - rpc
- `src/screens/director/director.lifecycle.auth.transport.ts` - auth
- `src/screens/director/director.lifecycle.realtime.transport.ts` - realtime
- `src/screens/director/director.metrics.transport.ts` - read
- `src/screens/director/director.proposalDecision.transport.ts` - rpc
- `src/screens/director/director.proposals.transport.ts` - rpc
- `src/screens/director/director.repository.transport.ts` - rpc
- `src/screens/director/director.request.transport.ts` - rpc
- `src/screens/foreman/foreman.auth.transport.ts` - auth
- `src/screens/foreman/foreman.requests.transport.ts` - read, write
- `src/screens/office/officeAccess.transport.ts` - write
- `src/screens/profile/profile.auth.transport.ts` - auth
- `src/screens/profile/profile.storage.transport.ts` - storage
- `src/screens/security/SecurityScreen.auth.transport.ts` - auth
- `src/screens/subcontracts/subcontracts.shared.transport.ts` - rpc
- `src/screens/warehouse/hooks/useWarehouseReceiveApply.transport.ts` - rpc
- `src/screens/warehouse/warehouse.api.bff.client.ts` - auth
- `src/screens/warehouse/warehouse.api.repo.transport.ts` - rpc
- `src/screens/warehouse/warehouse.dayMaterialsReport.pdf.transport.ts` - rpc
- `src/screens/warehouse/warehouse.incomingForm.pdf.transport.ts` - rpc
- `src/screens/warehouse/warehouse.incomingMaterialsReport.pdf.transport.ts` - rpc
- `src/screens/warehouse/warehouse.issue.transport.ts` - rpc
- `src/screens/warehouse/warehouse.nameMap.ui.transport.ts` - read, rpc
- `src/screens/warehouse/warehouse.objectWorkReport.pdf.transport.ts` - rpc
- `src/screens/warehouse/warehouse.seed.transport.ts` - rpc, write

## Production Safety Notes

This document is an ownership map only. It does not enable production traffic, does not switch BFF traffic on by default, does not publish OTA, does not run migrations, does not write remote environment, and does not change Supabase project settings or spend caps.
