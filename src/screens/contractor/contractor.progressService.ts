type WorkMaterialLike = {
  qty_fact?: number | null;
  qty?: number | null;
  mat_code?: string | null;
  uom?: string | null;
};

export type WorkProgressMaterialPayload = {
  mat_code: string | null;
  uom: string | null;
  qty_fact: number;
};

export type PersistWorkProgressResult =
  | { ok: true; logId: string }
  | { ok: false; stage: "log" | "materials"; error: any };

const looksLikeUuid = (v: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export function buildWorkProgressMaterialsPayload(
  materials: WorkMaterialLike[]
): WorkProgressMaterialPayload[] {
  return (materials || [])
    .map((m) => {
      const raw = m.qty_fact ?? m.qty ?? 0;
      const fact = Number(String(raw).replace(",", "."));
      return {
        mat_code: m.mat_code ?? null,
        uom: m.uom ?? null,
        qty_fact: Number.isFinite(fact) ? fact : 0,
      };
    })
    .filter((m) => m.qty_fact > 0);
}

export function buildWorkProgressNote(location?: string | null, comment?: string | null): string | null {
  const noteParts = [location, comment]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  return noteParts.length ? noteParts.join(" · ") : null;
}

export async function persistWorkProgressSubmission(params: {
  supabaseClient: any;
  progressId: string;
  workUom: string | null;
  stageNote: string | null;
  note: string | null;
  qty: number;
  materialsPayload: WorkProgressMaterialPayload[];
}): Promise<PersistWorkProgressResult> {
  const {
    supabaseClient,
    progressId,
    workUom,
    stageNote,
    note,
    qty,
    materialsPayload,
  } = params;
  const safeProgressId = String(progressId || "").trim();
  if (!safeProgressId || !looksLikeUuid(safeProgressId)) {
    return { ok: false, stage: "log", error: new Error("Invalid progress_id") };
  }

  const { data: logRow, error: logErr } = await supabaseClient
    .from("work_progress_log" as any)
    .insert({
      progress_id: safeProgressId,
      qty,
      work_uom: workUom || null,
      stage_note: stageNote || null,
      note,
    } as any)
    .select("id")
    .single();

  if (logErr) {
    return { ok: false, stage: "log", error: logErr };
  }

  const logId = String((logRow as any)?.id || "").trim();
  if (!logId || materialsPayload.length === 0) {
    return { ok: true, logId };
  }

  const matsPayload = materialsPayload.map((m) => ({
    log_id: logId,
    mat_code: m.mat_code,
    uom_mat: m.uom || null,
    qty_fact: m.qty_fact,
  }));

  const { error: matsErr } = await supabaseClient
    .from("work_progress_log_materials" as any)
    .insert(matsPayload as any);

  if (matsErr) {
    return { ok: false, stage: "materials", error: matsErr };
  }

  return { ok: true, logId };
}
