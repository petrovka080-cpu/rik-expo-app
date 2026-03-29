import { supabase } from "../supabaseClient";
import type { Database } from "../database.types";
import { isRequestApprovedForProcurement } from "../requestStatus";
import {
  proposalAddItems as rpcProposalAddItems,
  proposalCreateFull as rpcProposalCreateFull,
  proposalSnapshotItems as rpcProposalSnapshotItems,
  proposalSubmit as rpcProposalSubmit,
} from "../api/proposals";
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
  meta?: Array<{
    request_item_id: string;
    price?: string | null;
    supplier?: string | null;
    note?: string | null;
  }>;
};

export type CreateProposalsOptions = {
  buyerFio?: string | null;
  submit?: boolean;
  requestItemStatus?: string | null;
};

export type CreateProposalsResult = {
  proposals: Array<{
    proposal_id: string;
    proposal_no: string | null;
    supplier: string;
    request_item_ids: string[];
  }>;
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
  submitted: boolean;
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
  submitted: boolean;
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
    console.warn(
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
    console.warn("[catalog_api.createProposalsBySupplier] suppliers binding load:", (error as Error)?.message ?? error);
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
    console.warn("[catalog_api.createProposalsBySupplier] contractors binding load:", (error as Error)?.message ?? error);
  }

  return { supplierIdByName, contractorIdByName };
}

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

        const gateDebugRows: Array<{
          requestItemId: string;
          requestId: string;
          itemStatus: string;
          requestStatus: string;
          approvedByItemStatus: boolean;
          approvedByRequestStatus: boolean;
          rejectedForRework: boolean;
        }> = [];

        itemRows.forEach((row) => {
          const itemId = String(row.id || "").trim();
          const reqId = String(row.request_id || "").trim();
          if (!itemId || !reqId) return;
          const qty = Number(row.qty ?? 0);
          const itemStatus = String(row.status ?? "");
          const requestStatus = reqStatusById.get(reqId) || "";
          const approvedByItemStatus = isRequestApprovedForProcurement(itemStatus);
          const approvedByRequestStatus = isRequestApprovedForProcurement(requestStatus);
          const rejectedForRework = isRejectedForBuyerRework(row);
          let kind = parseProposalKind(row.kind ?? null);
          if (kind === "unknown") {
            const legacyKindRaw = row.item_type ?? row.procurement_type ?? null;
            kind = parseProposalKind(legacyKindRaw);
            if (kind !== "unknown") {
              console.warn(
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
            approvedByItemStatus,
            approvedByRequestStatus,
            rejectedForRework,
          });
          if (qReq.error) {
            approvedItemIds.add(itemId);
          } else if (approvedByRequestStatus || approvedByItemStatus || rejectedForRework) {
            approvedItemIds.add(itemId);
          }
        });

        console.info("[catalog_api.createProposalsBySupplier] approval gate", {
          allItemIds,
          approvedItemIds: Array.from(approvedItemIds),
          rows: gateDebugRows,
        });
      }
    } catch (error: unknown) {
      console.warn("[catalog_api.createProposalsBySupplier] request approval gate:", (error as Error)?.message ?? error);
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
    console.warn("[catalog_api.createProposalsBySupplier] bucket filtered ids", {
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
    console.warn(
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
      console.warn(
        "[catalog_api.createProposalsBySupplier] proposal metadata patch:",
        displayPatch.error.message,
      );
    } else {
      display_no = proposal_no;
    }
  }

  return { proposal_id, proposal_no, display_no };
}

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
    console.warn("[catalog_api.createProposalsBySupplier] proposalAddItems:", (error as Error)?.message ?? error);
  }

  if (!added) {
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

async function completeProposalCreationStage(
  proposalId: string,
  prepared: ProposalCreationBucketPrepared,
  preconditions: ProposalCreationPreconditionsResolved,
  runtime: ProposalCreationRuntime,
): Promise<ProposalCreationCompletionResult> {
  if (prepared.metaRows.length) {
    try {
      runtime.dbCalls += 1;
      await rpcProposalSnapshotItems(proposalId, prepared.metaRows);
    } catch (error: unknown) {
      console.warn("[catalog_api.createProposalsBySupplier] proposalSnapshotItems:", (error as Error)?.message ?? error);
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
      console.warn(
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
              console.warn(
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
              console.warn(
                "[catalog_api.createProposalsBySupplier] proposal_items canonical binding update:",
                error.message,
              );
            }
          } catch (error: unknown) {
            console.warn(
              "[catalog_api.createProposalsBySupplier] proposal_items canonical binding update ex:",
              (error as Error)?.message ?? error,
            );
          }
        }),
      );
    }
  }

  let submitted = false;
  if (preconditions.shouldSubmit) {
    try {
      runtime.dbCalls += 1;
      await rpcProposalSubmit(proposalId);
      submitted = true;
    } catch (error: unknown) {
      console.warn("[catalog_api.createProposalsBySupplier] proposalSubmit:", (error as Error)?.message ?? error);
    }
  }

  return {
    resolved_bindings: rowsForUpdate,
    submitted,
  };
}

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

function mapProposalCreationMutationResult(
  result: ProposalCreationMutationResult,
): CreateProposalsResult {
  return {
    proposals: result.proposals.map((proposal) => ({
      proposal_id: proposal.proposal_id,
      proposal_no: proposal.proposal_no,
      supplier: proposal.supplier,
      request_item_ids: proposal.request_item_ids,
    })),
  };
}

export async function createProposalsBySupplier(
  buckets: ProposalBucketInput[],
  opts: CreateProposalsOptions = {},
): Promise<CreateProposalsResult> {
  const nowMs = () =>
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  const perfStartedAt = nowMs();
  const perf = {
    preparePayload: 0,
    groupBuckets: 0,
    createProposalHeads: 0,
    insertProposalItems: 0,
    updateRequestItems: 0,
    linkBindings: 0,
    fetchAfterWrite: 0,
  };
  const runtime: ProposalCreationRuntime = {
    dbCalls: 0,
    proposalItemsBulkUpsertSupported: proposalItemsBulkUpsertCapabilityCache !== false,
  };
  const bucketPerf: Array<{
    bucketIndex: number;
    itemCount: number;
    dbCalls: number;
    createProposalHeadsMs: number;
    fetchAfterWriteMs: number;
    insertProposalItemsMs: number;
    linkBindingsMs: number;
    updateRequestItemsMs: number;
  }> = [];

  const mutationResult: ProposalCreationMutationResult = { proposals: [] };
  const seenRequestItemIdsInRun = new Set<string>();

  const groupBucketsStartedAt = nowMs();
  const allItemIds = Array.from(
    new Set(
      (buckets || [])
        .flatMap((bucket) => bucket?.request_item_ids ?? [])
        .map((id) => String(id || "").trim())
        .filter(Boolean),
    ),
  );
  perf.groupBuckets = nowMs() - groupBucketsStartedAt;

  const preparePayloadStartedAt = nowMs();
  const preconditions = await resolveProposalCreationPreconditions(allItemIds, opts, runtime);
  perf.preparePayload = nowMs() - preparePayloadStartedAt;

  for (const [bucketIndex, bucket] of (buckets || []).entries()) {
    const bucketDbCallsStart = runtime.dbCalls;
    let bucketCreateProposalHeadsMs = 0;
    let bucketFetchAfterWriteMs = 0;
    let bucketInsertProposalItemsMs = 0;
    let bucketLinkBindingsMs = 0;
    let bucketUpdateRequestItemsMs = 0;
    const prepared = prepareProposalCreationBucket(
      bucket,
      bucketIndex,
      preconditions,
      seenRequestItemIdsInRun,
    );
    if (!prepared) continue;
    let createdHead: ProposalCreationHeadCreated;

    try {
      const createHeadStartedAt = nowMs();
      createdHead = await createProposalHeadStage(prepared, preconditions, opts, runtime);
      const createMs = nowMs() - createHeadStartedAt;
      bucketCreateProposalHeadsMs += createMs;
      perf.createProposalHeads += createMs;
    } catch (error: unknown) {
      console.warn("[catalog_api.createProposalsBySupplier] proposalCreate:", (error as Error)?.message ?? error);
      throw error;
    }

    const insertProposalItemsStartedAt = nowMs();
    const linked_request_item_ids = await linkProposalItemsStage(
      createdHead.proposal_id,
      prepared.request_item_ids,
      runtime,
    );
    const insertMs = nowMs() - insertProposalItemsStartedAt;
    bucketInsertProposalItemsMs += insertMs;
    perf.insertProposalItems += insertMs;

    const completionStartedAt = nowMs();
    const completion = await completeProposalCreationStage(
      createdHead.proposal_id,
      prepared,
      preconditions,
      runtime,
    );
    const completionMs = nowMs() - completionStartedAt;
    bucketLinkBindingsMs += completionMs;
    perf.linkBindings += completionMs;

    const updateRequestItemsStartedAt = nowMs();
    const request_item_status_synced = await syncProposalRequestItemStatusStage(
      prepared,
      preconditions,
      runtime,
    );
    const updateMs = nowMs() - updateRequestItemsStartedAt;
    bucketUpdateRequestItemsMs += updateMs;
    perf.updateRequestItems += updateMs;

    bucketPerf.push({
      bucketIndex,
      itemCount: prepared.request_item_ids.length,
      dbCalls: runtime.dbCalls - bucketDbCallsStart,
      createProposalHeadsMs: Number(bucketCreateProposalHeadsMs.toFixed(1)),
      fetchAfterWriteMs: Number(bucketFetchAfterWriteMs.toFixed(1)),
      insertProposalItemsMs: Number(bucketInsertProposalItemsMs.toFixed(1)),
      linkBindingsMs: Number(bucketLinkBindingsMs.toFixed(1)),
      updateRequestItemsMs: Number(bucketUpdateRequestItemsMs.toFixed(1)),
    });

    mutationResult.proposals.push({
      bucketIndex,
      proposal_id: createdHead.proposal_id,
      proposal_no: createdHead.proposal_no,
      display_no: createdHead.display_no,
      supplier: prepared.supplierLabel,
      request_item_ids: prepared.request_item_ids,
      linked_request_item_ids,
      resolved_bindings: completion.resolved_bindings,
      submitted: completion.submitted,
      request_item_status_synced,
    });
  }

  const totalCreateMs = nowMs() - perfStartedAt;
  console.log("[catalog_api.createProposalsBySupplier][perf]", {
    "preparePayload.ms": Number(perf.preparePayload.toFixed(1)),
    "groupBuckets.ms": Number(perf.groupBuckets.toFixed(1)),
    "createProposalHeads.ms": Number(perf.createProposalHeads.toFixed(1)),
    "insertProposalItems.ms": Number(perf.insertProposalItems.toFixed(1)),
    "updateRequestItems.ms": Number(perf.updateRequestItems.toFixed(1)),
    "linkBindings.ms": Number(perf.linkBindings.toFixed(1)),
    "fetchAfterWrite.ms": Number(perf.fetchAfterWrite.toFixed(1)),
    "totalCreateProposalsBySupplier.ms": Number(totalCreateMs.toFixed(1)),
    buckets: buckets?.length ?? 0,
    proposalsCreated: mutationResult.proposals.length,
    dbCalls: runtime.dbCalls,
    bucketPerf,
  });
  if (!mutationResult.proposals.length) {
    console.warn("[catalog_api.createProposalsBySupplier] no proposals created", {
      allItemIds,
      approvedItemIds: Array.from(preconditions.approvedItemIds),
      bucketCount: buckets?.length ?? 0,
    });
  }

  return mapProposalCreationMutationResult(mutationResult);
}
