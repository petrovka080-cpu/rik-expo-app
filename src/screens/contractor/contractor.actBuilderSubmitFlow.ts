import { generateActPdf } from "./contractorPdf";
import {
  fetchRequestScopeRows,
  getProgressIdsForSubcontract,
  loadConsumedByCode,
  loadIssuedByCode,
} from "./contractor.data";
import {
  buildSelectedActBuilderPayload,
  collectActBuilderWarnings,
  type SelectedMaterialPayload,
  type SelectedWorkPayload,
} from "./contractor.submitHelpers";
import { persistActBuilderSubmission } from "./contractor.actSubmitService";
import type { ActBuilderItem, ActBuilderWorkItem } from "./types";
import type { ContractorWorkRow } from "./contractor.loadWorksService";
import type { WorkMaterialRow } from "../../components/WorkMaterialsEditor";

type WorkRowLike = ContractorWorkRow;

type JobHeaderLike = {
  contractor_org?: string | null;
  contractor_inn?: string | null;
  contractor_phone?: string | null;
  contract_number?: string | null;
  contract_date?: string | null;
  zone?: string | null;
  level_name?: string | null;
  work_type?: string | null;
  object_name?: string | null;
};

type AlertPayload = { title: string; message: string };

export type SubmitActBuilderFlowResult = {
  ok: boolean;
  actBuilderHint?: string;
  workModalHint?: string;
  alert?: AlertPayload;
  closeActBuilder?: boolean;
  reloadWorks?: boolean;
};

export async function submitActBuilderFlow(params: {
  supabaseClient: any;
  actBuilderLoadState: "init" | "loading" | "ready" | "error";
  actBuilderWorks: ActBuilderWorkItem[];
  actBuilderItems: ActBuilderItem[];
  actBuilderSelectedMatCount: number;
  workModalRow: WorkRowLike | null;
  jobHeader: JobHeaderLike | null;
  rows: WorkRowLike[];
  resolveContractorJobId: (row: WorkRowLike) => Promise<string>;
  resolveRequestId: (row: WorkRowLike) => Promise<string>;
  isRejectedOrCancelledRequestStatus: (status: string | null | undefined) => boolean;
  looksLikeUuid: (v: string) => boolean;
  pickFirstNonEmpty: (...vals: any[]) => string | null;
  buildActMetaNote: (selectedWorks: string[]) => string;
  pickErr: (e: any) => string;
  notify: (title: string, message: string) => void;
}): Promise<SubmitActBuilderFlowResult> {
  const {
    supabaseClient,
    actBuilderLoadState,
    actBuilderWorks,
    actBuilderItems,
    actBuilderSelectedMatCount,
    workModalRow,
    jobHeader,
    rows,
    resolveContractorJobId,
    resolveRequestId,
    isRejectedOrCancelledRequestStatus,
    looksLikeUuid,
    pickFirstNonEmpty,
    buildActMetaNote,
    pickErr,
    notify,
  } = params;

  if (!workModalRow) return { ok: false };
  if (actBuilderLoadState !== "ready") {
    return {
      ok: false,
      actBuilderHint: "Данные подряда не загружены",
      alert: { title: "Ошибка", message: "Данные подряда не загружены" },
    };
  }

  const { selectedWorks, selectedMaterials, invalidMaterial: invalidMat } =
    buildSelectedActBuilderPayload(actBuilderWorks, actBuilderItems);
  if (invalidMat) {
    return {
      ok: false,
      alert: {
        title: "Некорректный материал",
        message: `Проверьте заполнение цены и количества: "${invalidMat.name}"`,
      },
    };
  }
  if (selectedWorks.length === 0 && selectedMaterials.length === 0) {
    return {
      ok: false,
      actBuilderHint: "Выберите хотя бы одну работу или один материал для продолжения.",
      alert: { title: "Пустой акт", message: "Выберите хотя бы одну работу или один материал." },
    };
  }

  if (selectedMaterials.length > 0) {
    const jobId = await resolveContractorJobId(workModalRow);
    const reqIdForRow = await resolveRequestId(workModalRow);
    if (!looksLikeUuid(String(jobId || "")) && !looksLikeUuid(String(reqIdForRow || ""))) {
      return {
        ok: false,
        actBuilderHint: "Данные подряда не загружены",
        alert: { title: "Ошибка", message: "Данные подряда не готовы для проверки материалов." },
      };
    }
    const reqRows = await fetchRequestScopeRows(supabaseClient, jobId, reqIdForRow);
    const requestIds = reqRows
      .filter((r) => !isRejectedOrCancelledRequestStatus(r.status))
      .map((r) => r.id)
      .filter(Boolean);
    if (!requestIds.length) {
      return {
        ok: false,
        actBuilderHint: "Данные подряда не загружены",
        alert: { title: "Ошибка", message: "Не найдены заявки подряда для проверки материалов." },
      };
    }

    const issuedByCode = await loadIssuedByCode(supabaseClient, requestIds);
    const progressIdsForSubcontract = getProgressIdsForSubcontract(rows, jobId, workModalRow);
    const consumedByCode = await loadConsumedByCode(supabaseClient, progressIdsForSubcontract, {
      positiveOnly: false,
    });

    const exceeded = selectedMaterials.find((m) => {
      const code = String(m.mat_code || "").trim();
      const issued = Number(issuedByCode.get(code) || 0);
      const consumed = Number(consumedByCode.get(code) || 0);
      const availableNow = Math.max(0, issued - consumed);
      return Number(m.act_used_qty || 0) > availableNow;
    });
    if (exceeded) {
      const code = String(exceeded.mat_code || "").trim();
      const issued = Number(issuedByCode.get(code) || 0);
      const consumed = Number(consumedByCode.get(code) || 0);
      const availableNow = Math.max(0, issued - consumed);
      return {
        ok: false,
        actBuilderHint: `Превышено доступное количество по материалу "${exceeded.name}". Доступно: ${availableNow}.`,
        alert: {
          title: "Недостаточно материалов",
          message: `Материал "${exceeded.name}": доступно ${availableNow}, а в акте указано ${Number(
            exceeded.act_used_qty || 0
          )}.`,
        },
      };
    }
  }

  const warnings = collectActBuilderWarnings(
    selectedWorks as SelectedWorkPayload[],
    selectedMaterials as SelectedMaterialPayload[]
  );
  if (warnings.length > 0) {
    const uniq = Array.from(new Set(warnings));
    const preview = uniq.slice(0, 6).join("\n• ");
    const tail = uniq.length > 6 ? `\n• ...и еще ${uniq.length - 6}` : "";
    notify("Предупреждения", `Есть незаполненные поля:\n• ${preview}${tail}`);
  }

  if (actBuilderSelectedMatCount > 0 && selectedMaterials.length === 0) {
    if (__DEV__) console.error("CRITICAL: UI shows selected materials but payload is empty!", {
      actBuilderSelectedMatCount,
      actBuilderItemsCount: actBuilderItems.length,
    });
    return {
      ok: false,
      actBuilderHint: "Ошибка в данных: в UI есть выбранные материалы, но payload пуст.",
      alert: {
        title: "Критическая ошибка",
        message: "Потеряны выбранные материалы в payload. Повторите действие.",
      },
    };
  }

  const resolvedObj = pickFirstNonEmpty(workModalRow?.object_name, jobHeader?.object_name) || "";
  if (!String(resolvedObj || "").trim()) {
    return {
      ok: false,
      actBuilderHint: "Недостаточно данных: не найден объект работ.",
      alert: { title: "Нет объекта", message: "Не удалось определить объект для формирования акта." },
    };
  }

  try {
    const pdfMaterials: WorkMaterialRow[] = selectedMaterials.map((m) => ({
      material_id: m.material_id || null,
      mat_code: m.mat_code,
      name: m.name,
      uom: m.unit,
      qty: Number(m.act_used_qty || 0),
      qty_fact: Number(m.act_used_qty || 0),
      price: m.price,
    }));
    const pdfWork = {
      progress_id: String(workModalRow.progress_id || ""),
      work_code: workModalRow.work_code ?? null,
      work_name: workModalRow.work_name ?? null,
      object_name: resolvedObj,
    };
    await generateActPdf({
      mode: "normal",
      work: pdfWork,
      materials: pdfMaterials,
      selectedWorks,
      contractorName: jobHeader?.contractor_org,
      contractorInn: jobHeader?.contractor_inn,
      contractorPhone: jobHeader?.contractor_phone,
      customerName: resolvedObj,
      customerInn: null,
      contractNumber: jobHeader?.contract_number,
      contractDate: jobHeader?.contract_date,
      zoneText: `${jobHeader?.zone || "—"} / ${jobHeader?.level_name || "—"}`,
      mainWorkName: jobHeader?.work_type || workModalRow.work_name || workModalRow.work_code,
      actNumber: workModalRow.progress_id?.slice?.(0, 8),
    });

    const persistResult = await persistActBuilderSubmission({
      supabaseClient,
      workModalRow,
      selectedWorks,
      selectedMaterials,
      buildActMetaNote,
    });

    if (!persistResult.logSaved) {
      if (__DEV__) console.warn("[submitActBuilder] log save failed:", persistResult.logError);
      return {
        ok: true,
        closeActBuilder: true,
        reloadWorks: true,
        workModalHint: "PDF сформирован, но запись в журнал не сохранилась.",
        alert: { title: "Частичный успех", message: "Журнал не сохранен (ошибка БД), но PDF уже сформирован." },
      };
    }
    if (!persistResult.materialsSaved) {
      if (__DEV__) console.warn("[submitActBuilder] materials save failed:", persistResult.materialsError);
      return {
        ok: true,
        closeActBuilder: true,
        reloadWorks: true,
        workModalHint: "Акт успешно сформирован. Проверьте результат в истории и в PDF.",
        alert: { title: "Ошибка материалов", message: "Материалы не сохранились в БД. PDF уже сформирован." },
      };
    }

    return {
      ok: true,
      closeActBuilder: true,
      reloadWorks: true,
      workModalHint: "Акт успешно сформирован. Проверьте результат в истории и в PDF.",
      alert: { title: "Готово", message: "Акт успешно сформирован. Проверьте результат в истории." },
    };
  } catch (e) {
    return {
      ok: false,
      actBuilderHint: `Ошибка формирования акта: ${pickErr(e)}`,
      alert: { title: "Ошибка", message: pickErr(e) },
    };
  }
}
