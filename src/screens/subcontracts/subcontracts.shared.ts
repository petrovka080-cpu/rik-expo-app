import { supabase } from "../../lib/supabaseClient";

export type SubcontractStatus = "draft" | "pending" | "approved" | "rejected" | "closed";
export type SubcontractWorkMode = "labor_only" | "turnkey" | "mixed";
export type SubcontractPriceType = "by_volume" | "by_shift" | "by_hour";

export type Subcontract = {
  id: string;
  display_no?: string | null;
  year?: number | null;
  seq?: number | null;
  created_at: string;
  created_by?: string | null;
  status: SubcontractStatus;
  foreman_name: string | null;
  contractor_org: string | null;
  contractor_inn: string | null;
  contractor_rep: string | null;
  contractor_phone: string | null;
  contract_number: string | null;
  contract_date: string | null;
  object_name: string | null;
  work_zone: string | null;
  work_type: string | null;
  qty_planned: number | null;
  uom: string | null;
  date_start: string | null;
  date_end: string | null;
  work_mode: SubcontractWorkMode | null;
  price_per_unit: number | null;
  total_price: number | null;
  price_type: SubcontractPriceType | null;
  foreman_comment: string | null;
  director_comment: string | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
};

export type SubcontractItemSource = "catalog" | "smeta";

export type SubcontractItem = {
  id: string;
  created_at: string;
  subcontract_id: string;
  created_by: string | null;
  source: SubcontractItemSource;
  rik_code: string | null;
  name: string;
  qty: number;
  uom: string | null;
  status: "draft" | "canceled";
};

export type NewSubcontractItem = {
  source: SubcontractItemSource;
  rik_code?: string | null;
  name: string;
  qty: number;
  uom?: string | null;
};

export const STATUS_CONFIG: Record<SubcontractStatus, { label: string; bg: string; fg: string }> = {
  draft: { label: "Черновик", bg: "#E2E8F0", fg: "#475569" },
  pending: { label: "На утверждении", bg: "#FEF3C7", fg: "#92400E" },
  approved: { label: "В работе", bg: "#DCFCE7", fg: "#166534" },
  rejected: { label: "Отклонено", bg: "#FEE2E2", fg: "#991B1B" },
  closed: { label: "Закрыта", bg: "#F1F5F9", fg: "#64748B" },
};

export const WORK_MODE_OPTIONS: Array<{ value: SubcontractWorkMode; label: string }> = [
  { value: "labor_only", label: "Только рабочие" },
  { value: "turnkey", label: "Под ключ" },
  { value: "mixed", label: "Смешанный" },
];

export const PRICE_TYPE_OPTIONS: Array<{ value: SubcontractPriceType; label: string }> = [
  { value: "by_volume", label: "За объём" },
  { value: "by_shift", label: "За смену" },
  { value: "by_hour", label: "За час" },
];

export const WORK_MODE_LABEL: Record<SubcontractWorkMode, string> = {
  labor_only: "Только рабочие",
  turnkey: "Под ключ",
  mixed: "Смешанный",
};

export const PRICE_TYPE_LABEL: Record<SubcontractPriceType, string> = {
  by_volume: "За объём",
  by_shift: "За смену",
  by_hour: "За час",
};

export function fmtAmount(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  return Number(v).toLocaleString("ru-RU");
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ru-RU");
}

export async function listForemanSubcontracts(userId: string): Promise<Subcontract[]> {
  const { data, error } = await supabase
    .from("subcontracts")
    .select("*")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Subcontract[];
}

export async function listDirectorSubcontracts(): Promise<Subcontract[]> {
  const { data, error } = await supabase
    .from("subcontracts")
    .select("*")
    .not("status", "eq", "draft")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Subcontract[];
}

export async function listAccountantSubcontracts(): Promise<Subcontract[]> {
  const { data, error } = await supabase
    .from("subcontracts")
    .select("*")
    .eq("status", "approved")
    .order("approved_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Subcontract[];
}

export async function createSubcontractDraft(userId: string, foremanName: string): Promise<string> {
  const row = await createSubcontractDraftWithPatch(userId, foremanName, {});
  return row.id;
}

export async function createSubcontractDraftWithPatch(
  userId: string,
  foremanName: string,
  patch: Partial<Subcontract>,
): Promise<Pick<Subcontract, "id" | "display_no">> {
  // Помощник: если пустая строка или чушь - шлем null, чтобы Postgres (date) не ругался
  const asDate = (val: unknown) => {
    if (!val || typeof val !== "string" || val.trim() === "") return null;
    return val.trim();
  };

  const payload = {
    p_created_by: userId,
    p_foreman_name: foremanName || null,
    p_contractor_org: patch.contractor_org ?? null,
    p_contractor_inn: patch.contractor_inn ?? null,
    p_contractor_rep: patch.contractor_rep ?? null,
    p_contractor_phone: patch.contractor_phone ?? null,
    p_contract_number: patch.contract_number ?? null,
    p_contract_date: asDate(patch.contract_date),
    p_object_name: patch.object_name ?? null,
    p_work_zone: patch.work_zone ?? null,
    p_work_type: patch.work_type ?? null,
    p_qty_planned: patch.qty_planned ?? null,
    p_uom: patch.uom ?? null,
    p_date_start: asDate(patch.date_start),
    p_date_end: asDate(patch.date_end),
    p_work_mode: patch.work_mode ?? null,
    p_price_per_unit: patch.price_per_unit ?? null,
    p_total_price: patch.total_price ?? null,
    p_price_type: patch.price_type ?? null,
    p_foreman_comment: patch.foreman_comment ?? null,
  };

  const parseRpcRow = (data: unknown): Pick<Subcontract, "id" | "display_no"> | null => {
    if (!data || typeof data !== "object") return null;
    const id = String((data as { id?: unknown }).id ?? "").trim();
    if (!id) return null;
    return {
      id,
      display_no: ((data as { display_no?: unknown }).display_no as string | null | undefined) ?? null,
    };
  };

  const payloadLegacy = { ...payload } as Record<string, unknown>;
  delete payloadLegacy.p_contractor_inn;

  // 1) New RPC signature (with p_contractor_inn).
  {
    const { data, error } = await supabase.rpc("subcontract_create_draft", payload as any);
    if (!error) {
      const row = parseRpcRow(data);
      if (row) return row;
      throw new Error("subcontract_create_draft returned invalid payload");
    }
  }

  // 2) Legacy RPC signature (without p_contractor_inn).
  {
    const { data, error } = await supabase.rpc("subcontract_create_draft", payloadLegacy as any);
    if (!error) {
      const row = parseRpcRow(data);
      if (row) return row;
      throw new Error("subcontract_create_draft returned invalid payload");
    }
  }

  // 3) Hard fallback: direct insert (for envs where RPC is absent).
  const insertPayloadBase: Record<string, unknown> = {
    created_by: userId,
    status: "draft",
    foreman_name: foremanName || null,
    contractor_org: patch.contractor_org ?? null,
    contractor_inn: patch.contractor_inn ?? null,
    contractor_rep: patch.contractor_rep ?? null,
    contractor_phone: patch.contractor_phone ?? null,
    contract_number: patch.contract_number ?? null,
    contract_date: asDate(patch.contract_date),
    object_name: patch.object_name ?? null,
    work_zone: patch.work_zone ?? null,
    work_type: patch.work_type ?? null,
    qty_planned: patch.qty_planned ?? null,
    uom: patch.uom ?? null,
    date_start: asDate(patch.date_start),
    date_end: asDate(patch.date_end),
    work_mode: patch.work_mode ?? null,
    price_per_unit: patch.price_per_unit ?? null,
    total_price: patch.total_price ?? null,
    price_type: patch.price_type ?? null,
    foreman_comment: patch.foreman_comment ?? null,
  };

  let ins = await supabase
    .from("subcontracts")
    .insert(insertPayloadBase as any)
    .select("id, display_no")
    .single();

  // Old schema fallback: table without contractor_inn column.
  if (ins.error && String(ins.error.message || "").toLowerCase().includes("contractor_inn")) {
    const retryPayload = { ...insertPayloadBase };
    delete retryPayload.contractor_inn;
    ins = await supabase
      .from("subcontracts")
      .insert(retryPayload as any)
      .select("id, display_no")
      .single();
  }

  if (ins.error) throw ins.error;
  const id = String((ins.data as { id?: unknown })?.id ?? "").trim();
  if (!id) throw new Error("subcontract draft create failed: no id");
  return {
    id,
    display_no: ((ins.data as { display_no?: unknown })?.display_no as string | null | undefined) ?? null,
  };
}

export async function updateSubcontract(id: string, patch: Partial<Subcontract>): Promise<void> {
  const { error } = await supabase.from("subcontracts").update(patch).eq("id", id);
  if (error) throw error;
}

export async function submitSubcontract(id: string): Promise<void> {
  const { error } = await supabase
    .from("subcontracts")
    .update({ status: "pending", submitted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "draft");
  if (error) throw error;
}

export async function approveSubcontract(id: string): Promise<void> {
  const { error } = await supabase
    .from("subcontracts")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending");
  if (error) throw error;
}

export async function rejectSubcontract(id: string, comment: string): Promise<void> {
  const { error } = await supabase
    .from("subcontracts")
    .update({
      status: "rejected",
      director_comment: comment.trim() || null,
      rejected_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending");
  if (error) throw error;
}

export async function listSubcontractItems(subcontractId: string): Promise<SubcontractItem[]> {
  const sid = String(subcontractId || "").trim();
  if (!sid) return [];
  const { data, error } = await supabase
    .from("subcontract_items")
    .select("*")
    .eq("subcontract_id", sid)
    .eq("status", "draft")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SubcontractItem[];
}

export async function appendSubcontractItems(
  subcontractId: string,
  createdBy: string | null,
  items: NewSubcontractItem[],
): Promise<SubcontractItem[]> {
  const sid = String(subcontractId || "").trim();
  if (!sid || !items.length) return [];
  const payload = items.map((it) => ({
    subcontract_id: sid,
    created_by: createdBy || null,
    source: it.source,
    rik_code: it.rik_code ?? null,
    name: String(it.name || "").trim() || "Позиция",
    qty: Number(it.qty) > 0 ? Number(it.qty) : 1,
    uom: it.uom ?? null,
    status: "draft",
  }));
  const { data, error } = await supabase
    .from("subcontract_items")
    .insert(payload)
    .select("*");
  if (error) throw error;
  return (data ?? []) as SubcontractItem[];
}

export async function removeSubcontractItem(itemId: string): Promise<void> {
  const iid = String(itemId || "").trim();
  if (!iid) return;
  const { error } = await supabase
    .from("subcontract_items")
    .delete()
    .eq("id", iid);
  if (error) throw error;
}

export async function clearSubcontractItems(subcontractId: string): Promise<void> {
  const sid = String(subcontractId || "").trim();
  if (!sid) return;
  const { error } = await supabase
    .from("subcontract_items")
    .delete()
    .eq("subcontract_id", sid);
  if (error) throw error;
}
