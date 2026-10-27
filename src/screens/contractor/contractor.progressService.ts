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

type WorkProgressLogInsert = {
  progress_id: string;
  qty: number;
  work_uom: string | null;
  stage_note: string | null;
  note: string | null;
};

type WorkProgressLogRow = {
  id?: string | null;
};

type WorkProgressLogMaterialInsert = {
  log_id: string;
  mat_code: string | null;
  uom_mat: string | null;
  qty_fact: number;
};

export type PersistWorkProgressResult =
  | { ok: true; logId: string }
  | { ok: false; stage: "log" | "materials"; error: unknown; logId?: string | null };

const trim = (value: unknown) => String(value ?? "").trim();

export const looksLikeWorkProgressUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export function buildWorkProgressMaterialsPayload(
  materials: WorkMaterialLike[],
): WorkProgressMaterialPayload[] {
  return (materials || [])
    .map((material) => {
      const raw = material.qty_fact ?? material.qty ?? 0;
      const fact = Number(String(raw).replace(",", "."));
      return {
        mat_code: material.mat_code ?? null,
        uom: material.uom ?? null,
        qty_fact: Number.isFinite(fact) ? fact : 0,
      };
    })
    .filter((material) => material.qty_fact > 0);
}

export function buildWorkProgressNote(location?: string | null, comment?: string | null): string | null {
  const noteParts = [location, comment]
    .map((value) => trim(value))
    .filter(Boolean);
  return noteParts.length ? noteParts.join(" • ") : null;
}

export async function createWorkProgressLogEntry(params: {
  supabaseClient: any;
  progressId: string;
  workUom: string | null;
  stageNote: string | null;
  note: string | null;
  qty: number;
}): Promise<PersistWorkProgressResult> {
  const { supabaseClient, progressId, workUom, stageNote, note, qty } = params;
  const safeProgressId = trim(progressId);
  if (!safeProgressId || !looksLikeWorkProgressUuid(safeProgressId)) {
    return { ok: false, stage: "log", error: new Error("Invalid progress_id") };
  }

  const { data: logRow, error: logErr } = await supabaseClient
    .from("work_progress_log")
    .insert({
      progress_id: safeProgressId,
      qty,
      work_uom: workUom || null,
      stage_note: trim(stageNote) || null,
      note,
    } satisfies WorkProgressLogInsert)
    .select("id")
    .single();

  if (logErr) {
    return { ok: false, stage: "log", error: logErr };
  }

  const logId = trim((logRow as WorkProgressLogRow | null)?.id);
  if (!logId) {
    return { ok: false, stage: "log", error: new Error("Missing logId after work progress insert") };
  }

  return { ok: true, logId };
}

export async function getExistingWorkProgressMaterialsCount(params: {
  supabaseClient: any;
  logId: string;
}): Promise<number> {
  const safeLogId = trim(params.logId);
  if (!safeLogId) return 0;

  const { data, error } = await params.supabaseClient
    .from("work_progress_log_materials")
    .select("log_id")
    .eq("log_id", safeLogId)
    .limit(1);

  if (error || !Array.isArray(data)) return 0;
  return data.length;
}

export async function persistWorkProgressMaterials(params: {
  supabaseClient: any;
  logId: string;
  materialsPayload: WorkProgressMaterialPayload[];
}): Promise<PersistWorkProgressResult> {
  const { supabaseClient, materialsPayload } = params;
  const safeLogId = trim(params.logId);
  if (!safeLogId) {
    return { ok: false, stage: "materials", error: new Error("Invalid log_id") };
  }

  if (!materialsPayload.length) {
    return { ok: true, logId: safeLogId };
  }

  const existingCount = await getExistingWorkProgressMaterialsCount({
    supabaseClient,
    logId: safeLogId,
  });
  if (existingCount > 0) {
    return { ok: true, logId: safeLogId };
  }

  const matsPayload: WorkProgressLogMaterialInsert[] = materialsPayload.map((material) => ({
    log_id: safeLogId,
    mat_code: material.mat_code,
    uom_mat: material.uom || null,
    qty_fact: material.qty_fact,
  }));

  const { error: matsErr } = await supabaseClient
    .from("work_progress_log_materials")
    .insert(matsPayload);

  if (matsErr) {
    return { ok: false, stage: "materials", error: matsErr, logId: safeLogId };
  }

  return { ok: true, logId: safeLogId };
}

export async function ensureWorkProgressSubmission(params: {
  supabaseClient: any;
  progressId: string;
  workUom: string | null;
  stageNote: string | null;
  note: string | null;
  qty: number;
  materialsPayload: WorkProgressMaterialPayload[];
  existingLogId?: string | null;
}): Promise<PersistWorkProgressResult> {
  const {
    supabaseClient,
    progressId,
    workUom,
    stageNote,
    note,
    qty,
    materialsPayload,
    existingLogId,
  } = params;

  const safeExistingLogId = trim(existingLogId);
  let logId = safeExistingLogId;

  if (!logId) {
    const logResult = await createWorkProgressLogEntry({
      supabaseClient,
      progressId,
      workUom,
      stageNote,
      note,
      qty,
    });
    if (!logResult.ok) {
      return logResult;
    }
    logId = logResult.logId;
  }

  return await persistWorkProgressMaterials({
    supabaseClient,
    logId,
    materialsPayload,
  });
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
  return await ensureWorkProgressSubmission({
    ...params,
    existingLogId: null,
  });
}
