import {
  buildWorkProgressMaterialsPayload,
  buildWorkProgressNote,
  ensureWorkProgressSubmission,
} from "./contractor.progressService";
import type { WorkMaterialRow } from "../../components/WorkMaterialsEditor";
import type { ContractorWorkRow } from "./contractor.loadWorksService";

type WorkRowLike = ContractorWorkRow;

type JobHeaderLike = {
  object_name?: string | null;
};

export type SubmitWorkProgressFlowResult = {
  ok: boolean;
  alert?: { title: string; message: string };
  closeWorkModal?: boolean;
  reloadWorks?: boolean;
};

export function validateWorkProgressSubmitContext(params: {
  workModalRow: WorkRowLike | null;
  jobHeader: JobHeaderLike | null;
  pickFirstNonEmpty: (...vals: any[]) => string | null;
}):
  | { ok: true; resolvedObjectName: string; workModalRow: WorkRowLike }
  | { ok: false; alert: { title: string; message: string } } {
  const { workModalRow, jobHeader, pickFirstNonEmpty } = params;
  if (!workModalRow) {
    return {
      ok: false,
      alert: {
        title: "Нет данных",
        message: "Не удалось определить работу для сохранения факта.",
      },
    };
  }

  const resolvedObjectName =
    pickFirstNonEmpty(workModalRow?.object_name, jobHeader?.object_name) || "";
  if (!String(resolvedObjectName || "").trim()) {
    return {
      ok: false,
      alert: {
        title: "Нет объекта",
        message: "Не удалось определить объект для сохранения выполненных работ.",
      },
    };
  }

  return { ok: true, resolvedObjectName, workModalRow };
}

export async function submitWorkProgressFlow(params: {
  supabaseClient: any;
  workModalRow: WorkRowLike | null;
  jobHeader: JobHeaderLike | null;
  workModalMaterials: WorkMaterialRow[];
  workModalLocation: string;
  workModalComment: string;
  workModalStage: string;
  pickFirstNonEmpty: (...vals: any[]) => string | null;
  pickErr: (e: any) => string;
}): Promise<SubmitWorkProgressFlowResult> {
  const {
    supabaseClient,
    workModalRow,
    jobHeader,
    workModalMaterials,
    workModalLocation,
    workModalComment,
    workModalStage,
    pickFirstNonEmpty,
    pickErr,
  } = params;

  const validation = validateWorkProgressSubmitContext({
    workModalRow,
    jobHeader,
    pickFirstNonEmpty,
  });
  if (validation.ok === false) {
    return {
      ok: false,
      alert: validation.alert,
    };
  }

  const row = validation.workModalRow;
  const materialsPayload = buildWorkProgressMaterialsPayload(workModalMaterials);
  const note = buildWorkProgressNote(workModalLocation, workModalComment);
  const submitResult = await ensureWorkProgressSubmission({
    supabaseClient,
    progressId: row.progress_id,
    workUom: row.uom_id || null,
    stageNote: workModalStage || null,
    note,
    qty: 1,
    materialsPayload,
    existingLogId: null,
  });
  if (submitResult.ok === false) {
    if (submitResult.stage === "log") {
      return {
        ok: false,
        alert: { title: "Ошибка журнала", message: pickErr(submitResult.error) },
      };
    }
    if (submitResult.stage === "materials") {
      return {
        ok: false,
        alert: { title: "Ошибка материалов", message: pickErr(submitResult.error) },
      };
    }
  }

  return {
    ok: true,
    closeWorkModal: true,
    reloadWorks: true,
    alert: { title: "Готово", message: "Факт по работе сохранён." },
  };
}
