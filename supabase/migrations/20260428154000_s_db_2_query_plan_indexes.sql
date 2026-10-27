-- S-DB-2: additive query-plan indexes for high-volume list/history paths.
-- Production note: if target tables are already large, apply equivalent indexes
-- with CREATE INDEX CONCURRENTLY in a production-safe deployment window.

-- Supports src/lib/api/requestCanonical.read.ts loadCanonicalRequestsWindow:
-- order: submitted_at DESC NULLS LAST, display_no DESC, id DESC
CREATE INDEX IF NOT EXISTS idx_requests_submitted_display_id_sdb2
ON public.requests (submitted_at DESC NULLS LAST, display_no DESC NULLS LAST, id DESC);

-- Supports src/lib/catalog/catalog.request.service.ts listRequestItems:
-- filter: request_id = ?
-- order: row_no ASC, position_order ASC, id ASC
CREATE INDEX IF NOT EXISTS idx_request_items_request_row_position_id_sdb2
ON public.request_items (request_id, row_no ASC, position_order ASC, id ASC);

-- Supports src/screens/director/director.repository.ts pending item fan-in:
-- filter: request_id IN (...), status IN (...)
CREATE INDEX IF NOT EXISTS idx_request_items_request_status_sdb2
ON public.request_items (request_id, status, id);

-- Supports src/lib/api/proposals.ts listDirectorProposalsPending:
-- filter: submitted_at IS NOT NULL, sent_to_accountant_at IS NULL
-- order: submitted_at DESC
CREATE INDEX IF NOT EXISTS idx_proposals_director_pending_submitted_sdb2
ON public.proposals (submitted_at DESC NULLS LAST, id DESC)
WHERE submitted_at IS NOT NULL AND sent_to_accountant_at IS NULL;

-- Supports src/lib/catalog/catalog.proposalCreation.service.ts proposal lookup:
-- filter: request_id = ?, supplier = ? / supplier IS NULL
-- order: updated_at DESC
CREATE INDEX IF NOT EXISTS idx_proposals_request_supplier_updated_sdb2
ON public.proposals (request_id, supplier, updated_at DESC NULLS LAST, id DESC);

-- Supports proposal item detail reads in src/lib/api/proposals.ts and PDF/detail paths:
-- filter: proposal_id = ?
-- order: id ASC
CREATE INDEX IF NOT EXISTS idx_proposal_items_proposal_id_id_sdb2
ON public.proposal_items (proposal_id, id ASC);

-- Supports src/features/supplierShowcase/supplierShowcase.data.ts company listing slice:
-- filter: company_id = ?, status = ?
-- order: created_at DESC
CREATE INDEX IF NOT EXISTS idx_market_listings_company_status_created_sdb2
ON public.market_listings (company_id, status, created_at DESC NULLS LAST, id DESC);

-- Supports src/features/supplierShowcase/supplierShowcase.data.ts user listing slice:
-- filter: user_id = ?, status = ?
-- order: created_at DESC
CREATE INDEX IF NOT EXISTS idx_market_listings_user_status_created_sdb2
ON public.market_listings (user_id, status, created_at DESC NULLS LAST, id DESC);

-- Supports contractor history reads in src/screens/contractor/contractor.data.ts
-- and src/screens/contractor/contractor.workModalService.ts:
-- filter: progress_id = ?
-- order: created_at ASC/DESC
CREATE INDEX IF NOT EXISTS idx_work_progress_log_progress_created_sdb2
ON public.work_progress_log (progress_id, created_at DESC, id DESC);

-- Supports src/screens/warehouse/warehouse.api.repo.ts fetchWarehouseIncomingLedgerRows:
-- filter: direction = ?, moved_at BETWEEN ? AND ?
CREATE INDEX IF NOT EXISTS idx_wh_ledger_direction_moved_at_sdb2
ON public.wh_ledger (direction, moved_at, id);
