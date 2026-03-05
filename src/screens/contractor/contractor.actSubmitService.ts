import type { SelectedMaterialPayload, SelectedWorkPayload } from "./contractor.submitHelpers";

type WorkRowLike = {
  progress_id: string;
  uom_id?: string | null;
};

const looksLikeUuid = (v: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export type PersistActResult = {
  logSaved: boolean;
  materialsSaved: boolean;
  logError: any | null;
  materialsError: any | null;
};

export async function persistActBuilderSubmission(params: {
  supabaseClient: any;
  workModalRow: WorkRowLike;
  selectedWorks: SelectedWorkPayload[];
  selectedMaterials: SelectedMaterialPayload[];
  buildActMetaNote: (selectedWorks: string[]) => string;
}): Promise<PersistActResult> {
  const { supabaseClient, workModalRow, selectedWorks, selectedMaterials, buildActMetaNote } = params;
  const progressId = String(workModalRow.progress_id || "").trim();
  if (!progressId || !looksLikeUuid(progressId)) {
    return {
      logSaved: false,
      materialsSaved: false,
      logError: new Error("Invalid progress_id"),
      materialsError: null,
    };
  }

  const { data: logRow, error: logErr } = await supabaseClient
    .from("work_progress_log" as any)
    .insert({
      progress_id: progressId,
      qty: 1,
      work_uom: workModalRow.uom_id || null,
      stage_note: null,
      note: buildActMetaNote(selectedWorks.map((w) => w.name)),
    } as any)
    .select("id")
    .single();

  if (logErr) {
    return {
      logSaved: false,
      materialsSaved: false,
      logError: logErr,
      materialsError: null,
    };
  }

  const logId = String((logRow as any)?.id || "").trim();
  if (!logId || selectedMaterials.length === 0) {
    return {
      logSaved: true,
      materialsSaved: true,
      logError: null,
      materialsError: null,
    };
  }

  const matsPayload = selectedMaterials.map((m) => ({
    log_id: logId,
    mat_code: m.mat_code,
    uom_mat: m.unit || null,
    qty_fact: m.act_used_qty,
  }));
  const { error: matsErr } = await supabaseClient
    .from("work_progress_log_materials" as any)
    .insert(matsPayload as any);

  return {
    logSaved: true,
    materialsSaved: !matsErr,
    logError: null,
    materialsError: matsErr || null,
  };
}
