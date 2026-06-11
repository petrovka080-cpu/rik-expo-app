import {
  buildStructuredEstimateCatalogBinding,
  stableStructuredEstimateHash,
  type StructuredEstimatePayload,
  type StructuredEstimateRow,
} from "../estimateStructuredPipeline";
import {
  assertVisibleEstimateLabel,
  toVisibleEstimateLabel,
} from "../estimatePresentation/visibleEstimateLabelPolicy";
import { normalizeRuText } from "../text/encoding";
import type {
  ProcurementConfidence,
  ProcurementItem,
  ProjectChecklistItem,
  ProjectExecutionBindingPayloads,
  ProjectExecutionDraft,
  ProjectExecutionDraftOptions,
  ProjectExecutionExportViewModel,
  ProjectTask,
  ProjectTaskRoleHint,
  ProjectWorkPackage,
} from "./projectExecutionTypes";

const RU = {
  projectPrefix: "\u041f\u0440\u043e\u0435\u043a\u0442: ",
  executionPackage: "\u0412\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0438\u0435 \u0440\u0430\u0431\u043e\u0442",
  sourceLabel: "\u0421\u0442\u0440\u043e\u043a\u0430 \u0441\u043c\u0435\u0442\u044b",
  qualityReady:
    "\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u0433\u043e\u0442\u043e\u0432\u043d\u043e\u0441\u0442\u0438 \u043a \u0441\u0434\u0430\u0447\u0435",
  procurementPriceRequired:
    "\u0426\u0435\u043d\u0430 \u0438 \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a \u0443\u0442\u043e\u0447\u043d\u044f\u044e\u0442\u0441\u044f \u043f\u0435\u0440\u0435\u0434 \u0437\u0430\u043a\u0443\u043f\u043a\u043e\u0439",
  catalogPriceKnown:
    "\u0415\u0441\u0442\u044c \u0441\u0432\u044f\u0437\u044c \u0441 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u043e\u043c",
  estimateSection: "\u0421\u043c\u0435\u0442\u0430",
  materialsSection: "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b",
  stagesSection: "\u042d\u0442\u0430\u043f\u044b \u0440\u0430\u0431\u043e\u0442",
  procurementSection: "\u0421\u043f\u0438\u0441\u043e\u043a \u0437\u0430\u043a\u0443\u043f\u043a\u0438",
} as const;

const CONTROL_OR_WARNING_PATTERNS: readonly RegExp[] = [
  /\bwarning\b/i,
  /\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c\s+\u0441\u043c\u0435\u0442\u043d/i,
  /\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c\s+\u043a\u0430\u0447\u0435\u0441\u0442\u0432\u0430/i,
  /\u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430\s+\u0433\u0435\u0440\u043c\u0435\u0442\u0438\u0447\u043d\u043e\u0441\u0442\u0438/i,
  /\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c\s+\u043f\u0440\u043e\u0442\u0435\u0447\u0435\u043a/i,
  /\u0438\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d(?:\u0430\u044f|\u0443\u044e)\s+\u0444\u0438\u043a\u0441\u0430\u0446/i,
  /\u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430\s+\u0433\u043e\u0442\u043e\u0432\u043d\u043e\u0441\u0442/i,
];

const VISIBLE_UNIT_LABELS: Record<string, string> = {
  linear_m: "\u043f\u043e\u0433. \u043c",
  linear_ft: "\u043f\u043e\u0433. \u0444\u0443\u0442",
  m: "\u043f\u043e\u0433. \u043c",
  sq_m: "\u043c\u00b2",
  sq_ft: "\u043a\u0432. \u0444\u0443\u0442",
  m2: "\u043c\u00b2",
  sqm: "\u043c\u00b2",
  m3: "\u043c\u00b3",
  cubic_m: "\u043c\u00b3",
  cu_ft: "\u043a\u0443\u0431. \u0444\u0443\u0442",
  pcs: "\u0448\u0442",
  pc: "\u0448\u0442",
  set: "\u043a\u043e\u043c\u043f\u043b.",
  kg: "\u043a\u0433",
  ton: "\u0442",
};

function cleanText(value: string): string {
  return normalizeRuText(value).replace(/\s+/g, " ").trim();
}

function visibleUnit(unit?: string | null): string {
  const normalized = cleanText(String(unit ?? ""));
  if (!normalized) return "";
  return VISIBLE_UNIT_LABELS[normalized] ?? VISIBLE_UNIT_LABELS[normalized.toLocaleLowerCase("ru-RU")] ?? normalized;
}

function visibleTitle(payload: StructuredEstimatePayload): string {
  const label = toVisibleEstimateLabel({
    label: payload.selectedWork?.selectedTitleRu ?? payload.workTitle,
    domainKey: payload.workCategory,
    objectKey: payload.workKey,
    sectionType: "labor",
  });
  assertVisibleEstimateLabel(label, "project_execution_title");
  return cleanText(label);
}

function visibleRowLabel(row: StructuredEstimateRow): string {
  const label = toVisibleEstimateLabel({
    label: row.visibleName,
    materialKey: row.materialKey,
    domainKey: row.sectionType === "materials" ? undefined : row.sectionType,
    sectionType: row.sectionType,
  });
  assertVisibleEstimateLabel(label, `project_execution_row:${row.rowId}`);
  return cleanText(label);
}

function sourcePayloadHash(payload: StructuredEstimatePayload): string {
  return stableStructuredEstimateHash({
    version: payload.version,
    estimateId: payload.estimateId,
    fingerprint: payload.fingerprint,
    selectedWorkKey: payload.selectedWork?.selectedWorkKey,
    rows: payload.rows.map((row) => ({
      rowId: row.rowId,
      sectionType: row.sectionType,
      visibleName: row.visibleName,
      quantity: row.quantity,
      unit: row.unit,
    })),
  });
}

function stableId(prefix: string, seed: unknown): string {
  return `${prefix}_${stableStructuredEstimateHash(seed)}`;
}

function isControlOrWarningRow(row: StructuredEstimateRow): boolean {
  const text = cleanText([row.visibleName, row.code, row.rowId].filter(Boolean).join(" "));
  return CONTROL_OR_WARNING_PATTERNS.some((pattern) => pattern.test(text));
}

function defaultSourceLabel(row?: StructuredEstimateRow): string {
  const label = cleanText(row?.visibleSourceLabel ?? "");
  return label || RU.sourceLabel;
}

function buildChecklist(input: {
  packageId: string;
  payload: StructuredEstimatePayload;
  controlRows: StructuredEstimateRow[];
}): ProjectChecklistItem[] {
  const fromControlRows = input.controlRows.map((row): ProjectChecklistItem => ({
    id: stableId("project_checklist", {
      packageId: input.packageId,
      rowId: row.rowId,
      title: visibleRowLabel(row),
    }),
    title: visibleRowLabel(row),
    sourceRowId: row.rowId,
    visibleSourceLabel: defaultSourceLabel(row),
    kind: "quality_gate",
  }));
  const defaultGate: ProjectChecklistItem = {
    id: stableId("project_checklist", {
      packageId: input.packageId,
      sourcePayloadHash: input.payload.fingerprint,
      title: RU.qualityReady,
    }),
    title: RU.qualityReady,
    visibleSourceLabel: RU.sourceLabel,
    kind: "quality_gate",
  };
  return [...fromControlRows, defaultGate];
}

function roleHintFor(row: StructuredEstimateRow): ProjectTaskRoleHint {
  if (row.sectionType === "delivery" || row.sectionType === "equipment") return "procurement";
  return "worker";
}

function buildWorkPackage(input: {
  payload: StructuredEstimatePayload;
  hash: string;
  title: string;
  controlRows: StructuredEstimateRow[];
}): ProjectWorkPackage {
  const packageId = stableId("project_work_package", {
    sourcePayloadHash: input.hash,
    estimateId: input.payload.estimateId,
    selectedWorkKey: input.payload.selectedWork?.selectedWorkKey,
    title: input.title,
  });
  return {
    id: packageId,
    title: input.title,
    customerVisibleTitle: input.title,
    description: `${RU.executionPackage}: ${input.title}`,
    sourceEstimateId: input.payload.estimateId,
    sourceRowIds: input.payload.rows.map((row) => row.rowId),
    checklist: buildChecklist({ packageId, payload: input.payload, controlRows: input.controlRows }),
  };
}

function buildTasks(input: {
  payload: StructuredEstimatePayload;
  packageId: string;
  hash: string;
}): ProjectTask[] {
  const taskRows = input.payload.rows.filter((row) =>
    row.sectionType !== "materials" &&
    row.sectionType !== "tax" &&
    !isControlOrWarningRow(row),
  );
  return taskRows.map((row): ProjectTask => {
    const title = visibleRowLabel(row);
    const unit = visibleUnit(row.unit);
    return {
      id: stableId("project_task", {
        sourcePayloadHash: input.hash,
        packageId: input.packageId,
        rowId: row.rowId,
        title,
      }),
      packageId: input.packageId,
      title,
      description: row.displayQuantity ? `${row.displayQuantity} ${unit}`.trim() : undefined,
      quantity: row.quantity,
      unit,
      status: "todo",
      sourceRowId: row.rowId,
      visibleSourceLabel: defaultSourceLabel(row),
      roleHint: roleHintFor(row),
    };
  });
}

function confidenceFor(row: StructuredEstimateRow): ProcurementConfidence {
  if (row.catalogItemId) return "high";
  return row.confidence;
}

function buildProcurementItems(payload: StructuredEstimatePayload, hash: string): ProcurementItem[] {
  const catalogBinding = buildStructuredEstimateCatalogBinding(payload);
  const searchByRowId = new Map(catalogBinding.rows.map((row) => [row.rowId, row.searchQuery]));
  return payload.rows
    .filter((row) => row.sectionType === "materials" && !isControlOrWarningRow(row))
    .map((row): ProcurementItem => {
      const materialVisibleName = visibleRowLabel(row);
      const catalogSearchQuery = cleanText(searchByRowId.get(row.rowId) ?? materialVisibleName);
      const unit = visibleUnit(row.unit);
      assertVisibleEstimateLabel(catalogSearchQuery, `project_execution_catalog_query:${row.rowId}`);
      return {
        id: stableId("procurement_item", {
          sourcePayloadHash: hash,
          rowId: row.rowId,
          materialVisibleName,
          quantity: row.quantity,
          unit: row.unit,
        }),
        sourceEstimateRowId: row.rowId,
        materialVisibleName,
        quantity: row.quantity,
        unit,
        catalogSearchQuery,
        catalogItemId: row.catalogItemId ?? undefined,
        priceStatus: row.catalogItemId ? "known_catalog_price" : "price_required",
        confidence: confidenceFor(row),
        notes: row.catalogItemId ? RU.catalogPriceKnown : RU.procurementPriceRequired,
      };
    });
}

function payloadFingerprint(value: unknown): string {
  return stableStructuredEstimateHash(value);
}

function buildSummary(input: {
  payload: StructuredEstimatePayload;
  draftBasis: Pick<ProjectExecutionDraft, "sourcePayloadHash" | "workPackages" | "tasks" | "procurementItems">;
  title: string;
}): ProjectExecutionDraft["handoffSummary"] {
  const foremanHandoffFingerprint = payloadFingerprint({
    sourcePayloadHash: input.draftBasis.sourcePayloadHash,
    workPackages: input.draftBasis.workPackages.map((workPackage) => ({
      id: workPackage.id,
      title: workPackage.title,
      checklist: workPackage.checklist.map((item) => item.title),
    })),
    tasks: input.draftBasis.tasks.map((task) => ({ id: task.id, title: task.title })),
    procurementItems: input.draftBasis.procurementItems.map((item) => ({
      id: item.id,
      materialVisibleName: item.materialVisibleName,
      quantity: item.quantity,
      unit: item.unit,
    })),
  });
  const customerProposalFingerprint = payloadFingerprint({
    sourcePayloadHash: input.draftBasis.sourcePayloadHash,
    title: input.title,
    rows: input.payload.rows.map((row) => ({
      visibleName: row.visibleName,
      quantity: row.quantity,
      unit: row.unit,
    })),
  });
  return {
    sourceEstimateTitle: input.title,
    workPackageCount: input.draftBasis.workPackages.length,
    taskCount: input.draftBasis.tasks.length,
    procurementItemCount: input.draftBasis.procurementItems.length,
    checklistCount: input.draftBasis.workPackages.reduce((sum, workPackage) => sum + workPackage.checklist.length, 0),
    foremanHandoffFingerprint,
    customerProposalFingerprint,
    visibleWarnings: input.payload.clarifications.map(cleanText),
  };
}

export function buildProjectExecutionDraftFromEstimate(
  payload: StructuredEstimatePayload,
  options: ProjectExecutionDraftOptions,
): ProjectExecutionDraft {
  const hash = sourcePayloadHash(payload);
  const title = visibleTitle(payload);
  const controlRows = payload.rows.filter(isControlOrWarningRow);
  const workPackage = buildWorkPackage({ payload, hash, title, controlRows });
  const tasks = buildTasks({ payload, packageId: workPackage.id, hash });
  const procurementItems = buildProcurementItems(payload, hash);
  const draftBasis = {
    sourcePayloadHash: hash,
    workPackages: [workPackage],
    tasks,
    procurementItems,
  };
  const projectTitle = `${RU.projectPrefix}${title}`;
  const draft: ProjectExecutionDraft = {
    projectId: options.projectId ?? stableId("project_execution", { sourcePayloadHash: hash, source: options.source }),
    sourceEstimateId: payload.estimateId,
    sourceRequestId: options.sourceRequestId,
    sourcePayloadHash: hash,
    projectTitle,
    customerVisibleTitle: title,
    workPackages: [workPackage],
    tasks,
    procurementItems,
    handoffSummary: buildSummary({ payload, draftBasis, title }),
    totals: {
      materialsTotal: payload.totals.materialsTotal,
      laborTotal: payload.totals.laborTotal,
      equipmentTotal: payload.totals.equipmentTotal + payload.totals.deliveryTotal,
      grandTotal: payload.totals.grandTotal,
    },
    metadata: {
      source: options.source,
      createdAt: options.generatedAt,
      language: "ru",
      countryCode: options.countryCode,
      cityOrRegion: options.cityOrRegion,
    },
  };
  return draft;
}

function exportRowsFromEstimate(payload: StructuredEstimatePayload) {
  return payload.rows.map((row) => ({
    label: visibleRowLabel(row),
    quantity: row.quantity,
    unit: visibleUnit(row.unit),
    sourceLabel: defaultSourceLabel(row),
  }));
}

export function buildProjectExecutionPdfExportViewModel(
  payload: StructuredEstimatePayload,
  draft: ProjectExecutionDraft,
): ProjectExecutionExportViewModel {
  const estimateRows = exportRowsFromEstimate(payload);
  const workPackageRows = draft.workPackages.map((workPackage) => ({
    label: workPackage.customerVisibleTitle,
    quantity: workPackage.checklist.length,
    unit: "\u0447\u0435\u043a-\u043b\u0438\u0441\u0442",
    sourceLabel: RU.sourceLabel,
  }));
  const taskRows = draft.tasks.map((task) => ({
    label: task.title,
    quantity: task.quantity,
    unit: task.unit,
    sourceLabel: task.visibleSourceLabel,
  }));
  const procurementRows = draft.procurementItems.map((item) => ({
    label: item.materialVisibleName,
    quantity: item.quantity,
    unit: item.unit,
    sourceLabel: item.notes,
  }));
  return {
    sourcePayloadHash: draft.sourcePayloadHash,
    title: draft.projectTitle,
    sections: [
      { title: RU.estimateSection, rows: estimateRows },
      { title: RU.materialsSection, rows: procurementRows },
      { title: RU.stagesSection, rows: [...workPackageRows, ...taskRows] },
      { title: RU.procurementSection, rows: procurementRows },
    ],
    fingerprints: {
      estimate: payloadFingerprint(estimateRows),
      workPackages: payloadFingerprint(workPackageRows),
      tasks: payloadFingerprint(taskRows),
      procurement: payloadFingerprint(procurementRows),
    },
    fakeGreenClaimed: false,
  };
}

export function buildProjectExecutionBindingPayloads(input: {
  payload: StructuredEstimatePayload;
  draft: ProjectExecutionDraft;
  requestDraftId?: string;
  projectDraftSaved?: boolean;
}): ProjectExecutionBindingPayloads {
  const customerProposal = buildProjectExecutionPdfExportViewModel(input.payload, input.draft);
  const sourcePayloadHash = input.draft.sourcePayloadHash;
  const projectFingerprint = payloadFingerprint({
    sourcePayloadHash,
    projectId: input.draft.projectId,
    workPackages: input.draft.workPackages.map((workPackage) => workPackage.title),
    tasks: input.draft.tasks.map((task) => task.title),
    procurementItems: input.draft.procurementItems.map((item) => item.materialVisibleName),
  });
  const request = {
    sourcePayloadHash,
    projectId: input.draft.projectId,
    workPackageCount: input.draft.workPackages.length,
    taskCount: input.draft.tasks.length,
    procurementItemCount: input.draft.procurementItems.length,
  };
  return {
    request,
    history: {
      sourcePayloadHash,
      projectFingerprint,
      requestDraftId: input.requestDraftId,
      projectDraftSaved: input.projectDraftSaved ?? false,
    },
    foreman: {
      sourcePayloadHash,
      workPackages: input.draft.workPackages,
      tasks: input.draft.tasks,
      procurementItems: input.draft.procurementItems,
    },
    customerProposal,
    sameSourceOfTruth:
      request.sourcePayloadHash === sourcePayloadHash &&
      customerProposal.sourcePayloadHash === sourcePayloadHash,
    fakeGreenClaimed: false,
  };
}
