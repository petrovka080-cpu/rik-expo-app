import { supabase } from "../supabaseClient";
import type { Database } from "../database.types";
import { isRequestApprovedForProcurement } from "../requestStatus";
import {
  proposalAddItems as rpcProposalAddItems,
  proposalCreateFull as rpcProposalCreateFull,
  proposalSnapshotItems as rpcProposalSnapshotItems,
  proposalSubmit as rpcProposalSubmit,
  isProposalDirectorVisibleRow,
  normalizeProposalStatus,
  type ProposalStatus,
  type ProposalSubmitVerificationResult,
} from "../api/proposals";
import {
  ensureActiveProposalRequestItemsIntegrity,
} from "../api/integrity.guards";
import { recordCatalogWarning } from "./catalog.observability";
import {
  SUPPLIER_NONE_LABEL,
  asLooseRecord,
  asUnknownRecord,
  chunk,
  norm,
  parseNumberValue,
} from "./catalog.compat.shared";

export type ProposalBucketInput = {
  supplier?: string | null;
  request_item_ids: string[];
  meta?: {
    request_item_id: string;
    price?: string | null;
    supplier?: string | null;
    note?: string | null;
  }[];
};

export type CreateProposalsOptions = {
  buyerFio?: string | null;
  submit?: boolean;
  requestItemStatus?: string | null;
  requestId?: string | null;
  clientMutationId?: string | null;
};

export type CreateProposalsResult = {
  proposals: {
    proposal_id: string;
    proposal_no: string | null;
    supplier: string;
    request_item_ids: string[];
    status: ProposalStatus;
    raw_status: string | null;
    submitted: boolean;
    submitted_at: string | null;
    visible_to_director: boolean;
    submit_source: "rpc:proposal_submit" | "rpc:proposal_submit_text_v1" | null;
  }[];
  meta?: {
    canonical_path: "rpc:proposal_submit_v3";
    client_mutation_id: string | null;
    request_id: string | null;
    idempotent_replay: boolean;
    expected_bucket_count: number;
    expected_item_count: number;
    created_proposal_count: number;
    created_item_count: number;
    attachment_continuation_ready: boolean;
  };
};

type ProposalAtomicSubmitRpcArgs = {
  p_client_mutation_id: string;
  p_buckets: ProposalBucketInput[];
  p_buyer_fio?: string | null;
  p_submit?: boolean;
  p_request_item_status?: string | null;
  p_request_id?: string | null;
};

type ProposalAtomicSubmitRpcProposalRow = {
  bucket_index?: number | null;
  proposal_id?: string | null;
  proposal_no?: string | null;
  supplier?: string | null;
  request_item_ids?: unknown;
  raw_status?: string | null;
  submitted_at?: string | null;
  sent_to_accountant_at?: string | null;
  submit_source?: "rpc:proposal_submit" | "rpc:proposal_submit_text_v1" | null;
};

type ProposalAtomicSubmitRpcMeta = {
  canonical_path?: string | null;
  client_mutation_id?: string | null;
  request_id?: string | null;
  idempotent_replay?: boolean | null;
  expected_bucket_count?: number | null;
  expected_item_count?: number | null;
  created_proposal_count?: number | null;
  created_item_count?: number | null;
  attachment_continuation_ready?: boolean | null;
};

type ProposalAtomicSubmitRpcResult = {
  status?: string | null;
  proposals?: ProposalAtomicSubmitRpcProposalRow[] | null;
  meta?: ProposalAtomicSubmitRpcMeta | null;
};

type ExistingProposalRecoveryRow = {
  id?: string | null;
  proposal_no?: string | null;
  display_no?: string | null;
  status?: string | null;
  submitted_at?: string | null;
  sent_to_accountant_at?: string | null;
  supplier?: string | null;
};

type ExistingProposalItemRecoveryRow = {
  request_item_id?: string | null;
};

type SupplierBindingRow = Pick<Database["public"]["Tables"]["suppliers"]["Row"], "id" | "name">;
type ContractorBindingRow = Pick<Database["public"]["Tables"]["contractors"]["Row"], "id" | "company_name">;
type ProposalsUpdate = Database["public"]["Tables"]["proposals"]["Update"];
type ProposalItemsInsert = Database["public"]["Tables"]["proposal_items"]["Insert"];
type ProposalItemsUpdate = Database["public"]["Tables"]["proposal_items"]["Update"];
type RequestItemsUpdate = Database["public"]["Tables"]["request_items"]["Update"];
type RequestItemsSetStatusArgs = Database["public"]["Functions"]["request_items_set_status"]["Args"];

type ProposalCreationBindingResolved = {
  request_item_id: string;
  price: number;
  qty: number;
  supplier: string | null;
  supplier_id: string | null;
  contractor_id: string | null;
  kind: ProposalItemKind;
};

type ProposalCreationPreconditionsResolved = {
  shouldSubmit: boolean;
  statusAfter: string | null;
  itemInfoById: Map<string, RequestItemForProposal>;
  approvedItemIds: Set<string>;
  counterpartyBinding: CounterpartyBinding;
  proposalItemsBindingCols: ProposalItemsBindingColumns;
};

type ProposalCreationBucketPrepared = {
  bucketIndex: number;
  supplierLabel: string;
  supplierDisplay: string;
  supplierDb: string | null;
  request_item_ids: string[];
  metaRows: ProposalSnapshotMetaRow[];
  validatedBindings: ProposalCreationBindingResolved[];
};

type ProposalCreationBucketMutationResult = {
  bucketIndex: number;
  proposal_id: string;
  proposal_no: string | null;
  display_no: string | null;
  supplier: string;
  request_item_ids: string[];
  linked_request_item_ids: string[];
  resolved_bindings: ProposalCreationBindingResolved[];
  status: ProposalStatus;
  raw_status: string | null;
  submitted: boolean;
  submitted_at: string | null;
  visible_to_director: boolean;
  submit_source: "rpc:proposal_submit" | "rpc:proposal_submit_text_v1" | null;
  request_item_status_synced: boolean;
};

type ProposalCreationMutationResult = {
  proposals: ProposalCreationBucketMutationResult[];
};

type ProposalCreationHeadCreated = {
  proposal_id: string;
  proposal_no: string | null;
  display_no: string | null;
};

type ProposalCreationCompletionResult = {
  resolved_bindings: ProposalCreationBindingResolved[];
  submitVerification: ProposalSubmitVerificationResult | null;
};

type ProposalCreationRuntime = {
  dbCalls: number;
  proposalItemsBulkUpsertSupported: boolean;
};

type ProposalItemKind = "material" | "service" | "work" | "unknown";
type RequestItemForProposal = {
  id: string;
  request_id: string;
  qty: number;
  kind: ProposalItemKind;
  is_rejected_for_rework?: boolean;
};
type RequestStatusLiteRow = Pick<Database["public"]["Tables"]["requests"]["Row"], "id" | "status">;
type ProposalHeadMetaRow = Pick<
  Database["public"]["Tables"]["proposals"]["Row"],
  "proposal_no" | "id_short" | "display_no" | "request_id"
>;
type RequestItemForProposalRow = {
  id: string | null;
  request_id: string | null;
  qty: number | null;
  status: string | null;
  cancelled_at: string | null;
  kind: string | null;
  item_type: string | null;
  procurement_type: string | null;
  director_reject_at: string | null;
  director_reject_note: string | null;
};
type ProposalBucketMetaInput = NonNullable<ProposalBucketInput["meta"]>[number];
type ProposalSnapshotMetaRow = {
  request_item_id: string;
  price: string;
  supplier: string | null;
  note: string | null;
};
type CounterpartyBinding = {
  supplierIdByName: Map<string, string>;
  contractorIdByName: Map<string, string>;
};

type ProposalItemsBindingColumns = {
  supplier_id: boolean;
  contractor_id: boolean;
};

type ProposalItemsCompatInsertUpsert = ProposalItemsInsert & {
  supplier_id?: string | null;
  contractor_id?: string | null;
};

type ProposalItemsCompatUpdate = ProposalItemsUpdate & {
  supplier_id?: string | null;
  contractor_id?: string | null;
};

const SUPPLIERS_BINDING_SELECT = "id,name";
const CONTRACTORS_BINDING_SELECT = "id,company_name";

let proposalItemsBindingColumnsCache: ProposalItemsBindingColumns | null = null;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let proposalItemsBulkUpsertCapabilityCache: boolean | null = null;

async function loadProposalItemsBindingColumns(): Promise<ProposalItemsBindingColumns> {
  if (proposalItemsBindingColumnsCache) return proposalItemsBindingColumnsCache;

  try {
    const q = await supabase.from("proposal_items").select("*").limit(1);
    if (q.error) throw q.error;
    const row = Array.isArray(q.data) && q.data.length > 0 ? asUnknownRecord(q.data[0]) : null;
    const cols = row ? new Set(Object.keys(row)) : new Set<string>();
    proposalItemsBindingColumnsCache = {
      supplier_id: cols.has("supplier_id"),
      contractor_id: cols.has("contractor_id"),
    };
  } catch (error: unknown) {
    if (__DEV__) console.warn(
      "[catalog_api.createProposalsBySupplier] proposal_items columns probe:",
      (error as Error)?.message ?? error,
    );
    proposalItemsBindingColumnsCache = { supplier_id: false, contractor_id: false };
  }
  return proposalItemsBindingColumnsCache;
}

async function loadRequestItemsForProposal(ids: string[]): Promise<Record<string, unknown>[]> {
  const uniqIds = Array.from(new Set((ids || []).map((x) => String(x || "").trim()).filter(Boolean)));
  if (!uniqIds.length) return [];

  const q = await supabase.from("request_items").select("*").in("id", uniqIds);
  if (!q.error) {
    return Array.isArray(q.data)
      ? q.data
          .map((row) => asUnknownRecord(row))
          .filter((row): row is Record<string, unknown> => !!row)
      : [];
  }
  throw q.error;
}

const parseProposalKind = (raw: unknown): ProposalItemKind => {
  const value = String(raw ?? "").trim().toLowerCase();
  if (!value) return "unknown";
  if (
    value === "material" ||
    value === "materials" ||
    value === "\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b" ||
    value === "\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b"
  ) {
    return "material";
  }
  if (
    value === "service" ||
    value === "services" ||
    value === "\u0443\u0441\u043b\u0443\u0433\u0430" ||
    value === "\u0443\u0441\u043b\u0443\u0433\u0438"
  ) {
    return "service";
  }
  if (
    value === "work" ||
    value === "works" ||
    value === "\u0440\u0430\u0431\u043e\u0442\u0430" ||
    value === "\u0440\u0430\u0431\u043e\u0442\u044b"
  ) {
    return "work";
  }
  return "unknown";
};

const isRejectedForBuyerRework = (row: unknown): boolean => {
  const source = asLooseRecord(row);
  const status = String(source.status ?? "").trim().toLowerCase();
  if (status.includes("reject") || status.includes("\u043e\u0442\u043a\u043b\u043e\u043d")) return true;
  if (source.director_reject_at) return true;
  const note = String(source.director_reject_note ?? "").trim();
  return !!note;
};

const parsePositive = (raw: unknown): number => {
  const num = Number(String(raw ?? "").replace(",", "."));
  return Number.isFinite(num) && num > 0 ? num : 0;
};

const isCancelledRequestItemSource = (row: RequestItemForProposalRow): boolean => {
  if (String(row.cancelled_at ?? "").trim()) return true;
  const normalizedStatus = String(row.status ?? "").trim().toLowerCase();
  return normalizedStatus === "cancelled" || normalizedStatus === "canceled";
};

const normCounterpartyKey = (value: unknown): string =>
  String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();

const parseRequestStatusLiteRows = (value: unknown): RequestStatusLiteRow[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      const record = asUnknownRecord(row);
      if (!record) return null;
      const id = norm(record.id == null ? null : String(record.id));
      if (!id) return null;
      return {
        id,
        status: record.status == null ? null : String(record.status),
      };
    })
    .filter((row): row is RequestStatusLiteRow => !!row);
};

const parseRequestItemsForProposalRows = (value: unknown): RequestItemForProposalRow[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      const record = asUnknownRecord(row);
      if (!record) return null;
      return {
        id: record.id == null ? null : String(record.id),
        request_id: record.request_id == null ? null : String(record.request_id),
        qty: parseNumberValue(record.qty) ?? null,
        status: record.status == null ? null : String(record.status),
        cancelled_at:
          record.cancelled_at == null ? null : String(record.cancelled_at),
        kind: record.kind == null ? null : String(record.kind),
        item_type: record.item_type == null ? null : String(record.item_type),
        procurement_type: record.procurement_type == null ? null : String(record.procurement_type),
        director_reject_at:
          record.director_reject_at == null ? null : String(record.director_reject_at),
        director_reject_note:
          record.director_reject_note == null ? null : String(record.director_reject_note),
      };
    })
    .filter((row): row is RequestItemForProposalRow => !!row);
};

const mapProposalHeadDisplay = (
  row:
    | ProposalHeadMetaRow
    | { proposal_no: string | null; id_short: number | null; display_no?: string | null; request_id?: string | null }
    | null,
): { proposalNo: string | null; displayNo: string | null; requestId: string | null } => {
  const proposalNo =
    row?.proposal_no ??
    row?.display_no ??
    (row?.id_short != null ? `PR-${String(row.id_short)}` : null);
  return {
    proposalNo,
    displayNo: row?.display_no ?? null,
    requestId: norm(row?.request_id ?? null) || null,
  };
};

const parseProposalBucketMetaInput = (
  row: ProposalBucketMetaInput | { request_item_id: string },
): ProposalBucketMetaInput => ({
  request_item_id: String(row.request_item_id || "").trim(),
  price: "price" in row ? row.price ?? null : null,
  supplier: "supplier" in row ? row.supplier ?? null : null,
  note: "note" in row ? row.note ?? null : null,
});

async function loadCounterpartyBinding(): Promise<CounterpartyBinding> {
  const supplierIdByName = new Map<string, string>();
  const contractorIdByName = new Map<string, string>();

  try {
    const q = await supabase.from("suppliers").select(SUPPLIERS_BINDING_SELECT);
    if (!q.error && Array.isArray(q.data)) {
      for (const row of q.data as SupplierBindingRow[]) {
        const id = String(row.id ?? "").trim();
        const name = normCounterpartyKey(String(row.name ?? ""));
        if (id && name && !supplierIdByName.has(name)) supplierIdByName.set(name, id);
      }
    }
  } catch (error: unknown) {
    if (__DEV__) console.warn("[catalog_api.createProposalsBySupplier] suppliers binding load:", (error as Error)?.message ?? error);
  }

  try {
    const q = await supabase.from("contractors").select(CONTRACTORS_BINDING_SELECT);
    if (!q.error && Array.isArray(q.data)) {
      for (const row of q.data as ContractorBindingRow[]) {
        const id = String(row.id ?? "").trim();
        const name = normCounterpartyKey(String(row.company_name ?? ""));
        if (id && name && !contractorIdByName.has(name)) contractorIdByName.set(name, id);
      }
    }
  } catch (error: unknown) {
    if (__DEV__) console.warn("[catalog_api.createProposalsBySupplier] contractors binding load:", (error as Error)?.message ?? error);
  }

  return { supplierIdByName, contractorIdByName };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function resolveProposalCreationPreconditions(
  allItemIds: string[],
  opts: CreateProposalsOptions,
  runtime: ProposalCreationRuntime,
): Promise<ProposalCreationPreconditionsResolved> {
  const approvedItemIds = new Set<string>();
  const itemInfoById = new Map<string, RequestItemForProposal>();
  const counterpartyBindingPromise = loadCounterpartyBinding();
  const proposalItemsBindingColsPromise = loadProposalItemsBindingColumns();

  if (allItemIds.length) {
    try {
      runtime.dbCalls += 1;
      const itemRows = parseRequestItemsForProposalRows(await loadRequestItemsForProposal(allItemIds));
      if (itemRows.length) {
        const reqIds = Array.from(new Set(itemRows.map((row) => norm(row.request_id)).filter(Boolean)));
        const qReq = reqIds.length
          ? (runtime.dbCalls += 1, await supabase.from("requests").select("id,status").in("id", reqIds))
          : { data: [] as RequestStatusLiteRow[], error: null };

        const reqStatusById = new Map<string, string>();
        parseRequestStatusLiteRows(qReq.data).forEach((row) => {
          reqStatusById.set(String(row.id || "").trim(), String(row.status || ""));
        });

        const gateDebugRows: {
          requestItemId: string;
          requestId: string;
          itemStatus: string;
          requestStatus: string;
          cancelledSource: boolean;
          approvedByItemStatus: boolean;
          approvedByRequestStatus: boolean;
          rejectedForRework: boolean;
        }[] = [];

        itemRows.forEach((row) => {
          const itemId = String(row.id || "").trim();
          const reqId = String(row.request_id || "").trim();
          if (!itemId || !reqId) return;
          const qty = Number(row.qty ?? 0);
          const itemStatus = String(row.status ?? "");
          const cancelledSource = isCancelledRequestItemSource(row);
          const requestStatus = reqStatusById.get(reqId) || "";
          const approvedByItemStatus = isRequestApprovedForProcurement(itemStatus);
          const approvedByRequestStatus = isRequestApprovedForProcurement(requestStatus);
          const rejectedForRework = isRejectedForBuyerRework(row);
          let kind = parseProposalKind(row.kind ?? null);
          if (kind === "unknown") {
            const legacyKindRaw = row.item_type ?? row.procurement_type ?? null;
            kind = parseProposalKind(legacyKindRaw);
            if (kind !== "unknown") {
              if (__DEV__) console.warn(
                `[catalog_api.createProposalsBySupplier] request_items.kind missing, legacy type used for item ${itemId}`,
              );
            }
          }
          itemInfoById.set(itemId, {
            id: itemId,
            request_id: reqId,
            qty: Number.isFinite(qty) && qty > 0 ? qty : 0,
            kind,
            is_rejected_for_rework: rejectedForRework,
          });
          gateDebugRows.push({
            requestItemId: itemId,
            requestId: reqId,
            itemStatus,
            requestStatus,
            cancelledSource,
            approvedByItemStatus,
            approvedByRequestStatus,
            rejectedForRework,
          });
          if (cancelledSource) {
            return;
          }
          if (qReq.error) {
            approvedItemIds.add(itemId);
          } else if (approvedByRequestStatus || approvedByItemStatus || rejectedForRework) {
            approvedItemIds.add(itemId);
          }
        });

        if (__DEV__) console.info("[catalog_api.createProposalsBySupplier] approval gate", {
          allItemIds,
          approvedItemIds: Array.from(approvedItemIds),
          rows: gateDebugRows,
        });
      }
    } catch (error: unknown) {
      if (__DEV__) console.warn("[catalog_api.createProposalsBySupplier] request approval gate:", (error as Error)?.message ?? error);
      allItemIds.forEach((id) => approvedItemIds.add(id));
    }
  }

  const [counterpartyBinding, proposalItemsBindingCols] = await Promise.all([
    counterpartyBindingPromise,
    proposalItemsBindingColsPromise,
  ]);

  return {
    shouldSubmit: opts.submit !== false,
    statusAfter: opts.requestItemStatus ?? null,
    itemInfoById,
    approvedItemIds,
    counterpartyBinding,
    proposalItemsBindingCols,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function prepareProposalCreationBucket(
  bucket: ProposalBucketInput,
  bucketIndex: number,
  preconditions: ProposalCreationPreconditionsResolved,
  seenRequestItemIdsInRun: Set<string>,
): ProposalCreationBucketPrepared | null {
  const idsRaw = (bucket?.request_item_ids ?? [])
    .map((id) => String(id || "").trim())
    .filter((id) => !!id && preconditions.approvedItemIds.has(id));
  const filteredOutIds = (bucket?.request_item_ids ?? [])
    .map((id) => String(id || "").trim())
    .filter((id) => !!id && !preconditions.approvedItemIds.has(id));
  if (filteredOutIds.length) {
    if (__DEV__) console.warn("[catalog_api.createProposalsBySupplier] bucket filtered ids", {
      bucketIndex,
      supplier: bucket?.supplier ?? null,
      filteredOutIds,
    });
  }

  const request_item_ids: string[] = [];
  for (const itemId of idsRaw) {
    if (seenRequestItemIdsInRun.has(itemId)) {
      throw new Error(`duplicate request_item_id in payload: ${itemId}`);
    }
    seenRequestItemIdsInRun.add(itemId);
    request_item_ids.push(itemId);
  }
  if (!request_item_ids.length) return null;

  const supplierDisplay = bucket?.supplier ? norm(bucket.supplier) : "";
  const supplierLabel = supplierDisplay || SUPPLIER_NONE_LABEL;
  const supplierDb: string | null = supplierDisplay ? supplierDisplay : null;
  const idsSet = new Set(request_item_ids);
  const validatedByItemId = new Map<string, ProposalCreationBindingResolved>();
  const metaRows: ProposalSnapshotMetaRow[] = (
    bucket.meta ?? request_item_ids.map((request_item_id) => ({ request_item_id }))
  )
    .map(parseProposalBucketMetaInput)
    .filter((row) => idsSet.has(row.request_item_id))
    .map((row) => {
      const request_item_id = row.request_item_id;
      const itemInfo = preconditions.itemInfoById.get(request_item_id);
      const qty = Number(itemInfo?.qty ?? 0);
      const price = parsePositive(row.price ?? null);
      const kind = itemInfo?.kind ?? "unknown";
      const counterpartyName = norm(row.supplier ?? supplierDb ?? "");
      const normCp = normCounterpartyKey(counterpartyName);

      let supplier_id: string | null = null;
      let contractor_id: string | null = null;
      if (kind === "material") {
        supplier_id = preconditions.counterpartyBinding.supplierIdByName.get(normCp) ?? null;
        if (!supplier_id && preconditions.proposalItemsBindingCols.supplier_id) {
          throw new Error(`material item requires valid supplier_id binding: ${request_item_id}`);
        }
      } else if (kind === "service" || kind === "work") {
        contractor_id = preconditions.counterpartyBinding.contractorIdByName.get(normCp) ?? null;
        if (!contractor_id && preconditions.proposalItemsBindingCols.contractor_id) {
          throw new Error(`${kind} item requires valid contractor_id binding: ${request_item_id}`);
        }
      } else {
        supplier_id = preconditions.counterpartyBinding.supplierIdByName.get(normCp) ?? null;
        contractor_id = preconditions.counterpartyBinding.contractorIdByName.get(normCp) ?? null;
        if (
          !supplier_id &&
          !contractor_id &&
          preconditions.proposalItemsBindingCols.supplier_id &&
          preconditions.proposalItemsBindingCols.contractor_id
        ) {
          throw new Error(`item requires supplier_id or contractor_id binding: ${request_item_id}`);
        }
      }

      if (!(qty > 0)) throw new Error(`proposal item qty must be > 0: ${request_item_id}`);
      if (!(price > 0)) throw new Error(`proposal item price must be > 0: ${request_item_id}`);

      const validated: ProposalCreationBindingResolved = {
        request_item_id,
        price,
        qty,
        supplier: counterpartyName || null,
        supplier_id,
        contractor_id,
        kind,
      };
      validatedByItemId.set(request_item_id, validated);

      return {
        request_item_id,
        price: String(price),
        supplier: counterpartyName || null,
        note: row.note ?? null,
      };
    });

  if (validatedByItemId.size !== request_item_ids.length) {
    throw new Error("proposal validation failed: missing canonical item bindings");
  }

  return {
    bucketIndex,
    supplierLabel,
    supplierDisplay,
    supplierDb,
    request_item_ids,
    metaRows,
    validatedBindings: Array.from(validatedByItemId.values()),
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function createProposalHeadStage(
  prepared: ProposalCreationBucketPrepared,
  preconditions: ProposalCreationPreconditionsResolved,
  opts: CreateProposalsOptions,
  runtime: ProposalCreationRuntime,
): Promise<ProposalCreationHeadCreated> {
  runtime.dbCalls += 1;
  const created = await rpcProposalCreateFull();
  const proposal_id = String(created.id);
  const createdHead = mapProposalHeadDisplay(created);
  let proposal_no = createdHead.proposalNo;
  let display_no = createdHead.displayNo;

  const requestIdsForBucket = Array.from(
    new Set(
      prepared.request_item_ids
        .map((requestItemId) =>
          String(preconditions.itemInfoById.get(requestItemId)?.request_id ?? "").trim(),
        )
        .filter(Boolean),
    ),
  );
  const headerPatch: ProposalsUpdate = {};
  if (opts.buyerFio) headerPatch.buyer_fio = opts.buyerFio;
  if (prepared.supplierDisplay) headerPatch.supplier = prepared.supplierDisplay;
  if (requestIdsForBucket.length === 1) {
    headerPatch.request_id = requestIdsForBucket[0];
  } else if (requestIdsForBucket.length > 1) {
    if (__DEV__) console.warn(
      "[catalog_api.createProposalsBySupplier] proposal head has multiple request_ids; request_id patch skipped",
      {
        proposalId: proposal_id,
        requestIdsForBucket,
        requestItemIds: prepared.request_item_ids,
      },
    );
  }
  if (Object.keys(headerPatch).length) {
    runtime.dbCalls += 1;
    await supabase.from("proposals").update(headerPatch).eq("id", proposal_id);
  }

  const requestIdAfterCreate = createdHead.requestId;
  if (!display_no && proposal_no) {
    runtime.dbCalls += 1;
    const patch: ProposalsUpdate = { display_no: proposal_no };
    if (!requestIdAfterCreate && requestIdsForBucket.length === 1) {
      patch.request_id = requestIdsForBucket[0];
    }
    const displayPatch = await supabase.from("proposals").update(patch).eq("id", proposal_id);
    if (displayPatch.error) {
      if (__DEV__) console.warn(
        "[catalog_api.createProposalsBySupplier] proposal metadata patch:",
        displayPatch.error.message,
      );
    } else {
      display_no = proposal_no;
    }
  }

  return { proposal_id, proposal_no, display_no };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function linkProposalItemsStage(
  proposalId: string,
  requestItemIds: string[],
  runtime: ProposalCreationRuntime,
): Promise<string[]> {
  let added = 0;
  try {
    runtime.dbCalls += 1;
    added = await rpcProposalAddItems(proposalId, requestItemIds);
  } catch (error: unknown) {
    if (__DEV__) console.warn("[catalog_api.createProposalsBySupplier] proposalAddItems:", (error as Error)?.message ?? error);
  }

  if (!added) {
    await ensureActiveProposalRequestItemsIntegrity(supabase, proposalId, requestItemIds, {
      screen: "buyer",
      surface: "catalog_proposal_link_items_fallback",
      sourceKind: "mutation:proposal_items_fallback",
    });
    for (const pack of chunk(requestItemIds, 50)) {
      const rows: ProposalItemsInsert[] = pack.map((request_item_id) => ({
        proposal_id: proposalId,
        proposal_id_text: proposalId,
        request_item_id,
      }));
      runtime.dbCalls += 1;
      const { error } = await supabase.from("proposal_items").insert(rows);
      if (error) throw error;
    }
  }

  return requestItemIds;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function completeProposalCreationStage(
  proposalId: string,
  prepared: ProposalCreationBucketPrepared,
  preconditions: ProposalCreationPreconditionsResolved,
  runtime: ProposalCreationRuntime,
): Promise<ProposalCreationCompletionResult> {
  await ensureActiveProposalRequestItemsIntegrity(supabase, proposalId, prepared.request_item_ids, {
    screen: "buyer",
    surface: "catalog_proposal_complete_bindings",
    sourceKind: "mutation:proposal_items_bindings",
  });

  if (prepared.metaRows.length) {
    try {
      runtime.dbCalls += 1;
      await rpcProposalSnapshotItems(proposalId, prepared.metaRows);
    } catch (error: unknown) {
      if (__DEV__) console.warn("[catalog_api.createProposalsBySupplier] proposalSnapshotItems:", (error as Error)?.message ?? error);
    }
  }

  let bindingColumnsWarned = false;
  const rowsForUpdate = prepared.validatedBindings;
  const upsertRows: ProposalItemsCompatInsertUpsert[] = rowsForUpdate.map((row) => {
    const payload: ProposalItemsCompatInsertUpsert = {
      proposal_id: proposalId,
      proposal_id_text: proposalId,
      request_item_id: row.request_item_id,
      qty: row.qty,
      price: row.price,
      supplier: row.supplier,
    };
    if (preconditions.proposalItemsBindingCols.supplier_id) payload.supplier_id = row.supplier_id;
    if (preconditions.proposalItemsBindingCols.contractor_id) payload.contractor_id = row.contractor_id;
    return payload;
  });

  if (runtime.proposalItemsBulkUpsertSupported && upsertRows.length) {
    try {
      for (const pack of chunk(upsertRows, 100)) {
        runtime.dbCalls += 1;
        const { error } = await supabase
          .from("proposal_items")
          .upsert(pack, { onConflict: "proposal_id,request_item_id" });
        if (error) throw error;
      }
      proposalItemsBulkUpsertCapabilityCache = true;
    } catch (error: unknown) {
      const msg = String((error as Error)?.message ?? error ?? "");
      if (msg.toLowerCase().includes("no unique") || msg.toLowerCase().includes("on conflict")) {
        runtime.proposalItemsBulkUpsertSupported = false;
        proposalItemsBulkUpsertCapabilityCache = false;
      }
      if (__DEV__) console.warn(
        "[catalog_api.createProposalsBySupplier] proposal_items bulk upsert failed; fallback to row updates:",
        (error as Error)?.message ?? error,
      );
    }
  }

  if (!runtime.proposalItemsBulkUpsertSupported) {
    for (const pack of chunk(rowsForUpdate, 20)) {
      await Promise.all(
        pack.map(async (row) => {
          try {
            const payload: ProposalItemsCompatUpdate = {
              qty: row.qty,
              price: row.price,
              supplier: row.supplier,
            };
            if (preconditions.proposalItemsBindingCols.supplier_id) {
              payload.supplier_id = row.supplier_id;
            }
            if (preconditions.proposalItemsBindingCols.contractor_id) {
              payload.contractor_id = row.contractor_id;
            }

            const requiresSupplierBinding = row.kind === "material" && !!row.supplier_id;
            const requiresContractorBinding =
              (row.kind === "service" || row.kind === "work") && !!row.contractor_id;
            if (
              !bindingColumnsWarned &&
              ((requiresSupplierBinding && !preconditions.proposalItemsBindingCols.supplier_id) ||
                (requiresContractorBinding &&
                  !preconditions.proposalItemsBindingCols.contractor_id))
            ) {
              bindingColumnsWarned = true;
              if (__DEV__) console.warn(
                "[catalog_api.createProposalsBySupplier] proposal_items binding columns are missing in schema; storing text binding only",
              );
            }

            runtime.dbCalls += 1;
            const { error } = await supabase
              .from("proposal_items")
              .update(payload)
              .eq("proposal_id", proposalId)
              .eq("request_item_id", row.request_item_id);
            if (error) {
              if (__DEV__) console.warn(
                "[catalog_api.createProposalsBySupplier] proposal_items canonical binding update:",
                error.message,
              );
            }
          } catch (error: unknown) {
            if (__DEV__) console.warn(
              "[catalog_api.createProposalsBySupplier] proposal_items canonical binding update ex:",
              (error as Error)?.message ?? error,
            );
          }
        }),
      );
    }
  }

  let submitVerification: ProposalSubmitVerificationResult | null = null;
  if (preconditions.shouldSubmit) {
    runtime.dbCalls += 1;
    submitVerification = await rpcProposalSubmit(proposalId);
  }

  return {
    resolved_bindings: rowsForUpdate,
    submitVerification,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function syncProposalRequestItemStatusStage(
  prepared: ProposalCreationBucketPrepared,
  preconditions: ProposalCreationPreconditionsResolved,
  runtime: ProposalCreationRuntime,
): Promise<boolean> {
  if (!preconditions.statusAfter) return false;
  try {
    runtime.dbCalls += 1;
    const args: RequestItemsSetStatusArgs = {
      p_request_item_ids: prepared.request_item_ids,
      p_status: preconditions.statusAfter,
    };
    const { error } = await supabase.rpc("request_items_set_status", args);
    if (error) throw error;
    return true;
  } catch (error) {
    recordCatalogWarning({
      screen: "request",
      event: "request_items_set_status_rpc_failed",
      operation: "syncProposalRequestItemStatusStage.rpc",
      error,
      mode: "fallback",
      extra: {
        requestItemCount: prepared.request_item_ids.length,
        statusAfter: preconditions.statusAfter,
      },
    });
    runtime.dbCalls += 1;
    await supabase
      .from("request_items")
      .update({ status: preconditions.statusAfter } satisfies RequestItemsUpdate)
      .in("id", prepared.request_item_ids);
    return true;
  }
}

const parseStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map((entry) => String(entry ?? "").trim())
        .filter(Boolean)
    : [];

const parseInteger = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};

const parseBoolean = (value: unknown): boolean => value === true;

const buildProposalSubmitMutationId = (
  buckets: ProposalBucketInput[],
  opts: CreateProposalsOptions,
): string => {
  const explicit = norm(opts.clientMutationId ?? null);
  if (explicit) return explicit;

  const cryptoLike =
    typeof globalThis !== "undefined"
      ? (globalThis as typeof globalThis & {
          crypto?: {
            randomUUID?: () => string;
            getRandomValues?: (array: Uint8Array) => Uint8Array;
          };
        }).crypto
      : undefined;

  if (typeof cryptoLike?.randomUUID === "function") {
    return cryptoLike.randomUUID();
  }

  const requestId = norm(opts.requestId ?? null) || "request";
  const bucketFingerprint = buckets
    .map((bucket) =>
      (bucket.request_item_ids ?? [])
        .map((requestItemId) => String(requestItemId ?? "").trim())
        .filter(Boolean)
        .sort()
        .join(","),
    )
    .join("|");
  return `proposal-submit:${requestId}:${bucketFingerprint}:${Date.now().toString(36)}`;
};

const bucketSupplierLabel = (bucket: ProposalBucketInput | undefined): string => {
  const supplier = norm(bucket?.supplier ?? null);
  return supplier || SUPPLIER_NONE_LABEL;
};

const isProposalRequestSupplierConflict = (error: unknown): boolean => {
  const source = asLooseRecord(error);
  const code = norm(source.code == null ? null : String(source.code));
  const status = Number(source.status ?? source.statusCode ?? 0);
  const text = [
    source.message,
    source.details,
    source.hint,
    source.error,
    source.code,
  ]
    .map((value) => String(value ?? "").toLowerCase())
    .join(" ");

  return (
    text.includes("proposals_uniq_req_supplier") ||
    (code === "23505" && text.includes("request_id") && text.includes("supplier")) ||
    (status === 409 && text.includes("duplicate") && text.includes("supplier"))
  );
};

const uniqueBucketRequestItemIds = (bucket: ProposalBucketInput | undefined): string[] =>
  Array.from(
    new Set(
      (bucket?.request_item_ids ?? [])
        .map((requestItemId) => String(requestItemId ?? "").trim())
        .filter(Boolean),
    ),
  );

async function loadExistingProposalItems(proposalId: string, requestItemIds: string[]): Promise<Set<string>> {
  if (!requestItemIds.length) return new Set();

  const { data, error } = await supabase
    .from("proposal_items")
    .select("request_item_id")
    .eq("proposal_id", proposalId)
    .in("request_item_id", requestItemIds);

  if (error) throw error;
  return new Set(
    (Array.isArray(data) ? (data as ExistingProposalItemRecoveryRow[]) : [])
      .map((row) => String(row?.request_item_id ?? "").trim())
      .filter(Boolean),
  );
}

async function findExistingProposalForBucket(
  requestId: string,
  bucket: ProposalBucketInput,
): Promise<ExistingProposalRecoveryRow | null> {
  const requestItemIds = uniqueBucketRequestItemIds(bucket);
  const supplier = norm(bucket?.supplier ?? null);

  let query = supabase
    .from("proposals")
    .select("id,proposal_no,display_no,status,submitted_at,sent_to_accountant_at,supplier")
    .eq("request_id", requestId);

  query = supplier ? query.eq("supplier", supplier) : query.is("supplier", null);
  const { data, error } = await query.order("updated_at", { ascending: false }).limit(10);
  if (error) throw error;

  const rows = Array.isArray(data) ? (data as ExistingProposalRecoveryRow[]) : [];
  for (const row of rows) {
    const proposalId = norm(row?.id ?? null);
    if (!proposalId) continue;
    const existingItemIds = await loadExistingProposalItems(proposalId, requestItemIds);
    if (requestItemIds.every((requestItemId) => existingItemIds.has(requestItemId))) {
      return row;
    }
  }

  return null;
}

async function recoverExistingProposalSubmitResult(
  buckets: ProposalBucketInput[],
  opts: CreateProposalsOptions,
  clientMutationId: string,
): Promise<CreateProposalsResult> {
  const requestId = norm(opts.requestId ?? null);
  if (!requestId) {
    throw new Error("rpc_proposal_submit_v3 duplicate proposal recovery requires requestId");
  }

  const proposals: ProposalAtomicSubmitRpcProposalRow[] = [];
  let createdItemCount = 0;

  for (let bucketIndex = 0; bucketIndex < buckets.length; bucketIndex += 1) {
    const bucket = buckets[bucketIndex];
    const requestItemIds = uniqueBucketRequestItemIds(bucket);
    const existing = await findExistingProposalForBucket(requestId, bucket);
    const proposalId = norm(existing?.id ?? null);
    if (!existing || !proposalId) {
      throw new Error("rpc_proposal_submit_v3 duplicate proposal recovery could not find matching proposal");
    }

    const visible = isProposalDirectorVisibleRow({
      status: existing.status ?? null,
      submitted_at: existing.submitted_at ?? null,
      sent_to_accountant_at: existing.sent_to_accountant_at ?? null,
    });
    let rawStatus = existing.status ?? null;
    let submittedAt = existing.submitted_at ?? null;

    if (opts.submit !== false && !visible) {
      await rpcProposalSubmit(proposalId);
      rawStatus = "На утверждении";
      submittedAt = submittedAt || new Date().toISOString();
    }

    createdItemCount += requestItemIds.length;
    proposals.push({
      bucket_index: bucketIndex,
      proposal_id: proposalId,
      proposal_no: norm(existing.display_no ?? null) || norm(existing.proposal_no ?? null) || null,
      supplier: norm(existing.supplier ?? null) || norm(bucket?.supplier ?? null) || null,
      request_item_ids: requestItemIds,
      raw_status: rawStatus,
      submitted_at: submittedAt,
      sent_to_accountant_at: existing.sent_to_accountant_at ?? null,
      submit_source: opts.submit === false ? null : "rpc:proposal_submit_text_v1",
    });
  }

  return mapAtomicProposalSubmitResult(
    {
      status: "ok",
      proposals,
      meta: {
        canonical_path: "rpc:proposal_submit_v3",
        client_mutation_id: clientMutationId,
        request_id: requestId,
        idempotent_replay: true,
        expected_bucket_count: buckets.length,
        expected_item_count: createdItemCount,
        created_proposal_count: proposals.length,
        created_item_count: createdItemCount,
        attachment_continuation_ready: true,
      },
    },
    buckets,
  );
}

function mapAtomicProposalSubmitResult(
  rawResult: ProposalAtomicSubmitRpcResult,
  buckets: ProposalBucketInput[],
): CreateProposalsResult {
  const proposalsRaw = Array.isArray(rawResult?.proposals) ? rawResult.proposals : [];
  const proposals = proposalsRaw.map((proposal) => {
    const bucketIndex = parseInteger(proposal?.bucket_index, -1);
    const sourceBucket = bucketIndex >= 0 ? buckets[bucketIndex] : undefined;
    const supplierText = norm(proposal?.supplier ?? null) || bucketSupplierLabel(sourceBucket);
    const request_item_ids = (() => {
      const fromRpc = parseStringArray(proposal?.request_item_ids);
      if (fromRpc.length) return fromRpc;
      return (sourceBucket?.request_item_ids ?? [])
        .map((requestItemId) => String(requestItemId ?? "").trim())
        .filter(Boolean);
    })();
    const raw_status = norm(proposal?.raw_status ?? null) || null;
    const submitted_at = norm(proposal?.submitted_at ?? null) || null;
    const sent_to_accountant_at = norm(proposal?.sent_to_accountant_at ?? null) || null;
    const status = normalizeProposalStatus(raw_status);
    const visible_to_director = isProposalDirectorVisibleRow({
      status: raw_status,
      submitted_at,
      sent_to_accountant_at,
    });

    return {
      proposal_id: norm(proposal?.proposal_id ?? null),
      proposal_no: norm(proposal?.proposal_no ?? null) || null,
      supplier: supplierText,
      request_item_ids,
      status,
      raw_status,
      submitted: !!submitted_at && status === "submitted",
      submitted_at,
      visible_to_director,
      submit_source: proposal?.submit_source ?? (submitted_at ? "rpc:proposal_submit_text_v1" : null),
    };
  });

  const metaSource = rawResult?.meta ?? null;
  return {
    proposals,
    meta: {
      canonical_path: "rpc:proposal_submit_v3",
      client_mutation_id: norm(metaSource?.client_mutation_id ?? null) || null,
      request_id: norm(metaSource?.request_id ?? null) || null,
      idempotent_replay: parseBoolean(metaSource?.idempotent_replay),
      expected_bucket_count: parseInteger(metaSource?.expected_bucket_count, proposals.length),
      expected_item_count: parseInteger(
        metaSource?.expected_item_count,
        proposals.reduce((sum, proposal) => sum + proposal.request_item_ids.length, 0),
      ),
      created_proposal_count: parseInteger(metaSource?.created_proposal_count, proposals.length),
      created_item_count: parseInteger(
        metaSource?.created_item_count,
        proposals.reduce((sum, proposal) => sum + proposal.request_item_ids.length, 0),
      ),
      attachment_continuation_ready:
        metaSource?.attachment_continuation_ready === false ? false : true,
    },
  };
}

async function runAtomicProposalSubmitRpc(
  buckets: ProposalBucketInput[],
  opts: CreateProposalsOptions,
): Promise<CreateProposalsResult> {
  const args: ProposalAtomicSubmitRpcArgs = {
    p_client_mutation_id: buildProposalSubmitMutationId(buckets, opts),
    p_buckets: buckets,
    p_buyer_fio: norm(opts.buyerFio ?? null) || null,
    p_submit: opts.submit !== false,
    p_request_item_status: norm(opts.requestItemStatus ?? null) || null,
    p_request_id: norm(opts.requestId ?? null) || null,
  };

  const { data, error } = await supabase.rpc("rpc_proposal_submit_v3" as never, args as never);
  if (error) {
    if (isProposalRequestSupplierConflict(error)) {
      return await recoverExistingProposalSubmitResult(buckets, opts, args.p_client_mutation_id);
    }
    throw error;
  }

  const parsed = mapAtomicProposalSubmitResult((data ?? null) as ProposalAtomicSubmitRpcResult, buckets);
  if (!parsed.proposals.length) {
    throw new Error("rpc_proposal_submit_v3 returned empty proposals");
  }
  if (parsed.proposals.some((proposal) => !proposal.proposal_id)) {
    throw new Error("rpc_proposal_submit_v3 returned proposal without proposal_id");
  }

  const expectedBucketCount = parsed.meta?.expected_bucket_count ?? parsed.proposals.length;
  const createdProposalCount = parsed.meta?.created_proposal_count ?? parsed.proposals.length;
  const expectedItemCount =
    parsed.meta?.expected_item_count ??
    parsed.proposals.reduce((sum, proposal) => sum + proposal.request_item_ids.length, 0);
  const createdItemCount =
    parsed.meta?.created_item_count ??
    parsed.proposals.reduce((sum, proposal) => sum + proposal.request_item_ids.length, 0);

  if (createdProposalCount !== expectedBucketCount || parsed.proposals.length !== expectedBucketCount) {
    throw new Error(
      `rpc_proposal_submit_v3 proposal count mismatch: expected ${expectedBucketCount}, got ${createdProposalCount}/${parsed.proposals.length}`,
    );
  }
  if (createdItemCount !== expectedItemCount) {
    throw new Error(
      `rpc_proposal_submit_v3 item count mismatch: expected ${expectedItemCount}, got ${createdItemCount}`,
    );
  }

  return parsed;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function mapProposalCreationMutationResult(
  result: ProposalCreationMutationResult,
): CreateProposalsResult {
  return {
    proposals: result.proposals.map((proposal) => ({
      proposal_id: proposal.proposal_id,
      proposal_no: proposal.proposal_no,
      supplier: proposal.supplier,
      request_item_ids: proposal.request_item_ids,
      status: proposal.status,
      raw_status: proposal.raw_status,
      submitted: proposal.submitted,
      submitted_at: proposal.submitted_at,
      visible_to_director: proposal.visible_to_director,
      submit_source: proposal.submit_source,
    })),
  };
}

export async function createProposalsBySupplier(
  buckets: ProposalBucketInput[],
  opts: CreateProposalsOptions = {},
): Promise<CreateProposalsResult> {
  return await runAtomicProposalSubmitRpc(buckets, opts);
}
