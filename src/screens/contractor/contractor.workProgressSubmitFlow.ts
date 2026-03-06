import {
  buildWorkProgressMaterialsPayload,
  buildWorkProgressNote,
  persistWorkProgressSubmission,
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

  if (!workModalRow) return { ok: false };

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

  const materialsPayload = buildWorkProgressMaterialsPayload(workModalMaterials);
  const note = buildWorkProgressNote(workModalLocation, workModalComment);
  const submitResult = await persistWorkProgressSubmission({
    supabaseClient,
    progressId: workModalRow.progress_id,
    workUom: workModalRow.uom_id || null,
    stageNote: workModalStage || null,
    note,
    qty: 1,
    materialsPayload,
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
    alert: { title: "Готово", message: "Факт по работе сохранен." },
  };
}
