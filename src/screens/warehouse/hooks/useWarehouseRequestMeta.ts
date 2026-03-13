import type { SupabaseClient } from "@supabase/supabase-js";

type WarehouseRequestMeta = {
  note: string | null;
  comment: string | null;
  contractor_name: string | null;
  contractor_phone: string | null;
  planned_volume: string | null;
};

function normalizePhone(raw: unknown): string {
  const src = String(raw ?? "").trim();
  if (!src) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(src)) return "";
  if (/^\d{4}[./]\d{2}[./]\d{2}$/.test(src)) return "";
  const match = src.match(/(\+?\d[\d\s()\-]{7,}\d)/);
  if (!match) return "";
  const candidate = String(match[1] || "").trim();
  const digits = candidate.replace(/[^\d]/g, "");
  if (digits.length < 9) return "";
  return candidate.replace(/\s+/g, "");
}

export async function fetchWarehouseRequestMeta(
  supabase: SupabaseClient,
  requestId: string,
): Promise<WarehouseRequestMeta | null> {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (error || !data) return null;

  const meta = data as Record<string, unknown>;
  const contractor =
    String(
      meta.contractor_name ??
        meta.contractor_org ??
        meta.subcontractor_name ??
        meta.subcontractor_org ??
        "",
    ).trim() || null;
  const phone =
    normalizePhone(
      meta.contractor_phone ??
        meta.subcontractor_phone ??
        meta.phone_number ??
        meta.phone ??
        meta.tel ??
        "",
    ) || null;
  const volume =
    String(
      meta.planned_volume ??
        meta.qty_planned ??
        meta.planned_qty ??
        meta.volume ??
        meta.qty_plan ??
        "",
    ).trim() || null;

  return {
    note: (meta.note as string | null) ?? null,
    comment: (meta.comment as string | null) ?? null,
    contractor_name: contractor,
    contractor_phone: phone,
    planned_volume: volume,
  };
}
