// src/lib/catalog_api.ts
import { supabase } from "./supabaseClient";
import type { Database, Tables } from "./database.types";
import { isRequestApprovedForProcurement } from "./requestStatus";
import {
  proposalCreateFull as rpcProposalCreateFull,
  proposalAddItems as rpcProposalAddItems,
  proposalSubmit as rpcProposalSubmit,
  proposalSnapshotItems as rpcProposalSnapshotItems,
} from "./api/proposals";
import { requestCreateDraft as rpcRequestCreateDraft } from "./api/requests";

export {
  ensureRequestSmart,
  requestCreateDraft,
  requestSubmit,
  addRequestItemFromRik,
  clearCachedDraftRequestId,
} from "./api/requests";
export { directorReturnToBuyer } from "./api/director";
export {
  listBuyerInbox,
} from "./api/buyer";
export {
  proposalCreate,
  proposalAddItems,
  proposalSubmit,
  proposalItems,
  proposalSnapshotItems,
  proposalSetItemsMeta,
  listDirectorProposalsPending,
} from "./api/proposals";
export {
  proposalSendToAccountant,
  listAccountantInbox,
  accountantReturnToBuyer,
  accountantAddPayment,
} from "./api/accountant";
export { notifList, notifMarkRead } from "./api/notifications";
export type { BuyerInboxRow, AccountantInboxRow } from "./api/types";

/** ========= CATALOG ========= */
export type CatalogItem = {
  code: string;
  name: string;
  uom?: string | null;
  sector_code?: string | null;
  spec?: string | null;
  kind?: string | null;
  group_code?: string | null;
};

export type CatalogGroup = {
  code: string;
  name: string;
  parent_code?: string | null;
};

export type UomRef = { id?: string; code: string; name: string };

export type IncomingItem = {
  incoming_id: string;
  incoming_item_id: string;
  purchase_item_id: string | null;
  code: string | null;
  name: string | null;
  uom: string | null;
  qty_expected: number;
  qty_received: number;
};

export type RequestHeader = {
  id: string;
  display_no?: string | null;
  status?: string | null;
  created_at?: string | null;
};

const asRequestHeader = (value: unknown): RequestHeader | null => {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = String(row.id ?? "").trim();
  if (!id) return null;
  return {
    id,
    display_no: row.display_no == null ? null : String(row.display_no),
    status: row.status == null ? null : String(row.status),
    created_at: row.created_at == null ? null : String(row.created_at),
  };
};

const asRequestStatusRow = (value: unknown): { id: string; status?: string | null; display_no?: string | null } | null => {
  const header = asRequestHeader(value);
  return header ? header : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

type RequestListMergedRow = Record<string, unknown>;
type RequestItemStatusAggRow = {
  request_id?: unknown;
  status?: unknown;
};

export type RequestItem = {
  id?: string;
  request_id: string;
  line_no?: number | null;
  code?: string | null;
  name?: string | null;
  uom?: string | null;
  qty?: number | null;
  note?: string | null;
};

export type ReqItemRow = {
  id: string;
  request_id: string;
  name_human: string;
  qty: number;
  uom?: string | null;
  status?: string | null;
  supplier_hint?: string | null;
  app_code?: string | null;
  note?: string | null;
  rik_code?: string | null;
  line_no?: number | null;
};

export type ForemanRequestSummary = {
  id: string;
  display_no?: string | null;
  status?: string | null;
  created_at?: string | null;
  need_by?: string | null;
  object_name_ru?: string | null;
  level_name_ru?: string | null;
  system_name_ru?: string | null;
  zone_name_ru?: string | null;
  has_rejected?: boolean | null; // Признак наличия отклоненных позиций по заявке
};

export type RequestDetails = {
  id: string;
  status?: string | null;
  display_no?: string | null;
  year?: number | null;
  seq?: number | null;
  created_at?: string | null;
  need_by?: string | null;
  comment?: string | null;
  foreman_name?: string | null;
  object_type_code?: string | null;
  level_code?: string | null;
  system_code?: string | null;
  zone_code?: string | null;
  object_name_ru?: string | null;
  level_name_ru?: string | null;
  system_name_ru?: string | null;
  zone_name_ru?: string | null;
};

export type Supplier = {
  id: string;
  name: string;
  inn?: string | null;
  bank_account?: string | null;
  specialization?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  contact_name?: string | null;
  notes?: string | null;
};

const SUPPLIERS_TABLE_SELECT =
  "id,name,inn,bank_account,specialization,phone,email,website,address,contact_name,notes";
const SUPPLIERS_COUNTERPARTY_SELECT = "id,name,inn,phone";
const SUPPLIERS_BINDING_SELECT = "id,name";
const SUBCONTRACTS_COUNTERPARTY_SELECT = "id,status,contractor_org,contractor_inn,contractor_phone";
const CONTRACTORS_COUNTERPARTY_SELECT = "id,company_name,phone,inn";
const CONTRACTORS_BINDING_SELECT = "id,company_name";
const CATALOG_SEARCH_FALLBACK_SELECT =
  "rik_code,name_human,uom_code,sector_code,spec,kind,group_code";
const RIK_QUICK_SEARCH_FALLBACK_FIELDS = "rik_code,name_human,uom_code,kind,name_human_ru";
const RIK_QUICK_SEARCH_RPCS: CatalogSearchRpcName[] = ["rik_quick_ru", "rik_quick_search_typed", "rik_quick_search"];

type SupplierTableRow = Pick<
  Database["public"]["Tables"]["suppliers"]["Row"],
  | "id"
  | "name"
  | "inn"
  | "bank_account"
  | "specialization"
  | "phone"
  | "email"
  | "website"
  | "address"
  | "contact_name"
  | "notes"
>;

type SupplierCounterpartyRow = Pick<Database["public"]["Tables"]["suppliers"]["Row"], "id" | "name" | "inn" | "phone">;
type SupplierBindingRow = Pick<Database["public"]["Tables"]["suppliers"]["Row"], "id" | "name">;
type SubcontractCounterpartyRow = Pick<
  Database["public"]["Tables"]["subcontracts"]["Row"],
  "id" | "status" | "contractor_org" | "contractor_inn" | "contractor_phone"
>;
type ContractorCounterpartyRow = Pick<
  Database["public"]["Tables"]["contractors"]["Row"],
  "id" | "company_name" | "phone" | "inn"
>;
type ContractorBindingRow = Pick<Database["public"]["Tables"]["contractors"]["Row"], "id" | "company_name">;
type SuppliersListRpcArgs = { p_search?: string | null };
type SuppliersListRpcRow = {
  id: string | null;
  name: string | null;
  inn?: string | null;
  bank_account?: string | null;
  specialization?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  contact_name?: string | null;
  notes?: string | null;
  comment?: string | null;
};
type CatalogSearchRpcName = "rik_quick_ru" | "rik_quick_search_typed" | "rik_quick_search";
type CatalogSearchRpcArgs = {
  p_q: string;
  p_limit: number;
  p_apps?: string[] | null;
};
type CatalogSearchRpcRow = {
  code?: string | null;
  rik_code?: string | null;
  name?: string | null;
  name_human?: string | null;
  uom?: string | null;
  uom_code?: string | null;
  sector_code?: string | null;
  spec?: string | null;
  kind?: string | null;
  group_code?: string | null;
};
type CatalogSearchFallbackRow = Pick<
  Tables<"rik_items">,
  "rik_code" | "name_human" | "uom_code" | "sector_code" | "spec" | "kind" | "group_code"
>;
type RikQuickSearchRpcRow = {
  code?: string | null;
  rik_code?: string | null;
  name?: string | null;
  name_human?: string | null;
  name_human_ru?: string | null;
  name_ru?: string | null;
  item_name?: string | null;
  uom?: string | null;
  uom_code?: string | null;
  kind?: string | null;
};
type RikQuickSearchFallbackRow = Pick<
  Tables<"rik_items">,
  "rik_code" | "name_human" | "uom_code" | "kind" | "name_human_ru"
>;
type RikQuickSearchItem = {
  rik_code: string;
  name_human: string;
  name_human_ru: string | null;
  uom_code: string | null;
  kind: string | null;
  apps: null;
};
type ProfileContractorCompatRow = Pick<
  Database["public"]["Tables"]["user_profiles"]["Row"],
  "user_id" | "full_name" | "phone" | "is_contractor"
> & {
  company?: string | null;
  company_name?: string | null;
  organization?: string | null;
  org_name?: string | null;
  name?: string | null;
  inn?: string | null;
};

export type UnifiedCounterpartyType =
  | "supplier"
  | "contractor"
  | "supplier_and_contractor"
  | "other_business_counterparty";

export type UnifiedCounterparty = {
  counterparty_id: string;
  display_name: string;
  inn: string | null;
  phone: string | null;
  source_origin: string[];
  counterparty_type: UnifiedCounterpartyType;
  is_active: boolean;
  company_scope: string | null;
};

type RequestsUpdate = Database["public"]["Tables"]["requests"]["Update"];
type RequestItemsUpdate = Database["public"]["Tables"]["request_items"]["Update"];
type ProposalsUpdate = Database["public"]["Tables"]["proposals"]["Update"];
type ProposalItemsInsert = Database["public"]["Tables"]["proposal_items"]["Insert"];
type ProposalItemsUpdate = Database["public"]["Tables"]["proposal_items"]["Update"];
type RequestItemUpdateQtyArgs = Database["public"]["Functions"]["request_item_update_qty"]["Args"];
type RequestItemsSetStatusArgs = Database["public"]["Functions"]["request_items_set_status"]["Args"];
type RequestDisplayRpcArgs = Database["public"]["Functions"]["request_display_no"]["Args"];
type RequestDisplayRpcName = "request_display_no" | "request_display" | "request_label";

type RequestsExtendedMetaUpdate = RequestsUpdate & {
  planned_volume?: number | null;
  qty_plan?: number | null;
  volume?: number | null;
  level_name?: string | null;
  system_name?: string | null;
  zone_name?: string | null;
  contractor_org?: string | null;
  subcontractor_org?: string | null;
  contractor_phone?: string | null;
  subcontractor_phone?: string | null;
};

type ProposalItemsCompatInsertUpsert = ProposalItemsInsert & {
  supplier_id?: string | null;
  contractor_id?: string | null;
};

type ProposalItemsCompatUpdate = ProposalItemsUpdate & {
    supplier_id?: string | null;
    contractor_id?: string | null;
  };

type CatalogDynamicReadSource =
  | "request_display"
  | "vi_requests_display"
  | "vi_requests"
  | "v_requests_display"
  | "v_request_pdf_header"
  | "requests";

type CatalogDynamicReadLegacySource = "vi_requests_display" | "vi_requests";
type CatalogDynamicReadResponse = Promise<{ data: unknown; error: { message?: string } | null }>;

/** ========= helpers ========= */
const norm = (s?: string | null) => String(s ?? "").trim();
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const chunk = <T,>(arr: T[], size: number): T[][] => {
  if (size <= 0) return [arr.slice()];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};
const SUPPLIER_NONE_LABEL = "\u2014 \u0431\u0435\u0437 \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u0430 \u2014";

const sanitizePostgrestOrTerm = (value: string): string =>
  norm(value)
    .replace(/[,%()]/g, " ")
    .replace(/[.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const pickRefName = (ref: any) =>
  norm(ref?.name_ru) ||
  norm(ref?.name_human_ru) ||
  norm(ref?.display_name) ||
  norm(ref?.alias_ru) ||
  norm(ref?.name) ||
  norm(ref?.code) ||
  null;

const pickFirstString = (...values: any[]): string | null => {
  for (const value of values) {
    const s = norm(value);
    if (s) return s;
  }
  return null;
};

const isObjectLike = (val: any): val is Record<string, any> =>
  typeof val === "object" && val !== null;

const parseNumberValue = (...values: any[]): number | null => {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (value != null) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
};

const buildRefShape = (row: any, keys: string[], code?: string | null) => {
  const shape: Record<string, any> = {};
  shape.name_ru = pickFirstString(
    ...keys.map((key) => row?.[`${key}_name_ru`]),
    ...keys.map((key) => row?.[`${key}NameRu`])
  );
  shape.name_human_ru = pickFirstString(
    ...keys.map((key) => row?.[`${key}_name_human_ru`]),
    ...keys.map((key) => row?.[`${key}NameHumanRu`])
  );
  shape.display_name = pickFirstString(
    ...keys.map((key) => row?.[`${key}_display_name`]),
    ...keys.map((key) => row?.[`${key}DisplayName`]),
    ...keys.map((key) => row?.[`${key}_label`]),
    ...keys.map((key) => row?.[`${key}Label`])
  );
  shape.alias_ru = pickFirstString(
    ...keys.map((key) => row?.[`${key}_alias_ru`]),
    ...keys.map((key) => row?.[`${key}AliasRu`])
  );
  shape.name = pickFirstString(
    ...keys.map((key) => row?.[`${key}_name`]),
    ...keys.map((key) => row?.[`${key}Name`]),
    ...keys.map((key) => row?.[key])
  );
  shape.code =
    code ||
    pickFirstString(
      ...keys.map((key) => row?.[`${key}_code`]),
      ...keys.map((key) => row?.[`${key}Code`]),
      ...keys.map((key) => row?.[key])
    );
  return shape;
};

const readRefName = (row: any, keys: string[], code?: string | null): string | null => {
  for (const key of keys) {
    const val = row?.[key];
    if (isObjectLike(val)) return pickRefName(val);
  }
  return pickRefName(buildRefShape(row, keys, code));
};

const mapRequestItemRow = (raw: any, requestId: string): ReqItemRow | null => {
  const rawId = raw?.id ?? raw?.request_item_id ?? null;
  if (!rawId) return null;
  const qtyVal = Number(raw?.qty ?? raw?.quantity ?? raw?.total_qty ?? 0);
  const qty = Number.isFinite(qtyVal) ? qtyVal : 0;
  const lineNo =
    parseNumberValue(
      raw?.line_no,
      raw?.row_no,
      raw?.position_order,
      raw?.rowno,
      raw?.rowNo,
      raw?.positionOrder,
    ) ?? null;

  const nameHuman =
    norm(raw?.name_human_ru) ||
    norm(raw?.name_human) ||
    norm(raw?.name_ru) ||
    norm(raw?.name) ||
    norm(raw?.display_name) ||
    norm(raw?.alias_ru) ||
    norm(raw?.best_name_display) ||
    "";

  return {
    id: String(rawId),
    request_id: String(raw?.request_id ?? requestId),
    name_human: nameHuman || '\u2014',
    qty,
    uom: raw?.uom ?? raw?.uom_code ?? null,
    status: raw?.status ?? null,
    supplier_hint: raw?.supplier_hint ?? raw?.supplier ?? null,
    app_code: raw?.app_code ?? null,
    note: raw?.note ?? raw?.comment ?? null,
    rik_code: raw?.rik_code ?? raw?.code ?? null,
    line_no: lineNo,
  };
};

const mapSupplierRow = (raw: SupplierTableRow | SuppliersListRpcRow): Supplier | null => {
  const id = raw.id;
  const name = norm(raw.name);
  if (!id || !name) return null;
  const legacyComment = "comment" in raw ? raw.comment ?? null : null;
  return {
    id: String(id),
    name,
    inn: raw.inn ?? null,
    bank_account: raw.bank_account ?? null,
    specialization: raw.specialization ?? null,
    phone: raw.phone ?? null,
    email: raw.email ?? null,
    website: raw.website ?? null,
    address: raw.address ?? null,
    contact_name: raw.contact_name ?? null,
    notes: raw.notes ?? legacyComment,
  };
};

const mapSupplierRows = (rows: Array<SupplierTableRow | SuppliersListRpcRow>): Supplier[] =>
  rows
    .map(mapSupplierRow)
    .filter((row): row is Supplier => !!row)
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));

const mapCatalogSearchRow = (raw: CatalogSearchRpcRow | CatalogSearchFallbackRow): CatalogItem | null => {
  const code = norm(raw.rik_code ?? ("code" in raw ? raw.code : null));
  if (!code) return null;
  const fallbackName = "name" in raw ? raw.name : null;
  const fallbackUom = "uom" in raw ? raw.uom : null;
  return {
    code,
    name: norm(raw.name_human ?? fallbackName ?? code) || code,
    uom: raw.uom_code ?? fallbackUom ?? null,
    sector_code: raw.sector_code ?? null,
    spec: raw.spec ?? null,
    kind: raw.kind ?? null,
    group_code: raw.group_code ?? null,
  };
};

const mapCatalogSearchRows = (rows: Array<CatalogSearchRpcRow | CatalogSearchFallbackRow>): CatalogItem[] =>
  rows
    .map(mapCatalogSearchRow)
    .filter((row): row is CatalogItem => !!row);

const runRequestDisplayRpc = async (
  fn: RequestDisplayRpcName,
  args: RequestDisplayRpcArgs,
): Promise<{ data: string | null; error: { message?: string } | null }> => {
  switch (fn) {
    case "request_display_no": {
      const { data, error } = await supabase.rpc("request_display_no", args);
      return { data: typeof data === "string" ? data : data == null ? null : String(data), error };
    }
    case "request_display": {
      const { data, error } = await supabase.rpc("request_display", args);
      return { data: typeof data === "string" ? data : data == null ? null : String(data), error };
    }
    case "request_label": {
      const { data, error } = await supabase.rpc("request_label", args);
      return { data: typeof data === "string" ? data : data == null ? null : String(data), error };
    }
  }
};

const runCatalogSearchRpc = async (
  fn: CatalogSearchRpcName,
  args: CatalogSearchRpcArgs,
): Promise<CatalogSearchRpcRow[] | null> => {
  switch (fn) {
    case "rik_quick_ru": {
      const { data, error } = await supabase.rpc("rik_quick_ru", {
        p_q: args.p_q,
        p_limit: args.p_limit,
      });
      return error || !Array.isArray(data) ? null : (data as CatalogSearchRpcRow[]);
    }
    case "rik_quick_search_typed": {
      const { data, error } = await supabase.rpc("rik_quick_search_typed", {
        p_q: args.p_q,
        p_limit: args.p_limit,
        p_apps: args.p_apps ?? undefined,
      });
      return error || !Array.isArray(data) ? null : (data as CatalogSearchRpcRow[]);
    }
    case "rik_quick_search": {
      const { data, error } = await supabase.rpc("rik_quick_search", {
        p_q: args.p_q,
        p_limit: args.p_limit,
        p_apps: args.p_apps ?? undefined,
      });
      return error || !Array.isArray(data) ? null : (data as CatalogSearchRpcRow[]);
    }
  }
};

const asUnknownRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;

const parseRikQuickSearchRpcRow = (value: unknown): RikQuickSearchRpcRow | null => {
  const row = asUnknownRecord(value);
  if (!row) return null;
  return {
    code: row.code == null ? null : String(row.code),
    rik_code: row.rik_code == null ? null : String(row.rik_code),
    name: row.name == null ? null : String(row.name),
    name_human: row.name_human == null ? null : String(row.name_human),
    name_human_ru: row.name_human_ru == null ? null : String(row.name_human_ru),
    name_ru: row.name_ru == null ? null : String(row.name_ru),
    item_name: row.item_name == null ? null : String(row.item_name),
    uom: row.uom == null ? null : String(row.uom),
    uom_code: row.uom_code == null ? null : String(row.uom_code),
    kind: row.kind == null ? null : String(row.kind),
  };
};

const parseRikQuickSearchFallbackRow = (value: unknown): RikQuickSearchFallbackRow | null => {
  const row = asUnknownRecord(value);
  if (!row) return null;
  return {
    rik_code: row.rik_code == null ? null : String(row.rik_code),
    name_human: row.name_human == null ? null : String(row.name_human),
    uom_code: row.uom_code == null ? null : String(row.uom_code),
    kind: row.kind == null ? null : String(row.kind),
    name_human_ru: row.name_human_ru == null ? null : String(row.name_human_ru),
  };
};

const mapRikQuickSearchRpcRow = (row: RikQuickSearchRpcRow): RikQuickSearchItem | null => {
  const rikCode = norm(row.rik_code ?? row.code);
  if (!rikCode) return null;
  const nameHuman =
    norm(row.name_human ?? row.name ?? row.name_ru ?? row.item_name ?? rikCode) || rikCode;
  return {
    rik_code: rikCode,
    name_human: nameHuman,
    name_human_ru: row.name_human_ru ?? row.name_human ?? row.name_ru ?? null,
    uom_code: row.uom_code ?? row.uom ?? null,
    kind: row.kind ?? null,
    apps: null,
  };
};

const mapRikQuickSearchFallbackRow = (row: RikQuickSearchFallbackRow): RikQuickSearchItem | null => {
  const rikCode = norm(row.rik_code);
  if (!rikCode) return null;
  return {
    rik_code: rikCode,
    name_human: norm(row.name_human ?? rikCode) || rikCode,
    name_human_ru: row.name_human_ru ?? row.name_human ?? null,
    uom_code: row.uom_code ?? null,
    kind: row.kind ?? null,
    apps: null,
  };
};

const mapRikQuickSearchRpcRows = (rows: unknown[]): RikQuickSearchItem[] =>
  rows
    .map((value) => {
      const row = parseRikQuickSearchRpcRow(value);
      if (!row) return null;
      return mapRikQuickSearchRpcRow(row);
    })
    .filter((item): item is RikQuickSearchItem => !!item);

const mapRikQuickSearchFallbackRows = (rows: unknown[]): RikQuickSearchItem[] =>
  rows
    .map((value) => {
      const row = parseRikQuickSearchFallbackRow(value);
      if (!row) return null;
      return mapRikQuickSearchFallbackRow(row);
    })
    .filter((item): item is RikQuickSearchItem => !!item);

const asProfileContractorRows = (rows: unknown): ProfileContractorCompatRow[] => {
  if (!Array.isArray(rows)) return [];
  return rows.filter((row): row is ProfileContractorCompatRow => !!row && typeof row === "object");
};

const normCounterpartyName = (value: unknown): string =>
  String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();

const normInnDigits = (value: unknown): string =>
  String(value ?? "").replace(/\D+/g, "").trim();

const makeCounterpartyKey = (name: string, inn?: string | null): string => {
  const innKey = normInnDigits(inn);
  if (innKey) return `inn:${innKey}`;
  return `name:${normCounterpartyName(name)}`;
};

const pushUnique = <T,>(arr: T[], value: T) => {
  if (!arr.includes(value)) arr.push(value);
};

const detectUnifiedType = (origins: string[]): UnifiedCounterpartyType => {
  const hasSupplier = origins.includes("supplier");
  const hasContractor = origins.includes("subcontract");
  if (hasSupplier && hasContractor) return "supplier_and_contractor";
  if (hasSupplier) return "supplier";
  if (hasContractor) return "contractor";
  return "other_business_counterparty";
};

const readCatalogLegacyView = (
  relation: CatalogDynamicReadLegacySource,
) =>
  (supabase.from.bind(supabase) as (
    name: CatalogDynamicReadLegacySource,
  ) => {
    select(columns: string): {
      eq(column: "id", value: string): {
        maybeSingle(): CatalogDynamicReadResponse;
      };
    };
  })(relation);

const selectCatalogDynamicReadSingle = async (
  relation: CatalogDynamicReadSource,
  columns: string,
  id: string,
): CatalogDynamicReadResponse => {
  switch (relation) {
    case "request_display":
      return await supabase.from("request_display").select(columns).eq("id", id).maybeSingle();
    case "vi_requests_display":
      return await readCatalogLegacyView("vi_requests_display").select(columns).eq("id", id).maybeSingle();
    case "vi_requests":
      return await readCatalogLegacyView("vi_requests").select(columns).eq("id", id).maybeSingle();
    case "v_requests_display":
      return await supabase.from("v_requests_display").select(columns).eq("id", id).maybeSingle();
    case "v_request_pdf_header":
      return await supabase.from("v_request_pdf_header").select(columns).eq("id", id).maybeSingle();
    case "requests":
      return await supabase.from("requests").select(columns).eq("id", id).maybeSingle();
  }
};

type CatalogCompatError = {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
} | null;

const getCompatErrorInfo = (error: CatalogCompatError) => ({
  message: String(error?.message ?? ""),
  code: String(error?.code ?? ""),
  details: error?.details ?? null,
  hint: error?.hint ?? null,
});

export async function listUnifiedCounterparties(search?: string): Promise<UnifiedCounterparty[]> {
  const q = sanitizePostgrestOrTerm(search || "");
  const byKey = new Map<string, UnifiedCounterparty>();

  // A) Existing supplier source.
  try {
    let query = supabase
      .from("suppliers")
      .select(SUPPLIERS_COUNTERPARTY_SELECT)
      .order("name", { ascending: true });
    if (q) query = query.or(`name.ilike.%${q}%,inn.ilike.%${q}%`);
    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      for (const raw of data as SupplierCounterpartyRow[]) {
        const display = norm(raw.name);
        if (!display) continue;
        const inn = norm(raw.inn) || null;
        const phone = norm(raw.phone) || null;
        const key = makeCounterpartyKey(display, inn);
        const prev = byKey.get(key);
        if (!prev) {
          byKey.set(key, {
            counterparty_id: String(raw.id || key),
            display_name: display,
            inn,
            phone,
            source_origin: ["supplier"],
            counterparty_type: "supplier",
            is_active: true,
            company_scope: null,
          });
        } else {
          pushUnique(prev.source_origin, "supplier");
          if (!prev.inn && inn) prev.inn = inn;
          if (!prev.phone && phone) prev.phone = phone;
          prev.counterparty_type = detectUnifiedType(prev.source_origin);
        }
      }
    }
  } catch (e: any) {
    console.warn("[catalog_api.listUnifiedCounterparties] suppliers:", e?.message ?? e);
  }

  // B) Subcontract organizations (non-draft).
  try {
    const { data, error } = await supabase
      .from("subcontracts")
      .select(SUBCONTRACTS_COUNTERPARTY_SELECT)
      .not("status", "eq", "draft");
    if (!error && Array.isArray(data)) {
      for (const raw of data as SubcontractCounterpartyRow[]) {
        const display = norm(raw.contractor_org);
        if (!display) continue;
        const inn = norm(raw.contractor_inn) || null;
        const phone = norm(raw.contractor_phone) || null;
        const key = makeCounterpartyKey(display, inn);
        const prev = byKey.get(key);
        if (!prev) {
          byKey.set(key, {
            counterparty_id: `subcontract:${String(raw.id || key)}`,
            display_name: display,
            inn,
            phone,
            source_origin: ["subcontract"],
            counterparty_type: "contractor",
            is_active: true,
            company_scope: null,
          });
        } else {
          pushUnique(prev.source_origin, "subcontract");
          if (!prev.inn && inn) prev.inn = inn;
          if (!prev.phone && phone) prev.phone = phone;
          prev.counterparty_type = detectUnifiedType(prev.source_origin);
        }
      }
    }
  } catch (e: any) {
    console.warn("[catalog_api.listUnifiedCounterparties] subcontracts:", e?.message ?? e);
  }

  // C) Registered app counterparties.
  try {
    const contractorsQ = await supabase.from("contractors").select(CONTRACTORS_COUNTERPARTY_SELECT);

    const loadProfilesSafe = async () => {
      const plans = [
        { withFilter: true },
        { withFilter: false },
      ] as const;

      for (const plan of plans) {
        try {
          let q = supabase.from("user_profiles").select("*");
          if (plan.withFilter) q = q.eq("is_contractor", true);
          const res = await q.limit(5000);
          if (res.error) continue;

          const rows = asProfileContractorRows(res.data);
          if (plan.withFilter) return rows;
          return rows.filter((r) => Boolean(r.is_contractor));
        } catch { }
      }
      return [] as ProfileContractorCompatRow[];
    };

    const profileRows = await loadProfilesSafe();

    if (!contractorsQ.error && Array.isArray(contractorsQ.data)) {
      for (const raw of contractorsQ.data as ContractorCounterpartyRow[]) {
        const display = norm(raw.company_name);
        if (!display) continue;
        const inn = norm(raw.inn) || null;
        const phone = norm(raw.phone) || null;
        const key = makeCounterpartyKey(display, inn);
        const prev = byKey.get(key);
        if (!prev) {
          byKey.set(key, {
            counterparty_id: `contractor:${String(raw.id || key)}`,
            display_name: display,
            inn,
            phone,
            source_origin: ["registered_company"],
            counterparty_type: "other_business_counterparty",
            is_active: true,
            company_scope: null,
          });
        } else {
          pushUnique(prev.source_origin, "registered_company");
          if (!prev.inn && inn) prev.inn = inn;
          if (!prev.phone && phone) prev.phone = phone;
          prev.counterparty_type = detectUnifiedType(prev.source_origin);
        }
      }
    }

    if (Array.isArray(profileRows)) {
      for (const raw of profileRows) {
        const display = norm(
          raw.company ??
          raw.company_name ??
          raw.organization ??
          raw.org_name ??
          raw.name ??
          raw.full_name,
        );
        if (!display) continue;
        const inn = norm(raw.inn) || null;
        const phone = norm(raw.phone) || null;
        const key = makeCounterpartyKey(display, inn);
        const prev = byKey.get(key);
        if (!prev) {
          byKey.set(key, {
            counterparty_id: `profile:${String(raw.user_id || key)}`,
            display_name: display,
            inn,
            phone,
            source_origin: ["registered_company"],
            counterparty_type: "other_business_counterparty",
            is_active: true,
            company_scope: null,
          });
        } else {
          pushUnique(prev.source_origin, "registered_company");
          if (!prev.inn && inn) prev.inn = inn;
          if (!prev.phone && phone) prev.phone = phone;
          prev.counterparty_type = detectUnifiedType(prev.source_origin);
        }
      }
    }
  } catch (e: any) {
    console.warn("[catalog_api.listUnifiedCounterparties] registered:", e?.message ?? e);
  }

  const rows = Array.from(byKey.values())
    .map((row) => ({
      ...row,
      counterparty_type: detectUnifiedType(row.source_origin),
    }))
    .sort((a, b) => a.display_name.localeCompare(b.display_name, "ru"));

  if (!q) return rows;
  const nq = normCounterpartyName(q);
  return rows.filter(
    (r) =>
      normCounterpartyName(r.display_name).includes(nq) ||
      normInnDigits(r.inn).includes(normInnDigits(nq)),
  );
}

/** ========= SEARCH / CATALOG ========= */
// NOTE: сначала пробуем RPC-поиск, затем мягко падаем на PostgREST fallback.
export async function searchCatalogItems(
  q: string,
  limit = 50,
  apps?: string[]
): Promise<CatalogItem[]> {
  const normQ = norm(q);
  if (!normQ) return [];
  const pQuery = sanitizePostgrestOrTerm(normQ);
  const pLimit = clamp(limit || 50, 1, 200);

  // 1) Try RPCs first
  const rpcArgs: CatalogSearchRpcArgs = {
    p_q: pQuery,
    p_limit: pLimit,
    p_apps: apps ?? null,
  };
  const rpcs: CatalogSearchRpcName[] = ["rik_quick_ru", "rik_quick_search_typed", "rik_quick_search"];
  for (const fn of rpcs) {
    try {
      const data = await runCatalogSearchRpc(fn, rpcArgs);
      if (data && data.length > 0) {
        return mapCatalogSearchRows(data.slice(0, pLimit));
      }
    } catch { }
  }

  // 2) Fallback: Split tokens and search name in rik_items
  const tokens = pQuery.split(/\s+/).filter(t => t.length >= 2);
  let queryBuilder = supabase
    .from("rik_items")
    .select(CATALOG_SEARCH_FALLBACK_SELECT)
    .limit(pLimit);

  if (tokens.length > 0) {
    tokens.forEach(t => {
      queryBuilder = queryBuilder.or(`name_human.ilike.%${t}%,rik_code.ilike.%${t}%`);
    });
  } else {
    queryBuilder = queryBuilder.or(`name_human.ilike.%${pQuery}%,rik_code.ilike.%${pQuery}%`);
  }

  const { data, error } = await queryBuilder.order("rik_code", { ascending: true });
  if (error || !Array.isArray(data)) return [];

  return mapCatalogSearchRows(data as CatalogSearchFallbackRow[]);
}

/** ========= GROUPS ========= */
export async function listCatalogGroups(): Promise<CatalogGroup[]> {
  const { data, error } = await supabase
    .from("catalog_groups_clean")
    .select("code,name,parent_code")
    .order("code", { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return data as CatalogGroup[];
}

/** ========= UOMS ========= */
export async function listUoms(): Promise<UomRef[]> {
  const { data, error } = await supabase
    .from("ref_uoms_clean")
    .select("id,code,name")
    .order("code", { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return data as UomRef[];
}

/** ========= INCOMING ITEMS ========= */
export async function listIncomingItems(incomingId: string): Promise<IncomingItem[]> {
  const id = norm(incomingId);
  if (!id) return [];
  const { data, error } = await supabase
    .from("wh_incoming_items_clean")
    .select(
      "incoming_id,incoming_item_id,purchase_item_id,code,name,uom,qty_expected,qty_received"
    )
    .eq("incoming_id", id)
    .order("incoming_item_id", { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return data as IncomingItem[];
}

/* ====================================================================== */
/*                           D R A F T   /   R E Q                        */
/* ====================================================================== */

const DRAFT_KEY = "foreman_draft_request_id";

// localStorage helper for web, in-memory fallback otherwise
let memDraftId: string | null = null;
const storage = {
  get(): string | null {
    try { if (typeof localStorage !== "undefined") return localStorage.getItem(DRAFT_KEY); } catch { }
    return memDraftId;
  },
  set(v: string) {
    try { if (typeof localStorage !== "undefined") localStorage.setItem(DRAFT_KEY, v); } catch { }
    memDraftId = v;
  },
  clear() {
    try { if (typeof localStorage !== "undefined") localStorage.removeItem(DRAFT_KEY); } catch { }
    memDraftId = null;
  },
};

export function getLocalDraftId(): string | null { return storage.get(); }
export function setLocalDraftId(id: string) { storage.set(id); }
export function clearLocalDraftId() { storage.clear(); }

const draftStatusKeys = new Set(['draft', '\u0447\u0435\u0440\u043d\u043e\u0432\u0438\u043a']);
const isDraftStatusValue = (value?: string | null) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return false;
  return draftStatusKeys.has(normalized);
};

/** Создание или получение черновика заявки */
export async function getOrCreateDraftRequestId(): Promise<string> {
  const cached = getLocalDraftId();
  if (cached) {
    const valid = await isCachedDraftValid(cached);
    if (valid) return cached;
    clearLocalDraftId();
  }

  try {
    const created = await rpcRequestCreateDraft();
    if (created?.id) {
      const id = String(created.id);
      setLocalDraftId(id);
      return id;
    }
  } catch (e) {
    console.warn("[catalog_api.getOrCreateDraftRequestId]", (e as any)?.message ?? e);
    throw e;
  }

  throw new Error("Не удалось создать или получить черновик заявки");
}

async function isCachedDraftValid(id: string): Promise<boolean> {
  const rid = norm(id);
  if (!rid) return false;

  try {
    const { data, error } = await supabase
      .from("requests")
      .select('id,status')
      .eq('id', rid)
      .maybeSingle();
    if (error) throw error;
    const row = asRequestStatusRow(data);
    if (!row?.id) return false;
    return isDraftStatusValue(row.status);
  } catch (e: any) {
    const msg = String(e?.message ?? '').toLowerCase();
    if (!msg.includes('permission denied')) {
      console.warn('[catalog_api.getOrCreateDraftRequestId] draft check:', e?.message ?? e);
    }
    return false;
  }
}

/** Получение шапки заявки из доступных представлений и fallback-таблицы */
export async function getRequestHeader(requestId: string): Promise<RequestHeader | null> {
  const id = norm(requestId);
  if (!id) return null;

  const views = [
    { src: "request_display", cols: "id,display_no,status,created_at" },
    { src: "vi_requests_display", cols: "id,display_no,status,created_at" },
    { src: "vi_requests", cols: "id,display_no,status,created_at" },
    { src: "requests", cols: "id,display_no,status,created_at" },
  ] as const;

  for (const view of views) {
    try {
      const { data, error } = await selectCatalogDynamicReadSingle(view.src, view.cols, id);
      const row = asRequestHeader(data);
      if (!error && row) return row;
    } catch { }
  }

  return { id };
}

export async function fetchRequestDisplayNo(requestId: string): Promise<string | null> {
  const id = norm(requestId);
  if (!id) return null;

  try {
      const { data, error } = await supabase
        .from("requests")
      .select("id,display_no")
      .eq("id", id)
      .maybeSingle();
    const row = asRequestHeader(data);
    if (!error && row?.display_no) return String(row.display_no);
  } catch (e: any) {
    const msg = String(e?.message ?? "").toLowerCase();
    if (!msg.includes("permission denied") && !msg.includes("does not exist")) {
      console.warn(`[catalog_api.fetchRequestDisplayNo] requests:`, e?.message ?? e);
    }
  }

  const rpcVariants = ["request_display_no", "request_display", "request_label"] as const;
  for (const fn of rpcVariants) {
    try {
      const { data, error } = await runRequestDisplayRpc(fn, { p_request_id: id });
      if (!error && data != null) {
        if (typeof data === "string" || typeof data === "number") return String(data);
        const obj = data as Record<string, any>;
        const val = obj.display_no ?? obj.display ?? obj.label ?? null;
        if (val != null) return String(val);
      }
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (!msg.includes("function") && !msg.includes("does not exist")) {
        console.warn(`[catalog_api.fetchRequestDisplayNo] rpc ${fn}:`, e?.message ?? e);
      }
    }
  }

  const views = [
    { src: "request_display", col: "display_no" },
    { src: "vi_requests_display", col: "display_no" },
    { src: "v_requests_display", col: "display_no" },
    { src: "requests", col: "display_no" },
  ] as const;

  for (const { src, col } of views) {
    try {
      const { data, error } = await selectCatalogDynamicReadSingle(src, `id,${col}`, id);
      const row = asUnknownRecord(data);
      if (!error && row && row[col] != null) return String(row[col]);
    } catch (e: any) {
      const msg = String(e?.message ?? "").toLowerCase();
      if (!msg.includes("permission denied") && !msg.includes("does not exist")) {
        console.warn(`[catalog_api.fetchRequestDisplayNo] ${src}:`, e?.message ?? e);
      }
    }
  }

  return null;
}

const mapDetailsFromRow = (row: any): RequestDetails | null => {
  if (!row) return null;
  const id = pickFirstString(row?.id, row?.request_id);
  if (!id) return null;

  const objectCode = pickFirstString(
    row?.object_type_code,
    row?.objectTypeCode,
    row?.object_code,
    row?.objectCode,
    row?.objecttype_code,
    row?.objecttypeCode,
    row?.object
  );
  const levelCode = pickFirstString(row?.level_code, row?.levelCode, row?.level);
  const systemCode = pickFirstString(row?.system_code, row?.systemCode, row?.system);
  const zoneCode = pickFirstString(row?.zone_code, row?.zoneCode, row?.zone, row?.zone_area, row?.area);

  const commentRaw = row?.comment ?? row?.request_comment ?? null;
  const comment = typeof commentRaw === "string" ? commentRaw : norm(commentRaw);

  return {
    id,
    status: pickFirstString(row?.status, row?.request_status),
    display_no: pickFirstString(
      row?.display_no,
      row?.display,
      row?.label,
      row?.number,
      row?.request_no
    ),
    year: parseNumberValue(row?.year, row?.request_year, row?.requestYear),
    seq: parseNumberValue(row?.seq, row?.request_seq, row?.requestSeq),
    created_at: pickFirstString(row?.created_at, row?.created, row?.createdAt),
    need_by: pickFirstString(row?.need_by, row?.need_by_date, row?.needBy),
    comment: comment ?? null,
    foreman_name: pickFirstString(row?.foreman_name, row?.foreman, row?.foremanName),
    object_type_code: objectCode,
    level_code: levelCode,
    system_code: systemCode,
    zone_code: zoneCode,
    object_name_ru: readRefName(
      row,
      ["object", "object_type", "objecttype", "objectType", "object_ref"],
      objectCode,
    ),
    level_name_ru: readRefName(row, ["level", "level_ref", "levelRef"], levelCode),
    system_name_ru: readRefName(row, ["system", "system_type", "systemType", "system_ref"], systemCode),
    zone_name_ru: readRefName(row, ["zone", "zone_area", "area", "zoneRef", "zone_ref"], zoneCode),
  };
};

const mapSummaryFromRow = (row: any): ForemanRequestSummary | null => {
  const details = mapDetailsFromRow(row);
  if (!details) return null;

  const rawHas =
    row?.has_rejected ??
    row?.hasRejected ??
    row?.has_rej ??
    null;

  return {
    id: details.id,
    status: details.status ?? null,
    created_at: details.created_at ?? null,
    need_by: details.need_by ?? null,
    display_no: details.display_no ?? null,
    object_name_ru: details.object_name_ru ?? null,
    level_name_ru: details.level_name_ru ?? null,
    system_name_ru: details.system_name_ru ?? null,
    zone_name_ru: details.zone_name_ru ?? null,
    has_rejected:
      typeof rawHas === 'boolean'
        ? rawHas
        : rawHas == null
          ? null
          : Boolean(rawHas),
  };
};

export async function fetchRequestDetails(requestId: string): Promise<RequestDetails | null> {
  const id = norm(requestId);
  if (!id) return null;

  try {
    const { data, error } = await supabase
      .from("requests")
      .select(
        `id,status,display_no,year,seq,created_at,need_by,comment,foreman_name,
         object_type_code,level_code,system_code,zone_code,
         object:ref_object_types(*),
         level:ref_levels(*),
         system:ref_systems(*),
         zone:ref_zones(*)`
      )
      .eq("id", id)
      .maybeSingle();
    if (!error && data) {
      const mapped = mapDetailsFromRow(data);
      if (mapped) return mapped;
    }
    if (error) {
      const msg = String(error.message || "").toLowerCase();
      if (!msg.includes("permission denied") && !msg.includes("does not exist")) {
        console.warn("[catalog_api.fetchRequestDetails] requests:", error.message);
      }
    }
  } catch (e: any) {
    const msg = String(e?.message ?? "").toLowerCase();
    if (!msg.includes("permission denied") && !msg.includes("does not exist")) {
      console.warn("[catalog_api.fetchRequestDetails] requests:", e?.message ?? e);
    }
  }

  const views = ["v_requests_display", "v_request_pdf_header"] as const;
  for (const view of views) {
    try {
      const { data, error } = await selectCatalogDynamicReadSingle(view, "*", id);
      if (!error && data) {
        const mapped = mapDetailsFromRow(data);
        if (mapped) return mapped;
      }
      if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (!msg.includes("permission denied") && !msg.includes("does not exist")) {
          console.warn(`[catalog_api.fetchRequestDetails] ${view}:`, error.message);
        }
      }
    } catch (e: any) {
      const msg = String(e?.message ?? "").toLowerCase();
      if (!msg.includes("permission denied") && !msg.includes("does not exist")) {
        console.warn(`[catalog_api.fetchRequestDetails] ${view}:`, e?.message ?? e);
      }
    }
  }

  return null;
}

export type RequestMetaPatch = {
  need_by?: string | null;
  comment?: string | null;
  object_type_code?: string | null;
  level_code?: string | null;
  system_code?: string | null;
  zone_code?: string | null;
  foreman_name?: string | null;
  contractor_job_id?: string | null;
  subcontract_id?: string | null;
  contractor_org?: string | null;
  subcontractor_org?: string | null;
  contractor_phone?: string | null;
  subcontractor_phone?: string | null;
  planned_volume?: number | null;
  qty_plan?: number | null;
  volume?: number | null;
  object_name?: string | null;
  level_name?: string | null;
  system_name?: string | null;
  zone_name?: string | null;
};

let requestsExtendedMetaWriteSupportedCache: boolean | null = null;
let requestsExtendedMetaWriteSupportInFlight: Promise<boolean> | null = null;

async function resolveRequestsExtendedMetaWriteSupport(): Promise<boolean> {
  if (requestsExtendedMetaWriteSupportedCache != null) return requestsExtendedMetaWriteSupportedCache;
  if (requestsExtendedMetaWriteSupportInFlight) return requestsExtendedMetaWriteSupportInFlight;

  requestsExtendedMetaWriteSupportInFlight = (async () => {
    try {
      // Schema capability probe for extended request meta fields.
      const q = await supabase
        .from("requests")
        .select(
          "subcontract_id,contractor_job_id,contractor_org,subcontractor_org,contractor_phone,subcontractor_phone,planned_volume,qty_plan,volume,object_name,level_name,system_name,zone_name",
        )
        .limit(1);
      if (q.error) throw q.error;
      requestsExtendedMetaWriteSupportedCache = true;
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message.toLowerCase() : String(e ?? "").toLowerCase();
      const schemaMismatch =
        msg.includes("column") ||
        msg.includes("does not exist") ||
        msg.includes("schema cache");
      requestsExtendedMetaWriteSupportedCache = schemaMismatch ? false : true;
      return requestsExtendedMetaWriteSupportedCache;
    } finally {
      requestsExtendedMetaWriteSupportInFlight = null;
    }
  })();

  return requestsExtendedMetaWriteSupportInFlight;
}

export async function updateRequestMeta(
  requestId: string,
  patch: RequestMetaPatch
): Promise<boolean> {
  const id = norm(requestId);
  if (!id) return false;

  const payload: RequestsExtendedMetaUpdate = {};
  if (Object.prototype.hasOwnProperty.call(patch, "need_by"))
    payload.need_by = norm(patch.need_by) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "comment"))
    payload.comment = norm(patch.comment) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "object_type_code"))
    payload.object_type_code = patch.object_type_code || null;
  if (Object.prototype.hasOwnProperty.call(patch, "level_code"))
    payload.level_code = patch.level_code || null;
  if (Object.prototype.hasOwnProperty.call(patch, "system_code"))
    payload.system_code = patch.system_code || null;
  if (Object.prototype.hasOwnProperty.call(patch, "zone_code"))
    payload.zone_code = patch.zone_code || null;
  if (Object.prototype.hasOwnProperty.call(patch, "foreman_name"))
    payload.foreman_name = norm(patch.foreman_name) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "contractor_job_id"))
    payload.contractor_job_id = norm(patch.contractor_job_id) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "subcontract_id"))
    payload.subcontract_id = norm(patch.subcontract_id) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "contractor_org"))
    payload.contractor_org = norm(patch.contractor_org) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "subcontractor_org"))
    payload.subcontractor_org = norm(patch.subcontractor_org) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "contractor_phone"))
    payload.contractor_phone = norm(patch.contractor_phone) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "subcontractor_phone"))
    payload.subcontractor_phone = norm(patch.subcontractor_phone) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "planned_volume"))
    payload.planned_volume = parseNumberValue(patch.planned_volume);
  if (Object.prototype.hasOwnProperty.call(patch, "qty_plan"))
    payload.qty_plan = parseNumberValue(patch.qty_plan);
  if (Object.prototype.hasOwnProperty.call(patch, "volume"))
    payload.volume = parseNumberValue(patch.volume);
  if (Object.prototype.hasOwnProperty.call(patch, "object_name"))
    payload.object_name = norm(patch.object_name) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "level_name"))
    payload.level_name = norm(patch.level_name) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "system_name"))
    payload.system_name = norm(patch.system_name) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "zone_name"))
    payload.zone_name = norm(patch.zone_name) || null;

  if (!Object.keys(payload).length) return true;

  const basePayloadKeys = new Set([
    "need_by",
    "comment",
    "object_type_code",
    "level_code",
    "system_code",
    "zone_code",
    "foreman_name",
  ]);
  const hasExtendedPayload = Object.keys(payload).some((k) => !basePayloadKeys.has(k));

  try {
    const fullPayloadAllowed =
      !hasExtendedPayload ||
      (requestsExtendedMetaWriteSupportedCache === true) ||
      (requestsExtendedMetaWriteSupportedCache == null &&
        (await resolveRequestsExtendedMetaWriteSupport()));
    const primaryPayload = fullPayloadAllowed
      ? payload
      : Object.fromEntries(Object.entries(payload).filter(([k]) => basePayloadKeys.has(k)));
    let { error } = await supabase
      .from("requests")
      .update(primaryPayload)
      .eq("id", id);

    if (!error && hasExtendedPayload && fullPayloadAllowed) {
      requestsExtendedMetaWriteSupportedCache = true;
    }

    if (error && hasExtendedPayload && fullPayloadAllowed) {
      const primaryErr = error;
      const fallbackPayload: RequestsUpdate = {};
      for (const key of Object.keys(payload)) {
        if (basePayloadKeys.has(key)) fallbackPayload[key] = payload[key];
      }
      const msg = String(error?.message ?? "").toLowerCase();
      if (
        msg.includes("column") ||
        msg.includes("does not exist") ||
        msg.includes("schema cache")
      ) {
        requestsExtendedMetaWriteSupportedCache = false;
      }
      if (Object.keys(fallbackPayload).length) {
        const fallbackRes = await supabase
          .from("requests")
          .update(fallbackPayload)
          .eq("id", id);
        if (fallbackRes.error) {
          console.warn("[catalog_api.updateRequestMeta][patch400.fallback]", {
            request_id: id,
            payload: fallbackPayload,
            error: getCompatErrorInfo(fallbackRes.error),
          });
        }
        if (primaryErr) {
          console.warn("[catalog_api.updateRequestMeta][patch400.primary]", {
            request_id: id,
            payload: primaryPayload,
            error: getCompatErrorInfo(primaryErr),
          });
        }
        error = fallbackRes.error ?? null;
      }
    }

    if (error) {
      console.warn('[catalog_api.updateRequestMeta] table requests:', error.message);
      // Не роняем поток: если update не прошел, остальной экран продолжает жить.
      return false;
    }

    return true;
  } catch (e: unknown) {
    console.warn('[catalog_api.updateRequestMeta] table requests:', e instanceof Error ? e.message : e);
    // Тоже не роняем поток: пусть остальной код продолжит работать.
    return false;
  }
}


/** Позиции заявки: простое чтение из таблицы `request_items`. */
export async function listRequestItems(requestId: string): Promise<ReqItemRow[]> {
  const id = norm(requestId);
  if (!id) return [];

  try {
      const { data, error } = await supabase
        .from("request_items")
      .select(
        'id,request_id,rik_code,name_human,uom,qty,status,note,app_code,supplier_hint,row_no,position_order',
      )
      .eq('request_id', id)
      .order('row_no', { ascending: true })
      .order('position_order', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      console.warn('[catalog_api.listRequestItems] request_items:', error.message);
      return [];
    }

    if (!Array.isArray(data) || !data.length) return [];

    const rows = Array.isArray(data) ? (data as unknown[]) : []
    const mapped = rows
      .map((row) => mapRequestItemRow(row, id))
      .filter((row): row is ReqItemRow => !!row);

    return mapped.sort((a, b) => (a.line_no ?? 0) - (b.line_no ?? 0));
  } catch (e: any) {
    console.warn('[catalog_api.listRequestItems] request_items:', e?.message ?? e);
    return [];
  }
}
// ==============================
// PDF REQUEST (PROD SHIM)
// ==============================
export async function batchResolveRequestLabels(
  ids: Array<string | number>,
): Promise<Record<string, string>> {
  const mod = await import("./api/pdf_request");
  return await mod.batchResolveRequestLabels(ids);
}

export async function exportRequestPdf(
  requestId: string,
  mode: "preview" | "share" = "preview",
): Promise<string> {
  // mode оставлен только для совместимости: preview/share обрабатывается в pdfRunner/runPdfTop.
  const mod = await import("./api/pdf_request");
  return await mod.exportRequestPdf(requestId);
}

export async function generateRequestPdfDocument(requestId: string) {
  const mod = await import("./documents/pdfDocumentGenerators");
  return await mod.generateRequestPdfDocument({
    requestId,
    originModule: "director",
  });
}

export async function buildProposalPdfHtml(proposalId: string | number): Promise<string> {
  const mod = await import("./api/pdf_proposal");
  return await mod.buildProposalPdfHtml(proposalId);
}

export async function exportProposalPdf(
  proposalId: string | number,
  mode: "preview" | "share" = "preview",
): Promise<string> {
  const mod = await import("./api/pdf_proposal");
  return await mod.exportProposalPdf(proposalId, mode);
}

export async function generateProposalPdfDocument(
  proposalId: string | number,
  originModule: "buyer" | "accountant" | "director" = "buyer",
) {
  const mod = await import("./documents/pdfDocumentGenerators");
  return await mod.generateProposalPdfDocument({ proposalId, originModule });
}

export async function exportPaymentOrderPdf(
  paymentId: string | number,
  modeOrDraft: "preview" | "share" | Record<string, unknown> = "preview",
): Promise<string> {
  const mod = await import("./api/pdf_payment");
  const draft = typeof modeOrDraft === "string" ? undefined : modeOrDraft;
  return await mod.exportPaymentOrderPdf(Number(paymentId), draft as any);
}

export async function generatePaymentOrderPdfDocument(
  paymentId: string | number,
  originModule: "accountant" | "director" = "accountant",
) {
  const mod = await import("./documents/pdfDocumentGenerators");
  return await mod.generatePaymentOrderPdfDocument({ paymentId, originModule });
}

export async function uploadProposalAttachment(
  proposalId: string,
  file: any,
  filename: string,
  kind: "invoice" | "payment" | "proposal_pdf" | string,
): Promise<void> {
  const mod = await import("./api/storage");
  return await mod.uploadProposalAttachment(proposalId, file, filename, kind);
}

export async function requestItemUpdateQty(
  requestItemId: string,
  qty: number,
  requestIdHint?: string,
): Promise<ReqItemRow | null> {
  const id = norm(requestItemId);
  if (!id) throw new Error("Не найден идентификатор позиции");

  const numericQty = Number(qty);
  if (!Number.isFinite(numericQty) || numericQty <= 0) {
    throw new Error("Количество должно быть больше нуля");
  }

  const rid = requestIdHint ? norm(requestIdHint) : '';
  let lastErr: any = null;

  try {
    const args: RequestItemUpdateQtyArgs = {
      p_request_item_id: id,
      p_qty: numericQty,
    };
    const { data, error } = await supabase.rpc("request_item_update_qty", args);
    if (!error && data) {
      const mapped = mapRequestItemRow(data, rid || '');
      if (mapped) return mapped;
    } else if (error) {
      lastErr = error;
    }
  } catch (e: any) {
    lastErr = e;
  }

  try {
    const { data, error } = await supabase
      .from("request_items")
      .update({ qty: numericQty } satisfies RequestItemsUpdate)
      .eq("id", id)
      .select(
        "id,request_id,rik_code,name_human,uom,qty,status,note,app_code,supplier_hint,row_no,position_order",
      )
      .maybeSingle();
    if (error) throw error;
    if (data) {
      const mapped = mapRequestItemRow(data, rid || String((data as { request_id?: unknown })?.request_id ?? ""));
      if (mapped) return mapped;
    }
  } catch (e: any) {
    lastErr = e;
  }

  if (lastErr) throw lastErr;
  return null;
}

export async function listForemanRequests(
  foremanName: string,
  limit = 50,
  userId?: string | null,
): Promise<ForemanRequestSummary[]> {
  const name = norm(foremanName);
  const uid = norm(userId);
  if (!name && !uid) return [];

  const take = clamp(limit, 1, 200);
  const requestSelect =
    `id,status,created_at,need_by,display_no,
     object_type_code,level_code,system_code,zone_code,
     object:ref_object_types(*),
     level:ref_levels(*),
     system:ref_systems(*),
     zone:ref_zones(*)`;

  const results: Array<{ data: unknown; error: { message?: string } | null }> = [];
  if (name) {
    results.push(
      await supabase
        .from("requests")
        .select(requestSelect)
        .ilike("foreman_name", name)
        .not("display_no", "is", null)
        .order("created_at", { ascending: false })
        .limit(take),
    );
  }
  if (uid) {
    results.push(
      await supabase
        .from("requests")
        .select(requestSelect)
        .eq("created_by", uid)
        .not("display_no", "is", null)
        .order("created_at", { ascending: false })
        .limit(take),
    );
  }

  const mergedById = new Map<string, any>();
  for (const result of results) {
    if (result.error) {
      console.warn("[listForemanRequests]", result.error.message);
      continue;
    }
    if (!Array.isArray(result.data)) continue;
    const rows = Array.isArray(result.data) ? (result.data as unknown[]) : [];
    for (const rawRow of rows) {
      if (!isRecord(rawRow)) continue;
      const row = rawRow as RequestListMergedRow;
      const id = String(row.id ?? "").trim();
      if (!id || mergedById.has(id)) continue;
      mergedById.set(id, row);
    }
  }

  const data = Array.from(mergedById.values()).sort((a, b) => {
    const aTs = Date.parse(String(a?.created_at ?? "")) || 0;
    const bTs = Date.parse(String(b?.created_at ?? "")) || 0;
    return bTs - aTs;
  }).slice(0, take);
  if (!data.length) return [];

  // 1) Маппим заголовки заявок.
  const mapped = data
    .map((row) => mapSummaryFromRow(row))
    .filter((row): row is ForemanRequestSummary => !!row);

  const ids = mapped.map((r) => r.id).filter(Boolean);
  if (!ids.length) return mapped;

  // 2) Подтягиваем статусы позиций по request_id для вычисления агрегированного статуса и has_rejected.
  const { data: itemRows, error: itemErr } = await supabase
    .from("request_items")
    .select("request_id,status")
    .in("request_id", ids);

  if (itemErr || !Array.isArray(itemRows)) {
    return mapped; // Не ломаем выдачу, если агрегация статусов не удалась.
  }

  const normSt = (s: any) => String(s ?? "").trim().toLowerCase();
  const isApproved = (st: string) =>
    st === "\u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043e" ||
    st === "\u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430" ||
    st === "approved" ||
    st === "\u043a \u0437\u0430\u043a\u0443\u043f\u043a\u0435";
  const isRejected = (st: string) =>
    st === "\u043e\u0442\u043a\u043b\u043e\u043d\u0435\u043d\u043e" ||
    st === "\u043e\u0442\u043a\u043b\u043e\u043d\u0435\u043d\u0430" ||
    st === "rejected";
  const isPending = (st: string) =>
    st === "\u043d\u0430 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0438" ||
    st === "pending";

  const agg = new Map<string, { total: number; ok: number; bad: number; pend: number }>();
  const statusRows = Array.isArray(itemRows) ? (itemRows as unknown[]) : [];
  for (const rawRow of statusRows) {
    if (!isRecord(rawRow)) continue;
    const row = rawRow as RequestItemStatusAggRow;
    const rid = String(row.request_id ?? "");
    if (!rid) continue;
    const st = normSt(row.status);
    const cur = agg.get(rid) ?? { total: 0, ok: 0, bad: 0, pend: 0 };
    cur.total += 1;
    if (isApproved(st)) cur.ok += 1;
    else if (isRejected(st)) cur.bad += 1;
    else if (isPending(st)) cur.pend += 1;
    agg.set(rid, cur);
  }

  return mapped.map((req) => {
    const a = agg.get(String(req.id));
    if (!a || a.total === 0) return req;

    const hasRejected = a.bad > 0;

    if (a.bad === a.total) {
      return { ...req, status: "\u041e\u0442\u043a\u043b\u043e\u043d\u0435\u043d\u0430", has_rejected: true };
    }

    if (a.ok === a.total) {
      return { ...req, status: "\u041a \u0437\u0430\u043a\u0443\u043f\u043a\u0435", has_rejected: false };
    }

    if (a.ok > 0 && a.bad > 0) {
      return { ...req, status: "\u0427\u0430\u0441\u0442\u0438\u0447\u043d\u043e \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430", has_rejected: true };
    }

    if (a.pend > 0) {
      if (hasRejected) return { ...req, status: "\u0427\u0430\u0441\u0442\u0438\u0447\u043d\u043e \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430", has_rejected: true };
      return { ...req, status: "\u041d\u0430 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0438", has_rejected: false };
    }

    if (hasRejected) return { ...req, status: "\u0427\u0430\u0441\u0442\u0438\u0447\u043d\u043e \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430", has_rejected: true };
    return { ...req, has_rejected: false };
  });
}
export async function listSuppliers(search?: string): Promise<Supplier[]> {
  const q = sanitizePostgrestOrTerm(search || "");

  try {
    const rpcArgs: SuppliersListRpcArgs = { p_search: q || null };
    const { data, error } = await supabase.rpc("suppliers_list", rpcArgs);
    if (!error && Array.isArray(data)) {
      const mapped = mapSupplierRows(data as SuppliersListRpcRow[]);
      if (mapped.length) return mapped;
    } else if (error) {
      const msg = String(error.message || "");
      if (!msg.includes("does not exist")) {
        console.warn("[catalog_api.listSuppliers] rpc suppliers_list:", error.message);
      }
    }
  } catch (e: any) {
    if (!String(e?.message ?? "").includes("does not exist")) {
      console.warn("[catalog_api.listSuppliers] rpc suppliers_list:", e?.message ?? e);
    }
  }

  try {
    let query = supabase
      .from("suppliers")
      .select(SUPPLIERS_TABLE_SELECT)
      .order("name", { ascending: true });
    if (q) {
      query = query.or(`name.ilike.%${q}%,inn.ilike.%${q}%,specialization.ilike.%${q}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    if (Array.isArray(data)) {
      return mapSupplierRows(data as SupplierTableRow[]);
    }
  } catch (e: any) {
    console.warn("[catalog_api.listSuppliers] table suppliers:", e?.message ?? e);
  }

  return [];
}

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

const isApprovedForProcurement = (raw: unknown) => isRequestApprovedForProcurement(raw);

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

let proposalItemsBindingColumnsCache: ProposalItemsBindingColumns | null = null;
let proposalItemsBulkUpsertCapabilityCache: boolean | null = null;

async function loadProposalItemsBindingColumns(): Promise<ProposalItemsBindingColumns> {
  if (proposalItemsBindingColumnsCache) return proposalItemsBindingColumnsCache;

  try {
    const q = await supabase.from("proposal_items").select("*").limit(1);
    if (q.error) throw q.error;
    const row = Array.isArray(q.data) && q.data.length > 0 ? (q.data[0] as Record<string, any>) : null;
    const cols = row ? new Set(Object.keys(row)) : new Set<string>();
    proposalItemsBindingColumnsCache = {
      supplier_id: cols.has("supplier_id"),
      contractor_id: cols.has("contractor_id"),
    };
  } catch (e: any) {
    console.warn(
      "[catalog_api.createProposalsBySupplier] proposal_items columns probe:",
      e?.message ?? e,
    );
    proposalItemsBindingColumnsCache = { supplier_id: false, contractor_id: false };
  }
  return proposalItemsBindingColumnsCache;
}

async function loadRequestItemsForProposal(ids: string[]): Promise<any[]> {
  const uniqIds = Array.from(new Set((ids || []).map((x) => String(x || "").trim()).filter(Boolean)));
  if (!uniqIds.length) return [];

  try {
    const q = await supabase
      .from("request_items")
      .select("*")
      .in("id", uniqIds);
    if (!q.error) return Array.isArray(q.data) ? q.data : [];
    throw q.error;
  } catch (e: any) {
    throw e;
  }
}

const parseProposalKind = (raw: unknown): ProposalItemKind => {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v) return "unknown";
  if (v === "material" || v === "materials" || v === "материал" || v === "материалы") return "material";
  if (v === "service" || v === "services" || v === "услуга" || v === "услуги") return "service";
  if (v === "work" || v === "works" || v === "работа" || v === "работы") return "work";
  return "unknown";
};

const isRejectedForBuyerRework = (row: any): boolean => {
  const status = String(row?.status ?? "").trim().toLowerCase();
  if (status.includes("reject") || status.includes("отклон")) return true;
  if (row?.director_reject_at) return true;
  const note = String(row?.director_reject_note ?? "").trim();
  return !!note;
};

const parsePositive = (raw: unknown): number => {
  const n = Number(String(raw ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const normCounterpartyKey = (v: unknown): string =>
  String(v ?? "").trim().replace(/\s+/g, " ").toLowerCase();

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

const parseProposalHeadMetaRow = (value: unknown): ProposalHeadMetaRow | null => {
  const row = asUnknownRecord(value);
  if (!row) return null;
  return {
    proposal_no: row.proposal_no == null ? null : String(row.proposal_no),
    id_short: parseNumberValue(row.id_short),
    display_no: row.display_no == null ? null : String(row.display_no),
    request_id: row.request_id == null ? null : String(row.request_id),
  };
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
  } catch (e: any) {
    console.warn("[catalog_api.createProposalsBySupplier] suppliers binding load:", e?.message ?? e);
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
  } catch (e: any) {
    console.warn("[catalog_api.createProposalsBySupplier] contractors binding load:", e?.message ?? e);
  }

  return { supplierIdByName, contractorIdByName };
}

export async function createProposalsBySupplier(
  buckets: ProposalBucketInput[],
  opts: CreateProposalsOptions = {}
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
  let dbCalls = 0;
  let proposalItemsBulkUpsertSupported = proposalItemsBulkUpsertCapabilityCache !== false;
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

  const proposals: CreateProposalsResult["proposals"] = [];
  const shouldSubmit = opts.submit !== false;
  const statusAfter = opts.requestItemStatus ?? null;
  const seenRequestItemIdsInRun = new Set<string>();

  const groupBucketsStartedAt = nowMs();
  const allItemIds = Array.from(
    new Set(
      (buckets || [])
        .flatMap((b) => b?.request_item_ids ?? [])
        .map((id) => String(id || "").trim())
        .filter(Boolean),
    ),
  );
  perf.groupBuckets = nowMs() - groupBucketsStartedAt;

  const preparePayloadStartedAt = nowMs();
  const approvedItemIds = new Set<string>();
  const itemInfoById = new Map<string, RequestItemForProposal>();
  const counterpartyBindingPromise = loadCounterpartyBinding();
  const proposalItemsBindingColsPromise = loadProposalItemsBindingColumns();

  if (allItemIds.length) {
    try {
      dbCalls += 1; // request_items load
      const qItemsData = parseRequestItemsForProposalRows(
        await loadRequestItemsForProposal(allItemIds),
      );
      if (qItemsData.length) {
        const reqIds = Array.from(
          new Set(qItemsData.map((r) => norm(r.request_id)).filter(Boolean)),
        );
        const qReq = reqIds.length
          ? (dbCalls += 1, await supabase.from("requests").select("id,status").in("id", reqIds))
          : { data: [] as RequestStatusLiteRow[], error: null };

        const reqStatusById = new Map<string, string>();
        parseRequestStatusLiteRows(qReq.data).forEach((r) => {
          reqStatusById.set(String(r.id || "").trim(), String(r.status || ""));
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

        qItemsData.forEach((row) => {
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
          } else if (
            approvedByRequestStatus ||
            approvedByItemStatus ||
            rejectedForRework
          ) {
            approvedItemIds.add(itemId);
          }
        });

        console.info("[catalog_api.createProposalsBySupplier] approval gate", {
          allItemIds,
          approvedItemIds: Array.from(approvedItemIds),
          rows: gateDebugRows,
        });
      }
    } catch (e: any) {
      console.warn("[catalog_api.createProposalsBySupplier] request approval gate:", e?.message ?? e);
      allItemIds.forEach((id) => approvedItemIds.add(id));
    }
  }
  const [counterpartyBinding, proposalItemsBindingCols] = await Promise.all([
    counterpartyBindingPromise,
    proposalItemsBindingColsPromise,
  ]);
  perf.preparePayload = nowMs() - preparePayloadStartedAt;

  for (const [bucketIndex, bucket] of (buckets || []).entries()) {
    const bucketDbCallsStart = dbCalls;
    let bucketCreateProposalHeadsMs = 0;
    let bucketFetchAfterWriteMs = 0;
    let bucketInsertProposalItemsMs = 0;
    let bucketLinkBindingsMs = 0;
    let bucketUpdateRequestItemsMs = 0;
    const idsRaw = (bucket?.request_item_ids ?? [])
      .map((id) => String(id || "").trim())
      .filter((id) => !!id && approvedItemIds.has(id));
    const filteredOutIds = (bucket?.request_item_ids ?? [])
      .map((id) => String(id || "").trim())
      .filter((id) => !!id && !approvedItemIds.has(id));
    if (filteredOutIds.length) {
      console.warn("[catalog_api.createProposalsBySupplier] bucket filtered ids", {
        bucketIndex,
        supplier: bucket?.supplier ?? null,
        filteredOutIds,
      });
    }
    const ids: string[] = [];
    for (const itemId of idsRaw) {
      if (seenRequestItemIdsInRun.has(itemId)) {
        throw new Error(`duplicate request_item_id in payload: ${itemId}`);
      }
      seenRequestItemIdsInRun.add(itemId);
      ids.push(itemId);
    }
    if (!ids.length) continue;

    let proposalId: string;
    let proposalNo: string | null = null;
    let displayNo: string | null = null;

    try {
      const createHeadStartedAt = nowMs();
      dbCalls += 1;
      const created = await rpcProposalCreateFull();
      proposalId = String(created.id);
      const createdHead = mapProposalHeadDisplay(created);
      proposalNo = createdHead.proposalNo;
      displayNo = createdHead.displayNo;

      const requestIdsForBucket = Array.from(
        new Set(
          ids
            .map((requestItemId) => String(itemInfoById.get(requestItemId)?.request_id ?? "").trim())
            .filter(Boolean),
        ),
      );
      const headerPatch: ProposalsUpdate = {};
      if (opts.buyerFio) headerPatch.buyer_fio = opts.buyerFio;
      const supplierDisplay = bucket?.supplier ? norm(bucket.supplier) : "";
      if (supplierDisplay) headerPatch.supplier = supplierDisplay;
      if (requestIdsForBucket.length === 1) {
        headerPatch.request_id = requestIdsForBucket[0];
      } else if (requestIdsForBucket.length > 1) {
        console.warn("[catalog_api.createProposalsBySupplier] proposal head has multiple request_ids; request_id patch skipped", {
          proposalId,
          requestIdsForBucket,
          requestItemIds: ids,
        });
      }
      if (Object.keys(headerPatch).length) {
        dbCalls += 1;
        await supabase.from("proposals").update(headerPatch).eq("id", proposalId);
      }
      bucketCreateProposalHeadsMs += nowMs() - createHeadStartedAt;
      perf.createProposalHeads += bucketCreateProposalHeadsMs;

      const fetchAfterWriteStartedAt = nowMs();
      const requestIdAfterCreate = createdHead.requestId;
      if (!displayNo && proposalNo) {
        dbCalls += 1;
        const patch: ProposalsUpdate = { display_no: proposalNo };
        if (!requestIdAfterCreate && requestIdsForBucket.length === 1) {
          patch.request_id = requestIdsForBucket[0];
        }
        const displayPatch = await supabase.from("proposals").update(patch).eq("id", proposalId);
        if (displayPatch.error) {
          console.warn("[catalog_api.createProposalsBySupplier] proposal metadata patch:", displayPatch.error.message);
        } else {
          displayNo = proposalNo;
        }
      }
      bucketFetchAfterWriteMs += nowMs() - fetchAfterWriteStartedAt;
      perf.fetchAfterWrite += bucketFetchAfterWriteMs;
    } catch (e: any) {
      console.warn("[catalog_api.createProposalsBySupplier] proposalCreate:", e?.message ?? e);
      throw e;
    }

    const supplierDisplay = bucket?.supplier ? norm(bucket.supplier) : "";
    const supplierLabel = supplierDisplay || SUPPLIER_NONE_LABEL;
    const supplierDb: string | null = supplierDisplay ? supplierDisplay : null;

    let added = 0;
    try {
      const insertProposalItemsStartedAt = nowMs();
      dbCalls += 1;
      added = await rpcProposalAddItems(proposalId, ids);
      bucketInsertProposalItemsMs += nowMs() - insertProposalItemsStartedAt;
      perf.insertProposalItems += nowMs() - insertProposalItemsStartedAt;
    } catch (e: any) {
      console.warn("[catalog_api.createProposalsBySupplier] proposalAddItems:", e?.message ?? e);
    }

    if (!added) {
      const insertProposalItemsStartedAt = nowMs();
      for (const pack of chunk(ids, 50)) {
        const rows: ProposalItemsInsert[] = pack.map((request_item_id) => ({
          proposal_id: proposalId,
          proposal_id_text: proposalId,
          request_item_id,
        }));
        dbCalls += 1;
        const { error } = await supabase.from("proposal_items").insert(rows);
        if (error) throw error;
      }
      const insertMs = nowMs() - insertProposalItemsStartedAt;
      bucketInsertProposalItemsMs += insertMs;
      perf.insertProposalItems += insertMs;
    }

    const idsSet = new Set(ids);
    const validatedByItemId = new Map<
      string,
      {
        request_item_id: string;
        price: number;
        qty: number;
        supplier: string | null;
        supplier_id: string | null;
        contractor_id: string | null;
        kind: ProposalItemKind;
      }
    >();

    const metaRows: ProposalSnapshotMetaRow[] = (bucket.meta ?? ids.map((request_item_id) => ({ request_item_id })))
      .map(parseProposalBucketMetaInput)
      .filter((row) => idsSet.has(row.request_item_id))
      .map((row) => {
        const request_item_id = row.request_item_id;
        const itemInfo = itemInfoById.get(request_item_id);
        const qty = Number(itemInfo?.qty ?? 0);
        const price = parsePositive(row.price ?? null);
        const kind = itemInfo?.kind ?? "unknown";
        const counterpartyName = norm(row.supplier ?? supplierDb ?? "");
        const normCp = normCounterpartyKey(counterpartyName);

        let supplier_id: string | null = null;
        let contractor_id: string | null = null;
        if (kind === "material") {
          supplier_id = counterpartyBinding.supplierIdByName.get(normCp) ?? null;
          if (!supplier_id && proposalItemsBindingCols.supplier_id) {
            throw new Error(`material item requires valid supplier_id binding: ${request_item_id}`);
          }
        } else if (kind === "service" || kind === "work") {
          contractor_id = counterpartyBinding.contractorIdByName.get(normCp) ?? null;
          if (!contractor_id && proposalItemsBindingCols.contractor_id) {
            throw new Error(`${kind} item requires valid contractor_id binding: ${request_item_id}`);
          }
        } else {
          supplier_id = counterpartyBinding.supplierIdByName.get(normCp) ?? null;
          contractor_id = counterpartyBinding.contractorIdByName.get(normCp) ?? null;
          if (!supplier_id && !contractor_id && proposalItemsBindingCols.supplier_id && proposalItemsBindingCols.contractor_id) {
            throw new Error(`item requires supplier_id or contractor_id binding: ${request_item_id}`);
          }
        }

        if (!(qty > 0)) throw new Error(`proposal item qty must be > 0: ${request_item_id}`);
        if (!(price > 0)) throw new Error(`proposal item price must be > 0: ${request_item_id}`);

        validatedByItemId.set(request_item_id, {
          request_item_id,
          price,
          qty,
          supplier: counterpartyName || null,
          supplier_id,
          contractor_id,
          kind,
        });

        return {
          request_item_id,
          price: String(price),
          supplier: counterpartyName || null,
          note: row.note ?? null,
        };
      });

    if (validatedByItemId.size !== ids.length) {
      throw new Error("proposal validation failed: missing canonical item bindings");
    }

    if (metaRows.length) {
      try {
        const insertProposalItemsStartedAt = nowMs();
        dbCalls += 1;
        await rpcProposalSnapshotItems(proposalId, metaRows);
        const insertMs = nowMs() - insertProposalItemsStartedAt;
        bucketInsertProposalItemsMs += insertMs;
        perf.insertProposalItems += insertMs;
      } catch (e: any) {
        console.warn("[catalog_api.createProposalsBySupplier] proposalSnapshotItems:", e?.message ?? e);
      }
    }

    let bindingColumnsWarned = false;
    const rowsForUpdate = Array.from(validatedByItemId.values());
    const linkBindingsStartedAt = nowMs();
    const upsertRows: ProposalItemsCompatInsertUpsert[] = rowsForUpdate.map((row) => {
      const payload: ProposalItemsCompatInsertUpsert = {
        proposal_id: proposalId,
        proposal_id_text: proposalId,
        request_item_id: row.request_item_id,
        qty: row.qty,
        price: row.price,
        supplier: row.supplier,
      };
      if (proposalItemsBindingCols.supplier_id) payload.supplier_id = row.supplier_id;
      if (proposalItemsBindingCols.contractor_id) payload.contractor_id = row.contractor_id;
      return payload;
    });

    if (proposalItemsBulkUpsertSupported && upsertRows.length) {
      try {
        for (const pack of chunk(upsertRows, 100)) {
          dbCalls += 1;
          const { error } = await supabase
            .from("proposal_items")
            .upsert(pack, { onConflict: "proposal_id,request_item_id" });
          if (error) throw error;
        }
        proposalItemsBulkUpsertCapabilityCache = true;
      } catch (e: any) {
        const msg = String(e?.message ?? e ?? "");
        if (msg.toLowerCase().includes("no unique") || msg.toLowerCase().includes("on conflict")) {
          proposalItemsBulkUpsertSupported = false;
          proposalItemsBulkUpsertCapabilityCache = false;
        }
        console.warn(
          "[catalog_api.createProposalsBySupplier] proposal_items bulk upsert failed; fallback to row updates:",
          e?.message ?? e,
        );
      }
    }

    if (!proposalItemsBulkUpsertSupported) {
      for (const pack of chunk(rowsForUpdate, 20)) {
        await Promise.all(
          pack.map(async (row) => {
            try {
              const payload: ProposalItemsCompatUpdate = {
                qty: row.qty,
                price: row.price,
                supplier: row.supplier,
              };
              if (proposalItemsBindingCols.supplier_id) payload.supplier_id = row.supplier_id;
              if (proposalItemsBindingCols.contractor_id) payload.contractor_id = row.contractor_id;

              const requiresSupplierBinding = row.kind === "material" && !!row.supplier_id;
              const requiresContractorBinding =
                (row.kind === "service" || row.kind === "work") && !!row.contractor_id;
              if (
                !bindingColumnsWarned &&
                ((requiresSupplierBinding && !proposalItemsBindingCols.supplier_id) ||
                  (requiresContractorBinding && !proposalItemsBindingCols.contractor_id))
              ) {
                bindingColumnsWarned = true;
                console.warn(
                  "[catalog_api.createProposalsBySupplier] proposal_items binding columns are missing in schema; storing text binding only",
                );
              }

              dbCalls += 1;
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
            } catch (e: any) {
              console.warn(
                "[catalog_api.createProposalsBySupplier] proposal_items canonical binding update ex:",
                e?.message ?? e,
              );
            }
          }),
        );
      }
    }
    const linkMs = nowMs() - linkBindingsStartedAt;
    bucketLinkBindingsMs += linkMs;
    perf.linkBindings += linkMs;

    if (shouldSubmit) {
      try {
        const insertProposalItemsStartedAt = nowMs();
        dbCalls += 1;
        await rpcProposalSubmit(proposalId);
        const insertMs = nowMs() - insertProposalItemsStartedAt;
        bucketInsertProposalItemsMs += insertMs;
        perf.insertProposalItems += insertMs;
      } catch (e: any) {
        console.warn("[catalog_api.createProposalsBySupplier] proposalSubmit:", e?.message ?? e);
      }
    }

    if (statusAfter) {
      const updateRequestItemsStartedAt = nowMs();
      try {
        dbCalls += 1;
        const args: RequestItemsSetStatusArgs = {
          p_request_item_ids: ids,
          p_status: statusAfter,
        };
        const { error } = await supabase.rpc("request_items_set_status", args);
        if (error) throw error;
      } catch {
        dbCalls += 1;
        await supabase
          .from("request_items")
          .update({ status: statusAfter } satisfies RequestItemsUpdate)
          .in("id", ids);
      }
      const updateMs = nowMs() - updateRequestItemsStartedAt;
      bucketUpdateRequestItemsMs += updateMs;
      perf.updateRequestItems += updateMs;
    }

    bucketPerf.push({
      bucketIndex,
      itemCount: ids.length,
      dbCalls: dbCalls - bucketDbCallsStart,
      createProposalHeadsMs: Number(bucketCreateProposalHeadsMs.toFixed(1)),
      fetchAfterWriteMs: Number(bucketFetchAfterWriteMs.toFixed(1)),
      insertProposalItemsMs: Number(bucketInsertProposalItemsMs.toFixed(1)),
      linkBindingsMs: Number(bucketLinkBindingsMs.toFixed(1)),
      updateRequestItemsMs: Number(bucketUpdateRequestItemsMs.toFixed(1)),
    });

    proposals.push({
      proposal_id: proposalId,
      proposal_no: proposalNo,
      supplier: supplierLabel,
      request_item_ids: ids,
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
    proposalsCreated: proposals.length,
    dbCalls,
    bucketPerf,
  });
  if (!proposals.length) {
    console.warn("[catalog_api.createProposalsBySupplier] no proposals created", {
      allItemIds,
      approvedItemIds: Array.from(approvedItemIds),
      bucketCount: buckets?.length ?? 0,
    });
  }

  return { proposals };
}

// PROD quick search: предпочитаем новый поиск, но допускаем мягкий fallback.
export async function rikQuickSearch(q: string, limit = 60) {
  const text = norm(q);
  if (text.length < 2) return [];

  const pQuery = sanitizePostgrestOrTerm(text);
  const pLimit = Math.min(limit, 100);

  for (const fn of RIK_QUICK_SEARCH_RPCS) {
    try {
      const rpcArgs: CatalogSearchRpcArgs = {
        p_q: pQuery,
        p_limit: pLimit,
        p_apps: null,
      };
      const data = await runCatalogSearchRpc(fn, rpcArgs);

      if (data && data.length > 0) {
        return mapRikQuickSearchRpcRows(data);
      }
    } catch { }
  }

  // Fallback: Smart ILIKE on rik_items
  const tokens = pQuery.split(/\s+/).filter((token) => token.length >= 2);
  let builder = supabase
    .from("rik_items")
    .select(RIK_QUICK_SEARCH_FALLBACK_FIELDS)
    .limit(limit);

  if (tokens.length > 0) {
    tokens.forEach((t) => {
      builder = builder.or(`name_human.ilike.%${t}%,rik_code.ilike.%${t}%`);
    });
  } else {
    builder = builder.or(`name_human.ilike.%${pQuery}%,rik_code.ilike.%${pQuery}%`);
  }

  const { data, error } = await builder.order("rik_code", { ascending: true });
  if (error || !Array.isArray(data)) return [];

  return mapRikQuickSearchFallbackRows(data);
}
// ===============================
// CANCEL REQUEST ITEM
// ===============================
export async function requestItemCancel(requestItemId: string) {
  if (!requestItemId) {
    throw new Error('requestItemId is required');
  }

  const { error } = await supabase
    .from('request_items')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', requestItemId);

  if (error) {
    console.error('[requestItemCancel]', error);
    throw error;
  }

  return true;
}
