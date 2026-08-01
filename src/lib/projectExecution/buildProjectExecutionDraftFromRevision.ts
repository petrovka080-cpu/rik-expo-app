import { estimateDeterministicHash } from "../estimate/estimateDeterministicHash";
import type { EstimateDraftRevision, ProfessionalBoqRow } from "../estimate/estimateDraftRevisionContract";
import type {
  ProcurementItem,
  ProjectExecutionDraft,
  ProjectExecutionDraftOptions,
  ProjectTask,
} from "./projectExecutionTypes";

function stableId(prefix: string, value: unknown): string {
  return `${prefix}_${estimateDeterministicHash(value)}`;
}

function sourceLabel(row: ProfessionalBoqRow): string {
  return row.normSourceTitle ?? row.sourceLabel ?? "Строка сметы";
}

function taskRole(row: ProfessionalBoqRow): ProjectTask["roleHint"] {
  return row.rowType === "equipment" || row.rowType === "transport" ? "procurement" : "worker";
}

function buildTask(row: ProfessionalBoqRow, packageId: string, sourceHash: string): ProjectTask {
  return {
    id: stableId("project_task", { sourceHash, rowId: row.rowId }),
    packageId,
    title: row.titleRu,
    description: `${row.quantity} ${row.unitLabel ?? row.unit}`,
    quantity: row.quantity,
    unit: row.unitLabel ?? row.unit,
    status: "todo",
    sourceRowId: row.rowId,
    visibleSourceLabel: sourceLabel(row),
    formulaId: row.formulaId,
    quantityFormula: row.quantityFormula,
    calculationTrace: row.calculationTrace,
    sourceParameters: row.sourceParameters,
    templateId: row.templateId,
    templateVersion: row.templateVersion,
    normId: row.normId,
    normFamilyId: row.normFamilyId,
    normSourceId: row.normSourceId,
    normSourceTitle: row.normSourceTitle,
    normVersion: row.normVersion,
    normReviewStatus: row.normReviewStatus,
    roleHint: taskRole(row),
  };
}

function buildProcurementItem(row: ProfessionalBoqRow, sourceHash: string): ProcurementItem {
  return {
    id: stableId("procurement_item", { sourceHash, rowId: row.rowId }),
    sourceEstimateRowId: row.rowId,
    materialVisibleName: row.titleRu,
    quantity: row.quantity,
    unit: row.unitLabel ?? row.unit,
    catalogSearchQuery: row.titleRu,
    priceStatus: "price_required",
    confidence: "medium",
    notes: "Цена и поставщик уточняются перед закупкой; техническая эквивалентность проверяется по спецификации.",
    unitPrice: row.unitPrice,
    amount: null,
    currency: row.currency,
    selectedPriceSource: null,
    priceCandidates: [],
    missingPrice: true,
    costConfidence: "missing",
    formulaId: row.formulaId,
    quantityFormula: row.quantityFormula,
    calculationTrace: row.calculationTrace,
    sourceParameters: row.sourceParameters,
    templateId: row.templateId,
    templateVersion: row.templateVersion,
    normId: row.normId,
    normFamilyId: row.normFamilyId,
    normSourceId: row.normSourceId,
    normSourceTitle: row.normSourceTitle,
    normVersion: row.normVersion,
    normReviewStatus: row.normReviewStatus,
  };
}

export function buildProjectExecutionDraftFromRevision(
  revision: EstimateDraftRevision,
  options: ProjectExecutionDraftOptions,
): ProjectExecutionDraft {
  const rows = revision.boq.rows;
  const rowSignature = rows.map((row) => ({
    rowId: row.rowId,
    rowType: row.rowType,
    quantity: row.quantity,
    unit: row.unit,
    includedInProcurement: row.includedInProcurement,
  }));
  const sourcePayloadHash = estimateDeterministicHash({
    selectedTemplateId: revision.selectedTemplateId,
    revisionId: revision.revisionId,
    rows: rowSignature,
  });
  const projectTitle = "Проект: Устройство асфальтобетонного дорожного покрытия";
  const packageId = stableId("project_work_package", { sourcePayloadHash, revisionId: revision.revisionId });
  const tasks = rows
    .filter((row) => row.rowType !== "material")
    .map((row) => buildTask(row, packageId, sourcePayloadHash));
  const procurementItems = rows
    .filter((row) => row.includedInProcurement)
    .map((row) => buildProcurementItem(row, sourcePayloadHash));
  const workPackages = [{
    id: packageId,
    title: "Устройство асфальтобетонного дорожного покрытия",
    customerVisibleTitle: "Устройство асфальтобетонного дорожного покрытия",
    description: "Выполнение подтверждённого состава работ из текущей ревизии сметы.",
    sourceEstimateId: revision.estimateDraftId,
    sourceRowIds: rows.map((row) => row.rowId),
    checklist: [{
      id: stableId("project_checklist", { sourcePayloadHash, kind: "road_engineer_review" }),
      title: "Проверка проекта, ППР, цен и готовности к производству дорожным инженером",
      visibleSourceLabel: "Текущая ревизия сметы",
      kind: "quality_gate" as const,
    }],
  }];
  const result: ProjectExecutionDraft = {
    projectId: options.projectId ?? stableId("project_execution", { sourcePayloadHash, source: options.source }),
    sourceEstimateId: revision.estimateDraftId,
    sourceRequestId: options.sourceRequestId,
    sourcePayloadHash,
    projectTitle,
    customerVisibleTitle: "Устройство асфальтобетонного дорожного покрытия",
    workPackages,
    tasks,
    procurementItems,
    handoffSummary: {
      sourceEstimateTitle: "Устройство асфальтобетонного дорожного покрытия",
      workPackageCount: workPackages.length,
      taskCount: tasks.length,
      procurementItemCount: procurementItems.length,
      checklistCount: 1,
      foremanHandoffFingerprint: estimateDeterministicHash({ sourcePayloadHash, tasks, procurementItems }),
      customerProposalFingerprint: estimateDeterministicHash({ sourcePayloadHash, rows: rowSignature }),
      visibleWarnings: ["Цены не заполнены; итог не рассчитан. Требуется проверка дорожным инженером."],
    },
    totals: {},
    metadata: {
      source: options.source,
      createdAt: options.generatedAt,
      language: "ru",
      countryCode: options.countryCode,
      cityOrRegion: options.cityOrRegion,
    },
  };
  if (revision.matchedFamily !== "asphalt_concrete_pavement") {
    const visibleTitle =
      revision.boq.sections.find((section) => section.rowIds.length > 0)?.title?.trim()
      || revision.boq.rows[0]?.titleRu?.trim()
      || "Профессиональная смета";
    result.projectTitle = `Проект: ${visibleTitle}`;
    result.customerVisibleTitle = visibleTitle;
    result.workPackages[0].title = visibleTitle;
    result.workPackages[0].customerVisibleTitle = visibleTitle;
    result.workPackages[0].description =
      "Выполнение подтверждённого состава работ из текущей ревизии сметы.";
    result.workPackages[0].checklist[0].title =
      "Проверка объёма, цен и готовности к производству ответственным специалистом";
    result.workPackages[0].checklist[0].visibleSourceLabel =
      "Текущая ревизия сметы";
    result.handoffSummary.sourceEstimateTitle = visibleTitle;
    result.handoffSummary.visibleWarnings = [
      "Цены и поставщики уточняются перед закупкой; требуется профессиональная проверка.",
    ];
  }
  return result;
}
