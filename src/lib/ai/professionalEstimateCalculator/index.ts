import {
  PRODUCTION_TEMPLATE_10000_READY_STATUS,
  PRODUCTION_WORK_ALIASES_10000,
  PRODUCTION_WORK_DEFINITIONS_10000,
  buildProductionTemplate10000AcceptanceMatrix,
  compileProductionExpandedEstimate10000,
  getProductionWorkDefinition10000,
  resolveProductionWorkDefinition10000,
  type ProductionCompiledExpandedEstimate,
  type ProductionDefaultUnit,
  type ProductionExpandedTemplateRow,
  type ProductionTemplate10000Category,
  type ProductionWorkDefinition,
} from "../estimateTemplate10000";
import { extractEstimateVolume } from "../estimateRouting/estimatePromptExtractor";
import {
  createEditableEstimateSnapshot,
  type EditableEstimatePriceSource,
  type EditableEstimatePriceStatus,
  type EditableEstimateRow,
  type EditableEstimateRowType,
  type EditableEstimateSnapshot,
} from "../editableEstimate";
import {
  bindEstimateRevisionToHistoryEntry,
  bindEstimateRevisionToPdfExport,
  bindEstimateRevisionToRequestPayload,
  createEstimateRevisionState,
  getCurrentEstimateRevision,
  type EstimateRevisionCurrency,
  type EstimateRevisionHistoryBinding,
  type EstimateRevisionPdfBinding,
  type EstimateRevisionRequestBinding,
  type EstimateRevisionState,
} from "../estimateRevisions";

export * from "./realMaterialQuantityEngine";

export const PROFESSIONAL_ESTIMATE_CALCULATOR_WAVE =
  "S_PROFESSIONAL_AI_ESTIMATE_TEMPLATE_CALCULATOR_BACKEND_CATALOG_NO_BUILDS" as const;

export const GREEN_PROFESSIONAL_ESTIMATE_CALCULATOR =
  "GREEN_PROFESSIONAL_AI_ESTIMATE_TEMPLATE_CALCULATOR_BACKEND_CATALOG_NO_BUILDS" as const;

export const STOP_TEMPLATE_CATALOG_NOT_READY_FOR_10000 =
  "STOP_TEMPLATE_CATALOG_NOT_READY_FOR_10000" as const;

export const STOP_PROFESSIONAL_ESTIMATE_SOURCE_GATES_NOT_GREEN =
  "STOP_PROFESSIONAL_ESTIMATE_SOURCE_GATES_NOT_GREEN" as const;

const TEMPLATE_CATALOG_SOURCE = "production_estimate_template_10000_backend_catalog" as const;
const FORMULA_ENGINE_SOURCE = "compileProductionExpandedEstimate10000" as const;

export type ProfessionalEstimateCalculatorStatus =
  | "NEEDS_CLARIFICATION"
  | "NEEDS_USER_CONFIRMATION"
  | "CONFIRMED_HANDOFF_READY";

export type ProfessionalEstimateCalculatorManualOverride = {
  rowCode: string;
  quantity?: number | null;
  unitPrice?: number | null;
  actorUserId?: string | null;
  reason?: string | null;
};

export type ProfessionalEstimateCalculatorInput = {
  rawInput: string;
  selectedWorkKey?: string | null;
  quantity?: number | null;
  unit?: ProductionDefaultUnit | string | null;
  countryCode?: "KG" | "KZ" | "RU" | "UZ";
  createdAt?: string;
  actorUserId?: string | null;
  manualOverrides?: ProfessionalEstimateCalculatorManualOverride[];
};

export type ProfessionalEstimateCalculatorIntent = {
  rawInput: string;
  status: "READY_FOR_CALCULATION" | "NEEDS_CLARIFICATION";
  selectedWorkKey: string | null;
  selectedTemplateKey: string | null;
  selectedCategory: ProductionTemplate10000Category | null;
  selectedWorkSource: "user_selected_catalog_key" | "backend_catalog_alias" | "not_resolved";
  quantity: number | null;
  unit: ProductionDefaultUnit | string | null;
  missingParameters: string[];
  aiMayOnlyParseIntent: true;
  aiIsSourceOfTruth: false;
  templateCatalogIsSourceOfTruth: true;
};

export type ProfessionalEstimateFormulaOutput = {
  rowCode: string;
  section: string;
  quantityFormula: string;
  quantity: number;
  unit: string;
  includedInEstimate: boolean;
  includedInProcurement: boolean;
};

export type ProfessionalEstimateRequestDraftLine = {
  rik_code: string;
  qty: number;
  price: number | null;
  errorLabel: string;
  meta: {
    app_code: null;
    kind: "material" | "work" | "service";
    name_human: string;
    uom: string;
    note: string;
  };
};

export type ProfessionalEstimateTemplateSnapshot = {
  sourceCatalog: typeof TEMPLATE_CATALOG_SOURCE;
  formulaEngine: typeof FORMULA_ENGINE_SOURCE;
  workKey: string;
  templateKey: string;
  templateFamily: string;
  templateVersion: string;
  category: ProductionTemplate10000Category;
  params: {
    q: number;
    unit: string;
    countryCode: string;
    currency: string;
  };
  formulaOutputs: ProfessionalEstimateFormulaOutput[];
  manualOverrides: ProfessionalEstimateCalculatorManualOverride[];
  compiledHash: string;
  editableSnapshotHash: string;
  aiIsSourceOfTruth: false;
  fakeGreenClaimed: false;
};

export type ProfessionalEstimateCalculatorClarification = {
  wave: typeof PROFESSIONAL_ESTIMATE_CALCULATOR_WAVE;
  status: "NEEDS_CLARIFICATION";
  intent: ProfessionalEstimateCalculatorIntent;
  clarificationQuestions: string[];
  requestDraftLines: [];
  insertedRows: 0;
  rowsInsertedBeforeConfirmation: false;
  fakeGreenClaimed: false;
};

export type ProfessionalEstimateCalculatorPreview = {
  wave: typeof PROFESSIONAL_ESTIMATE_CALCULATOR_WAVE;
  status: "NEEDS_USER_CONFIRMATION";
  intent: ProfessionalEstimateCalculatorIntent & { status: "READY_FOR_CALCULATION"; selectedWorkKey: string; selectedTemplateKey: string; quantity: number };
  definition: ProductionWorkDefinition;
  compiled: ProductionCompiledExpandedEstimate;
  editableSnapshot: EditableEstimateSnapshot;
  revisionState: EstimateRevisionState;
  templateSnapshot: ProfessionalEstimateTemplateSnapshot;
  requestDraftLines: ProfessionalEstimateRequestDraftLine[];
  insertedRows: 0;
  rowsInsertedBeforeConfirmation: false;
  userConfirmationRequiredBeforeInsert: true;
  fakeGreenClaimed: false;
};

export type ProfessionalEstimateCalculatorResult =
  | ProfessionalEstimateCalculatorClarification
  | ProfessionalEstimateCalculatorPreview;

export type ProfessionalEstimateCalculatorConfirmedHandoff = {
  wave: typeof PROFESSIONAL_ESTIMATE_CALCULATOR_WAVE;
  status: "CONFIRMED_HANDOFF_READY";
  revisionState: EstimateRevisionState;
  currentRevisionId: string;
  currentSnapshotId: string;
  pdfBinding: EstimateRevisionPdfBinding;
  requestBinding: EstimateRevisionRequestBinding;
  historyBinding: EstimateRevisionHistoryBinding;
  directorPdfHandoff: {
    pdfId: string;
    revisionId: string;
    snapshotId: string;
    rowsHash: string;
    totalsHash: string;
    recalculatedSeparately: false;
  };
  buyerProcurementHandoff: {
    requestPayloadId: string;
    revisionId: string;
    snapshotId: string;
    rows: ProfessionalEstimateRequestDraftLine[];
    rowsHash: string;
    totalsHash: string;
    recalculatedSeparately: false;
  };
  insertedRows: number;
  rowsInsertedBeforeConfirmation: false;
  allHandoffHashesMatchRevision: boolean;
  fakeGreenClaimed: false;
};

export type ProfessionalEstimateTemplateCatalogReadiness = {
  status: typeof PRODUCTION_TEMPLATE_10000_READY_STATUS | typeof STOP_TEMPLATE_CATALOG_NOT_READY_FOR_10000;
  templatesTotal: number;
  canonicalWorkKeysTotal: number;
  compiledTemplatesTotal: number;
  compiledTemplatesFailed: number;
  compiledRowsTotal: number;
  categoryDistributionMatchesRequired: boolean;
  promptVariantsCountedAsTemplates: false;
  aliasesCountedAsTemplates: false;
  mojibakeFound: number;
  englishDebugLabelsVisible: number;
  fakePricesFound: number;
  missingPriceHandledHonestly: boolean;
  blockers: string[];
  fakeGreenClaimed: false;
};

export type ProfessionalEstimateCalculatorSmokeSummary = {
  wave: typeof PROFESSIONAL_ESTIMATE_CALCULATOR_WAVE;
  finalStatus:
    | typeof GREEN_PROFESSIONAL_ESTIMATE_CALCULATOR
    | typeof STOP_TEMPLATE_CATALOG_NOT_READY_FOR_10000
    | typeof STOP_PROFESSIONAL_ESTIMATE_SOURCE_GATES_NOT_GREEN;
  catalog: ProfessionalEstimateTemplateCatalogReadiness;
  previewReady: boolean;
  clarificationBlocksMissingQuantity: boolean;
  confirmationRequiredBeforeInsert: boolean;
  confirmedHandoffReady: boolean;
  directorPdfBoundToRevision: boolean;
  buyerRequestBoundToRevision: boolean;
  revisionSnapshotPersisted: boolean;
  manualOverridesPersisted: boolean;
  sourceGateEvidenceRequired: boolean;
  sourceGateEvidence: {
    focusedTestsPassed?: boolean;
    typecheckPassed?: boolean;
    lintPassed?: boolean;
    officeMarketPassed?: boolean;
    noMarketplaceScope?: boolean;
    gitDiffCheckPassed?: boolean;
    testWeakeningGuardPassed?: boolean;
    webPublicSmokePassed?: boolean;
    secretScanPassed?: boolean;
    templateImportPreviewPassed?: boolean;
  };
  sourceGateBlockers: string[];
  runtimeEvidence: {
    androidChromeSmokeRequired: boolean;
    androidChromeSmokePassed?: boolean;
    androidChromeSmokeStatus: "passed" | "not_required" | "not_verified";
  };
  runtimeEvidenceBlockers: string[];
  webPublicSmokePassed?: boolean;
  androidChromeSmokePassed?: boolean;
  focusedTestsPassed?: boolean;
  typecheckPassed?: boolean;
  lintPassed?: boolean;
  officeMarketPassed?: boolean;
  noMarketplaceScope?: boolean;
  gitDiffCheckPassed?: boolean;
  testWeakeningGuardPassed?: boolean;
  secretScanPassed?: boolean;
  templateImportPreviewPassed?: boolean;
  blockers: string[];
  nativeBuildStarted: false;
  easStarted: false;
  releaseStarted: false;
  fullJestStarted: false;
  prodDbMutated: false;
  destructiveSqlExecuted: false;
  fakeGreenClaimed: false;
};

function stableHash(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function normalizePrompt(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("ru-RU")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findDefinitionInBackendCatalog(input: {
  rawInput: string;
  selectedWorkKey?: string | null;
}): { definition: ProductionWorkDefinition | null; source: ProfessionalEstimateCalculatorIntent["selectedWorkSource"] } {
  const selectedKey = String(input.selectedWorkKey ?? "").trim();
  if (selectedKey) {
    return {
      definition: getProductionWorkDefinition10000(selectedKey) ?? null,
      source: "user_selected_catalog_key",
    };
  }

  const exact = resolveProductionWorkDefinition10000(input.rawInput);
  if (exact) {
    return { definition: exact, source: "backend_catalog_alias" };
  }

  const normalized = normalizePrompt(input.rawInput);
  const alias = [...PRODUCTION_WORK_ALIASES_10000]
    .filter((candidate) => candidate.normalizedAlias && normalized.includes(candidate.normalizedAlias))
    .sort((left, right) => right.normalizedAlias.length - left.normalizedAlias.length)[0];
  if (!alias) return { definition: null, source: "not_resolved" };

  return {
    definition: getProductionWorkDefinition10000(alias.workKey) ?? null,
    source: "backend_catalog_alias",
  };
}

function resolveQuantity(input: ProfessionalEstimateCalculatorInput): {
  quantity: number | null;
  unit: ProductionDefaultUnit | string | null;
} {
  const direct = Number(input.quantity);
  if (Number.isFinite(direct) && direct > 0) {
    return { quantity: direct, unit: input.unit ?? null };
  }
  const extracted = extractEstimateVolume(input.rawInput);
  const parsed = Number(extracted.volume);
  if (Number.isFinite(parsed) && parsed > 0) {
    return { quantity: parsed, unit: input.unit ?? extracted.unit ?? null };
  }
  return { quantity: null, unit: input.unit ?? extracted.unit ?? null };
}

function currencyFor(countryCode: string): EstimateRevisionCurrency {
  if (countryCode === "KZ") return "KZT";
  if (countryCode === "RU") return "RUB";
  if (countryCode === "UZ") return "UZS";
  return "KGS";
}

export function parseProfessionalEstimateCalculatorIntent(
  input: ProfessionalEstimateCalculatorInput,
): ProfessionalEstimateCalculatorIntent {
  const resolved = findDefinitionInBackendCatalog(input);
  const quantity = resolveQuantity(input);
  const missingParameters = [
    resolved.definition ? "" : "work_template",
    quantity.quantity == null ? "q" : "",
  ].filter(Boolean);

  return {
    rawInput: input.rawInput,
    status: missingParameters.length === 0 ? "READY_FOR_CALCULATION" : "NEEDS_CLARIFICATION",
    selectedWorkKey: resolved.definition?.workKey ?? null,
    selectedTemplateKey: resolved.definition?.templateKey ?? null,
    selectedCategory: resolved.definition?.category ?? null,
    selectedWorkSource: resolved.source,
    quantity: quantity.quantity,
    unit: quantity.unit ?? resolved.definition?.defaultUnit ?? null,
    missingParameters,
    aiMayOnlyParseIntent: true,
    aiIsSourceOfTruth: false,
    templateCatalogIsSourceOfTruth: true,
  };
}

export function auditProfessionalEstimateTemplateCatalogReadiness(): ProfessionalEstimateTemplateCatalogReadiness {
  const matrix = buildProductionTemplate10000AcceptanceMatrix();
  const blockers = [
    ...matrix.blockers,
    matrix.unique_work_templates_total === 10000 ? "" : "UNIQUE_WORK_TEMPLATES_NOT_10000",
    matrix.unique_canonical_work_keys === 10000 ? "" : "UNIQUE_CANONICAL_WORK_KEYS_NOT_10000",
    matrix.mojibake_found === 0 ? "" : "MOJIBAKE_VISIBLE_IN_TEMPLATE_CATALOG",
    matrix.english_debug_labels_visible === 0 ? "" : "ENGLISH_DEBUG_LABEL_VISIBLE_IN_TEMPLATE_CATALOG",
    matrix.fake_prices_found === 0 ? "" : "FAKE_TEMPLATE_PRICES_FOUND",
    matrix.missing_price_handled_honestly ? "" : "MISSING_PRICE_NOT_HANDLED_HONESTLY",
  ].filter(Boolean);

  return {
    status: blockers.length === 0 ? PRODUCTION_TEMPLATE_10000_READY_STATUS : STOP_TEMPLATE_CATALOG_NOT_READY_FOR_10000,
    templatesTotal: matrix.unique_work_templates_total,
    canonicalWorkKeysTotal: matrix.unique_canonical_work_keys,
    compiledTemplatesTotal: matrix.compiled_templates_total,
    compiledTemplatesFailed: matrix.compiled_templates_failed,
    compiledRowsTotal: matrix.compiled_rows_total,
    categoryDistributionMatchesRequired: matrix.category_distribution_matches_required,
    promptVariantsCountedAsTemplates: matrix.prompt_variants_counted_as_templates,
    aliasesCountedAsTemplates: matrix.aliases_counted_as_templates,
    mojibakeFound: matrix.mojibake_found,
    englishDebugLabelsVisible: matrix.english_debug_labels_visible,
    fakePricesFound: matrix.fake_prices_found,
    missingPriceHandledHonestly: matrix.missing_price_handled_honestly,
    blockers,
    fakeGreenClaimed: false,
  };
}

function rowTypeFor(row: ProductionExpandedTemplateRow): EditableEstimateRowType {
  if (row.section === "labor" || row.section === "preparation" || row.section === "quality_control") return "work";
  if (row.section === "equipment" || row.section === "logistics" || row.section === "overhead" || row.section === "tax") return "service";
  return "material";
}

function requestKindFor(row: EditableEstimateRow): ProfessionalEstimateRequestDraftLine["meta"]["kind"] {
  if (row.rowType === "work") return "work";
  if (row.rowType === "service") return "service";
  return "material";
}

function manualOverrideFor(
  rowCode: string,
  overrides: readonly ProfessionalEstimateCalculatorManualOverride[],
): ProfessionalEstimateCalculatorManualOverride | undefined {
  return overrides.find((override) => override.rowCode === rowCode);
}

function editableRowsFromCompiled(input: {
  compiled: ProductionCompiledExpandedEstimate;
  manualOverrides: readonly ProfessionalEstimateCalculatorManualOverride[];
}): EditableEstimateRow[] {
  return input.compiled.rows.map((row): EditableEstimateRow => {
    const override = manualOverrideFor(row.rowCode, input.manualOverrides);
    const quantity = override?.quantity != null && Number.isFinite(Number(override.quantity)) && Number(override.quantity) >= 0
      ? Number(override.quantity)
      : row.quantity;
    const unitPrice = override?.unitPrice != null && Number.isFinite(Number(override.unitPrice)) && Number(override.unitPrice) >= 0
      ? Number(override.unitPrice)
      : null;
    const priceStatus: EditableEstimatePriceStatus = unitPrice == null ? "PRICE_MISSING" : "USER_ENTERED_PRICE";
    const priceSource: EditableEstimatePriceSource = unitPrice == null ? "missing" : "user";

    return {
      rowId: row.rowCode,
      requestItemId: null,
      rowType: rowTypeFor(row),
      titleRu: row.titleRu,
      quantity,
      unit: row.unit,
      unitLabel: row.unit,
      unitPrice,
      totalPrice: unitPrice == null ? null : Math.round(quantity * unitPrice * 100) / 100,
      currency: input.compiled.currency,
      rowSource: TEMPLATE_CATALOG_SOURCE,
      catalogItemId: row.materialKey ?? null,
      selectedCatalogItemId: null,
      materialKey: row.materialKey ?? null,
      rateKey: row.pricebookItemKey ?? row.laborRateKey ?? null,
      catalogBindingStatus: row.includedInProcurement ? "CATALOG_REQUIRED" : "NOT_FOR_PROCUREMENT",
      category: input.compiled.category,
      sourceId: row.pricebookItemKey ?? row.materialKey ?? row.rowCode,
      sourceLabel: TEMPLATE_CATALOG_SOURCE,
      confidence: "high",
      addedBy: "system",
      editableByConsumer: true,
      quantitySource: override?.quantity == null ? "estimate" : "user_override",
      priceStatus,
      priceSource,
      priceSourceId: unitPrice == null ? null : override?.actorUserId ?? "user",
      priceSourceLabel: unitPrice == null ? null : "manual_user_confirmation",
      manualPrice: unitPrice == null
        ? null
        : {
            unitPrice,
            currency: input.compiled.currency,
            status: "USER_ENTERED_PRICE",
            actorUserId: override?.actorUserId ?? null,
            reason: override?.reason ?? "professional_estimate_calculator_manual_override",
            updatedAt: new Date(0).toISOString(),
          },
      removed: !row.includedInEstimate,
    };
  });
}

function buildRequestDraftLines(input: {
  estimateId: string;
  revisionId: string;
  snapshot: EditableEstimateSnapshot;
}): ProfessionalEstimateRequestDraftLine[] {
  return input.snapshot.rows
    .filter((row) => row.removed !== true)
    .filter((row) => row.quantity != null && row.quantity > 0)
    .filter((row) => row.catalogBindingStatus === "CATALOG_REQUIRED")
    .filter((row) => row.rowType === "material")
    .map((row) => ({
      rik_code: `TPL-${row.rowId}`.slice(0, 64),
      qty: Number(row.quantity),
      price: row.unitPrice == null ? null : Number(row.unitPrice),
      errorLabel: row.titleRu,
      meta: {
        app_code: null,
        kind: requestKindFor(row),
        name_human: row.titleRu,
        uom: row.unit ?? "",
        note: JSON.stringify({
          source: TEMPLATE_CATALOG_SOURCE,
          estimateId: input.estimateId,
          revisionId: input.revisionId,
          rowId: row.rowId,
          priceStatus: row.priceStatus,
        }),
      },
    }));
}

function formulaOutputs(compiled: ProductionCompiledExpandedEstimate): ProfessionalEstimateFormulaOutput[] {
  return compiled.rows.map((row) => ({
    rowCode: row.rowCode,
    section: row.section,
    quantityFormula: row.quantityFormula,
    quantity: row.quantity,
    unit: row.unit,
    includedInEstimate: row.includedInEstimate,
    includedInProcurement: row.includedInProcurement,
  }));
}

function clarificationQuestionsFor(intent: ProfessionalEstimateCalculatorIntent): string[] {
  return intent.missingParameters.map((parameter) => {
    if (parameter === "work_template") return "Выберите поддерживаемый шаблон работ из каталога.";
    if (parameter === "q") return "Укажите объем работ перед расчетом.";
    return `Уточните параметр: ${parameter}`;
  });
}

export function createProfessionalEstimateCalculatorPreview(
  input: ProfessionalEstimateCalculatorInput,
): ProfessionalEstimateCalculatorResult {
  const catalog = auditProfessionalEstimateTemplateCatalogReadiness();
  if (catalog.status !== PRODUCTION_TEMPLATE_10000_READY_STATUS) {
    throw new Error(`${STOP_TEMPLATE_CATALOG_NOT_READY_FOR_10000}:${catalog.blockers.join("|")}`);
  }

  const intent = parseProfessionalEstimateCalculatorIntent(input);
  if (intent.status !== "READY_FOR_CALCULATION" || !intent.selectedWorkKey || !intent.selectedTemplateKey || intent.quantity == null) {
    return {
      wave: PROFESSIONAL_ESTIMATE_CALCULATOR_WAVE,
      status: "NEEDS_CLARIFICATION",
      intent,
      clarificationQuestions: clarificationQuestionsFor(intent),
      requestDraftLines: [],
      insertedRows: 0,
      rowsInsertedBeforeConfirmation: false,
      fakeGreenClaimed: false,
    };
  }

  const definition = getProductionWorkDefinition10000(intent.selectedWorkKey);
  if (!definition) throw new Error(`PROFESSIONAL_TEMPLATE_NOT_FOUND:${intent.selectedWorkKey}`);

  const countryCode = input.countryCode ?? "KG";
  const compiled = compileProductionExpandedEstimate10000({
    workKey: definition.workKey,
    quantity: intent.quantity,
    countryCode,
  });
  const createdAt = input.createdAt ?? new Date().toISOString();
  const estimateId = `professional-estimate:${stableHash({
    workKey: definition.workKey,
    templateKey: definition.templateKey,
    quantity: intent.quantity,
    countryCode,
  })}`;
  const editableSnapshot = createEditableEstimateSnapshot({
    snapshotId: `professional-estimate-snapshot:${estimateId}`,
    requestDraftId: `professional-request-draft:${estimateId}`,
    sourceEstimateId: estimateId,
    workKey: definition.workKey,
    currency: compiled.currency,
    rows: editableRowsFromCompiled({
      compiled,
      manualOverrides: input.manualOverrides ?? [],
    }),
    createdAt,
  });
  const revisionState = createEstimateRevisionState({
    estimate_id: estimateId,
    request_id: `request:${estimateId}`,
    selected_work_key: definition.workKey,
    region: countryCode,
    currency: currencyFor(countryCode),
    editable_estimate_snapshot: editableSnapshot,
    created_by: "system",
    created_at: createdAt,
    source: "AI_GENERATED",
    status: "DRAFT",
  });
  const currentRevision = getCurrentEstimateRevision(revisionState);
  const requestDraftLines = buildRequestDraftLines({
    estimateId,
    revisionId: currentRevision.revision_id,
    snapshot: editableSnapshot,
  });
  const templateSnapshot: ProfessionalEstimateTemplateSnapshot = {
    sourceCatalog: TEMPLATE_CATALOG_SOURCE,
    formulaEngine: FORMULA_ENGINE_SOURCE,
    workKey: definition.workKey,
    templateKey: definition.templateKey,
    templateFamily: definition.templateFamily,
    templateVersion: compiled.detailLevel,
    category: definition.category,
    params: {
      q: intent.quantity,
      unit: String(intent.unit ?? definition.defaultUnit),
      countryCode,
      currency: compiled.currency,
    },
    formulaOutputs: formulaOutputs(compiled),
    manualOverrides: input.manualOverrides ?? [],
    compiledHash: compiled.compiledHash,
    editableSnapshotHash: editableSnapshot.hash,
    aiIsSourceOfTruth: false,
    fakeGreenClaimed: false,
  };

  return {
    wave: PROFESSIONAL_ESTIMATE_CALCULATOR_WAVE,
    status: "NEEDS_USER_CONFIRMATION",
    intent: intent as ProfessionalEstimateCalculatorPreview["intent"],
    definition,
    compiled,
    editableSnapshot,
    revisionState,
    templateSnapshot,
    requestDraftLines,
    insertedRows: 0,
    rowsInsertedBeforeConfirmation: false,
    userConfirmationRequiredBeforeInsert: true,
    fakeGreenClaimed: false,
  };
}

export function confirmProfessionalEstimateCalculatorHandoff(input: {
  preview: ProfessionalEstimateCalculatorPreview;
  userConfirmed: boolean;
  actorUserId?: string | null;
  createdAt?: string;
}): ProfessionalEstimateCalculatorConfirmedHandoff {
  if (!input.userConfirmed) {
    throw new Error("PROFESSIONAL_ESTIMATE_USER_CONFIRMATION_REQUIRED_BEFORE_INSERT");
  }
  const createdAt = input.createdAt ?? new Date().toISOString();
  const pdfId = `director-pdf:${input.preview.editableSnapshot.snapshotId}`;
  const requestPayloadId = `buyer-request:${input.preview.editableSnapshot.snapshotId}`;
  const historyEntryId = `estimate-history:${input.preview.editableSnapshot.snapshotId}`;
  const pdfBound = bindEstimateRevisionToPdfExport({
    state: input.preview.revisionState,
    pdf_id: pdfId,
    actor_id: input.actorUserId ?? undefined,
    created_at: createdAt,
  });
  const requestBound = bindEstimateRevisionToRequestPayload({
    state: pdfBound.state,
    request_payload_id: requestPayloadId,
    actor_id: input.actorUserId ?? undefined,
    created_at: createdAt,
  });
  const historyBound = bindEstimateRevisionToHistoryEntry({
    state: requestBound.state,
    history_entry_id: historyEntryId,
    created_at: createdAt,
  });
  const revision = getCurrentEstimateRevision(historyBound.state);
  const allHandoffHashesMatchRevision =
    pdfBound.binding.pdf_rows_hash === revision.rows_hash &&
    pdfBound.binding.pdf_totals_hash === revision.totals_hash &&
    requestBound.binding.request_rows_hash === revision.rows_hash &&
    requestBound.binding.request_totals_hash === revision.totals_hash &&
    historyBound.binding.history_rows_hash === revision.rows_hash &&
    historyBound.binding.history_totals_hash === revision.totals_hash;

  return {
    wave: PROFESSIONAL_ESTIMATE_CALCULATOR_WAVE,
    status: "CONFIRMED_HANDOFF_READY",
    revisionState: historyBound.state,
    currentRevisionId: revision.revision_id,
    currentSnapshotId: revision.snapshot_id,
    pdfBinding: pdfBound.binding,
    requestBinding: requestBound.binding,
    historyBinding: historyBound.binding,
    directorPdfHandoff: {
      pdfId,
      revisionId: revision.revision_id,
      snapshotId: revision.snapshot_id,
      rowsHash: revision.rows_hash,
      totalsHash: revision.totals_hash,
      recalculatedSeparately: false,
    },
    buyerProcurementHandoff: {
      requestPayloadId,
      revisionId: revision.revision_id,
      snapshotId: revision.snapshot_id,
      rows: input.preview.requestDraftLines,
      rowsHash: revision.rows_hash,
      totalsHash: revision.totals_hash,
      recalculatedSeparately: false,
    },
    insertedRows: input.preview.requestDraftLines.length,
    rowsInsertedBeforeConfirmation: false,
    allHandoffHashesMatchRevision,
    fakeGreenClaimed: false,
  };
}

export function representativeProfessionalEstimateCalculatorInput(): ProfessionalEstimateCalculatorInput {
  const definition =
    PRODUCTION_WORK_DEFINITIONS_10000.find((item) => item.category === "masonry") ??
    PRODUCTION_WORK_DEFINITIONS_10000[0];
  if (!definition) throw new Error("PROFESSIONAL_TEMPLATE_CATALOG_EMPTY");
  return {
    rawInput: `${definition.visibleNameRu} 42 ${definition.defaultUnit}`,
    selectedWorkKey: definition.workKey,
    quantity: 42,
    unit: definition.defaultUnit,
    countryCode: "KG",
    createdAt: "2026-07-01T00:00:00.000Z",
    manualOverrides: [{
      rowCode: `${definition.workKey}_materials_01`,
      unitPrice: 100,
      actorUserId: "user:professional-estimate-smoke",
      reason: "smoke_manual_price_confirmation",
    }],
  };
}

export function buildProfessionalEstimateCalculatorSmokeSummary(input: {
  requireSourceGateEvidence?: boolean;
  requireAndroidChromeSmoke?: boolean;
  webPublicSmokePassed?: boolean;
  androidChromeSmokePassed?: boolean;
  focusedTestsPassed?: boolean;
  typecheckPassed?: boolean;
  lintPassed?: boolean;
  officeMarketPassed?: boolean;
  noMarketplaceScope?: boolean;
  gitDiffCheckPassed?: boolean;
  testWeakeningGuardPassed?: boolean;
  secretScanPassed?: boolean;
  templateImportPreviewPassed?: boolean;
} = {}): ProfessionalEstimateCalculatorSmokeSummary {
  const catalog = auditProfessionalEstimateTemplateCatalogReadiness();
  const preview = createProfessionalEstimateCalculatorPreview(representativeProfessionalEstimateCalculatorInput());
  const missingQuantity = createProfessionalEstimateCalculatorPreview({
    ...representativeProfessionalEstimateCalculatorInput(),
    rawInput: "backend catalog work without volume",
    selectedWorkKey: representativeProfessionalEstimateCalculatorInput().selectedWorkKey,
    quantity: null,
  });
  const confirmed = preview.status === "NEEDS_USER_CONFIRMATION"
    ? confirmProfessionalEstimateCalculatorHandoff({
        preview,
        userConfirmed: true,
        actorUserId: "user:professional-estimate-smoke",
        createdAt: "2026-07-01T00:01:00.000Z",
      })
    : null;
  const revision = preview.status === "NEEDS_USER_CONFIRMATION"
    ? getCurrentEstimateRevision(preview.revisionState)
    : null;
  const domainBlockers = [
    catalog.status === PRODUCTION_TEMPLATE_10000_READY_STATUS ? "" : STOP_TEMPLATE_CATALOG_NOT_READY_FOR_10000,
    preview.status === "NEEDS_USER_CONFIRMATION" ? "" : "PREVIEW_NOT_READY",
    missingQuantity.status === "NEEDS_CLARIFICATION" ? "" : "MISSING_QUANTITY_NOT_BLOCKED",
    preview.status === "NEEDS_USER_CONFIRMATION" && preview.insertedRows === 0 && preview.userConfirmationRequiredBeforeInsert
      ? ""
      : "CONFIRMATION_BOUNDARY_NOT_ENFORCED",
    confirmed?.status === "CONFIRMED_HANDOFF_READY" ? "" : "CONFIRMED_HANDOFF_NOT_READY",
    confirmed?.allHandoffHashesMatchRevision ? "" : "HANDOFF_HASH_MISMATCH",
    revision ? "" : "REVISION_SNAPSHOT_NOT_PERSISTED",
    preview.status === "NEEDS_USER_CONFIRMATION" && preview.editableSnapshot.rows.some((row) => row.manualPrice)
      ? ""
      : "MANUAL_OVERRIDE_NOT_PERSISTED",
  ].filter(Boolean);
  const sourceGateEvidence = {
    focusedTestsPassed: input.focusedTestsPassed,
    typecheckPassed: input.typecheckPassed,
    lintPassed: input.lintPassed,
    officeMarketPassed: input.officeMarketPassed,
    noMarketplaceScope: input.noMarketplaceScope,
    gitDiffCheckPassed: input.gitDiffCheckPassed,
    testWeakeningGuardPassed: input.testWeakeningGuardPassed,
    webPublicSmokePassed: input.webPublicSmokePassed,
    secretScanPassed: input.secretScanPassed,
    templateImportPreviewPassed: input.templateImportPreviewPassed,
  };
  const sourceGateBlockers = input.requireSourceGateEvidence
    ? [
        sourceGateEvidence.focusedTestsPassed ? "" : "FOCUSED_TESTS_NOT_PROVEN_GREEN",
        sourceGateEvidence.typecheckPassed ? "" : "TYPECHECK_NOT_PROVEN_GREEN",
        sourceGateEvidence.lintPassed ? "" : "LINT_NOT_PROVEN_GREEN",
        sourceGateEvidence.noMarketplaceScope || sourceGateEvidence.officeMarketPassed
          ? ""
          : "OFFICE_MARKET_GATE_NOT_PROVEN_GREEN",
        sourceGateEvidence.gitDiffCheckPassed ? "" : "GIT_DIFF_CHECK_NOT_PROVEN_GREEN",
        sourceGateEvidence.testWeakeningGuardPassed ? "" : "TEST_WEAKENING_GUARD_NOT_PROVEN_GREEN",
        sourceGateEvidence.webPublicSmokePassed ? "" : "WEB_PUBLIC_SMOKE_NOT_PROVEN_GREEN",
        sourceGateEvidence.secretScanPassed ? "" : "SECRET_SCAN_NOT_PROVEN_GREEN",
        sourceGateEvidence.templateImportPreviewPassed ? "" : "TEMPLATE_IMPORT_PREVIEW_NOT_PROVEN_GREEN",
      ].filter(Boolean)
    : [];
  const runtimeEvidence = {
    androidChromeSmokeRequired: Boolean(input.requireAndroidChromeSmoke),
    androidChromeSmokePassed: input.androidChromeSmokePassed,
    androidChromeSmokeStatus: input.androidChromeSmokePassed
      ? "passed" as const
      : input.requireAndroidChromeSmoke
        ? "not_verified" as const
        : "not_required" as const,
  };
  const runtimeEvidenceBlockers =
    input.requireAndroidChromeSmoke && !input.androidChromeSmokePassed
      ? ["ANDROID_CHROME_SMOKE_NOT_PROVEN_GREEN"]
      : [];
  const blockers = [...domainBlockers, ...sourceGateBlockers, ...runtimeEvidenceBlockers];
  const finalStatus = blockers.length === 0
    ? GREEN_PROFESSIONAL_ESTIMATE_CALCULATOR
    : domainBlockers.includes(STOP_TEMPLATE_CATALOG_NOT_READY_FOR_10000)
      ? STOP_TEMPLATE_CATALOG_NOT_READY_FOR_10000
      : STOP_PROFESSIONAL_ESTIMATE_SOURCE_GATES_NOT_GREEN;

  return {
    wave: PROFESSIONAL_ESTIMATE_CALCULATOR_WAVE,
    finalStatus,
    catalog,
    previewReady: preview.status === "NEEDS_USER_CONFIRMATION",
    clarificationBlocksMissingQuantity: missingQuantity.status === "NEEDS_CLARIFICATION",
    confirmationRequiredBeforeInsert:
      preview.status === "NEEDS_USER_CONFIRMATION" &&
      preview.insertedRows === 0 &&
      preview.userConfirmationRequiredBeforeInsert,
    confirmedHandoffReady: confirmed?.status === "CONFIRMED_HANDOFF_READY",
    directorPdfBoundToRevision: Boolean(confirmed?.directorPdfHandoff.revisionId),
    buyerRequestBoundToRevision: Boolean(confirmed?.buyerProcurementHandoff.revisionId),
    revisionSnapshotPersisted: Boolean(revision),
    manualOverridesPersisted:
      preview.status === "NEEDS_USER_CONFIRMATION" &&
      preview.editableSnapshot.rows.some((row) => row.manualPrice),
    sourceGateEvidenceRequired: Boolean(input.requireSourceGateEvidence),
    sourceGateEvidence,
    sourceGateBlockers,
    runtimeEvidence,
    runtimeEvidenceBlockers,
    webPublicSmokePassed: input.webPublicSmokePassed,
    androidChromeSmokePassed: input.androidChromeSmokePassed,
    focusedTestsPassed: input.focusedTestsPassed,
    typecheckPassed: input.typecheckPassed,
    lintPassed: input.lintPassed,
    officeMarketPassed: input.officeMarketPassed,
    noMarketplaceScope: input.noMarketplaceScope,
    gitDiffCheckPassed: input.gitDiffCheckPassed,
    testWeakeningGuardPassed: input.testWeakeningGuardPassed,
    secretScanPassed: input.secretScanPassed,
    templateImportPreviewPassed: input.templateImportPreviewPassed,
    blockers,
    nativeBuildStarted: false,
    easStarted: false,
    releaseStarted: false,
    fullJestStarted: false,
    prodDbMutated: false,
    destructiveSqlExecuted: false,
    fakeGreenClaimed: false,
  };
}
