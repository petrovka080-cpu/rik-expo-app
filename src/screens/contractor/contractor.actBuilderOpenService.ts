import { fetchRequestScopeRows } from "./contractor.data";
import type { WorkMaterialRow } from "../../components/WorkMaterialsEditor";
import type { ContractorWorkRow } from "./contractor.loadWorksService";

type WorkRowLike = Pick<ContractorWorkRow, "work_code">;

type RequestScopeRow = {
  id: string;
  status: string | null;
};

type DefaultMaterialRow = {
  mat_code: string | null;
  uom: string | null;
};

type CatalogItemRow = {
  rik_code: string | null;
  name_human_ru: string | null;
  name_human: string | null;
  uom_code: string | null;
};

type Params = {
  supabaseClient: any;
  row: WorkRowLike;
  currentMaterials: WorkMaterialRow[];
  looksLikeUuid: (value: string) => boolean;
  resolveContractorJobId: (row: WorkRowLike) => Promise<string>;
  resolveRequestId: (row: WorkRowLike) => Promise<string>;
  isRejectedOrCancelledRequestStatus: (status: string | null | undefined) => boolean;
};

export async function ensureActBuilderWorkMaterials(params: Params): Promise<{
  materials: WorkMaterialRow[];
  fatalError: string | null;
}> {
  const {
    supabaseClient,
    row,
    currentMaterials,
    looksLikeUuid,
    resolveContractorJobId,
    resolveRequestId,
    isRejectedOrCancelledRequestStatus,
  } = params;

  const hasMaterials = Array.isArray(currentMaterials) && currentMaterials.length > 0;
  const workCode = String(row?.work_code || "").trim();
  if (hasMaterials || !workCode) {
    return { materials: currentMaterials || [], fatalError: null };
  }

  try {
    const jobId = await resolveContractorJobId(row);
    const reqIdForRow = await resolveRequestId(row);
    if (!looksLikeUuid(String(jobId || "")) && !looksLikeUuid(String(reqIdForRow || ""))) {
      return { materials: currentMaterials || [], fatalError: "Данные подряда не готовы для загрузки материалов." };
    }

    const reqRows = (await fetchRequestScopeRows(
      supabaseClient,
      jobId,
      reqIdForRow
    )) as RequestScopeRow[];
    const hasAllowedRequests = reqRows.some((r) => !isRejectedOrCancelledRequestStatus(r.status));
    if (!hasAllowedRequests) {
      return { materials: [], fatalError: null };
    }

    const q1 = await supabaseClient
      .from("work_default_materials")
      .select("mat_code, uom")
      .eq("work_code", workCode)
      .limit(100);
    const defaults: DefaultMaterialRow[] = !q1.error && Array.isArray(q1.data) ? q1.data : [];
    if (!defaults.length) {
      return { materials: currentMaterials || [], fatalError: null };
    }

    const codes = defaults.map((d) => String(d.mat_code || "").trim()).filter(Boolean);
    const namesMap: Record<string, { name: string; uom: string | null }> = {};
    if (codes.length) {
      const ci = await supabaseClient
        .from("catalog_items")
        .select("rik_code, name_human_ru, name_human, uom_code")
        .in("rik_code", codes);
      if (!ci.error && Array.isArray(ci.data)) {
        for (const n of ci.data as CatalogItemRow[]) {
          const code = String(n.rik_code || "").trim();
          if (!code) continue;
          namesMap[code] = {
            name: String(n.name_human_ru || n.name_human || code),
            uom: n.uom_code == null ? null : String(n.uom_code),
          };
        }
      }
    }

    const materials = defaults.map((d) => {
      const code = String(d.mat_code || "").trim();
      const meta = namesMap[code];
      return {
        mat_code: code,
        name: meta?.name || code || "Материал",
        uom: meta?.uom || String(d.uom || ""),
        available: 0,
        qty_fact: 0,
      } as WorkMaterialRow;
    });
    return { materials, fatalError: null };
  } catch (e) {
    console.warn("[ensureActBuilderWorkMaterials] fallback failed:", e);
    return { materials: currentMaterials || [], fatalError: null };
  }
}
