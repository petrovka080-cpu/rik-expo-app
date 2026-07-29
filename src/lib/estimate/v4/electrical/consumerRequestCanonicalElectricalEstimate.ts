import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import type {
  EstimateDraftRevision,
  EstimateDraftRevisionDiff,
  EstimateDraftRevisionState,
  ProfessionalBoqRow,
  ProfessionalBoqSection,
} from "../../estimateDraftRevisionContract";
import {
  bindEstimateDraftScope,
  commitEstimateCompileResult,
  createEstimateDraftSession,
  prepareEstimateCompile,
  selectEstimateDraftWork,
  type EstimateDraftSession,
  type EstimateDraftSessionParameterValue,
} from "../../draftSession/estimateDraftSession";
import type {
  RawInputFactExtraction,
} from "../../rawInputFactExtraction";
import {
  ELECTRICAL_CANONICAL_CALCULATION_VERSION,
  ELECTRICAL_CANONICAL_PARAMETER_DEFINITIONS,
  ELECTRICAL_CANONICAL_PARAMETER_SCHEMA_ID,
  ELECTRICAL_CANONICAL_PROFILE,
  ELECTRICAL_CANONICAL_SCOPE_PRESET_ID,
  ELECTRICAL_CANONICAL_WORK_KEY,
  buildElectricalCanonicalParameterSession,
  type ElectricalCanonicalParameterValues,
} from "./electricalCanonicalV1";
import type { CanonicalParameterSession } from "../../canonicalParameters/canonicalParameterCore";
import type {
  ConsumerRepairDraftBundle,
  ConsumerRepairRequestItem,
} from "../../../consumerRequests/consumerRequestTypes";
import {
  buildElectricalCircuitScheduleV1,
  type ElectricalCircuitScheduleV1,
} from "./electricalProfessionalBoqV1";

function itemRowId(item: ConsumerRepairRequestItem, index: number): string {
  const rowCode = item.sourceParameters?.rowCode;
  if (typeof rowCode === "string" && rowCode.trim()) return rowCode.trim();
  return item.rateKey?.trim() || item.formulaId?.trim() || `electrical_row_${index + 1}`;
}

function rowType(item: ConsumerRepairRequestItem): ProfessionalBoqRow["rowType"] {
  if (item.itemType === "material") return "material";
  if (item.itemType === "work") return "labor";
  if (item.itemType === "document") return "document";
  if (item.itemType === "service") return "service";
  return "other";
}

function professionalRow(
  item: ConsumerRepairRequestItem,
  index: number,
): ProfessionalBoqRow {
  return {
    rowId: itemRowId(item, index),
    rowType: rowType(item),
    titleRu: item.titleRu,
    quantity: item.quantity ?? 0,
    unit: item.unit ?? "set",
    unitLabel: item.unitLabel,
    unitPrice: item.unitPrice,
    currency: item.currency,
    category: item.category,
    sourceId: item.sourceId,
    sourceLabel: item.sourceLabel,
    formulaId: item.formulaId,
    quantityFormula: item.quantityFormula,
    calculationTrace: item.calculationTrace,
    sourceParameters: item.sourceParameters,
    templateId: item.templateId,
    templateVersion: item.templateVersion,
    normId: item.normId,
    normFamilyId: item.normFamilyId,
    normSourceId: item.normSourceId,
    normSourceTitle: item.normSourceTitle,
    normVersion: item.normVersion,
    normReviewStatus: item.normReviewStatus,
    priceStatus: item.priceStatus,
    priceSource: item.priceSource,
    priceSourceId: item.priceSourceId,
    priceSourceLabel: item.priceSourceLabel,
    materialKey: item.materialKey,
    rateKey: item.rateKey,
    includedInProcurement: item.itemType !== "work",
    materialQuantity: null,
  };
}

const SECTION_TITLES: Record<string, string> = {
  materials: "Материалы",
  labor: "Работы",
  equipment: "Оборудование",
  delivery: "Доставка и логистика",
};

function sections(rows: readonly ProfessionalBoqRow[]): ProfessionalBoqSection[] {
  const order = ["materials", "labor", "equipment", "delivery"];
  return order.flatMap((category) => {
    const rowIds = rows
      .filter((row) => {
        if (category === "materials") return row.rowType === "material";
        if (category === "labor") return row.rowType === "labor" || row.rowType === "work";
        if (category === "equipment") return row.rowType === "equipment" || row.rowType === "service";
        return row.rowType === "transport" || row.rowType === "other";
      })
      .map((row) => row.rowId);
    return rowIds.length > 0
      ? [{ id: category, title: SECTION_TITLES[category], rowIds }]
      : [];
  });
}

function affectedRowIds(
  parameterId: string,
  rows: readonly ProfessionalBoqRow[],
): string[] {
  const definition = ELECTRICAL_CANONICAL_PARAMETER_DEFINITIONS.find(
    (candidate) => candidate.key === parameterId,
  );
  if (!definition) return [];
  return rows
    .filter((row) => {
      const declaredByPrefix = definition.affectsRowCodePrefixes.some((prefix) =>
        row.rowId === prefix || row.rowId.startsWith(`${prefix}__`)
      );
      const traceParameters = /(?:^|;\s*)parameters=([^;]*)/.exec(
        row.calculationTrace ?? "",
      )?.[1]
        ?.split(",")
        .map((key) => key.trim())
        .filter(Boolean) ?? [];
      return declaredByPrefix || traceParameters.includes(parameterId);
    })
    .map((row) => row.rowId);
}

function canonicalElectricalRawInputFacts(
  rawInput: string,
  session: CanonicalParameterSession,
): RawInputFactExtraction {
  const lowerRawInput = rawInput.toLocaleLowerCase("ru-RU");
  return {
    raw_input: rawInput,
    facts: session.parameters.flatMap((parameter) => {
      if (
        parameter.source !== "TEXT_EXTRACTED" ||
        parameter.value == null ||
        !parameter.sourceText?.trim()
      ) {
        return [];
      }
      const rawText = parameter.sourceText.trim();
      const evidenceStart = Math.max(
        0,
        lowerRawInput.indexOf(rawText.toLocaleLowerCase("ru-RU")),
      );
      const affectedFormulas = parameter.affectsFormula.length > 0
        ? [...parameter.affectsFormula]
        : parameter.affectsRows.map((rowId) => `row:${rowId}`);
      return [{
        fact_id: `raw_fact:${ELECTRICAL_CANONICAL_WORK_KEY}:${parameter.parameterId}`,
        canonical_parameter_key: parameter.parameterId,
        raw_text: rawText,
        normalized_value: parameter.value,
        normalized_unit: parameter.unit,
        evidence_start: evidenceStart,
        evidence_end: evidenceStart + rawText.length,
        confidence: parameter.confidence,
        source: "USER_RAW_INPUT" as const,
        requires_confirmation: false,
        passport_owner: ELECTRICAL_CANONICAL_WORK_KEY,
        affected_formulas: affectedFormulas,
      }];
    }),
    metrics: {
      explicit_input_facts_ignored: 0,
      explicit_input_unit_mismatches: 0,
      explicit_input_facts_overwritten_by_default: 0,
    },
  };
}

function toLegacyDraftSession(input: {
  canonical: CanonicalParameterSession;
  draftId: string;
  rawInput: string;
  revisionId: string;
}): EstimateDraftSession {
  const parameters: Record<string, EstimateDraftSessionParameterValue> = Object.fromEntries(
    input.canonical.parameters
      .filter((parameter) => parameter.value != null)
      .map((parameter) => [parameter.parameterId, {
        value: parameter.value!,
        ...(parameter.unit ? { unit: parameter.unit } : {}),
        origin: parameter.source === "ASSUMED"
          ? "PROJECT_DERIVED"
          : "USER_ENTERED",
        confirmedAt: parameter.source === "ASSUMED" ? null : input.canonical.updatedAt,
        sourceText: parameter.sourceText ?? undefined,
        requiresConfirmation: parameter.source === "ASSUMED",
      }]),
  );
  let session = selectEstimateDraftWork(
    createEstimateDraftSession({ draftId: input.draftId }),
    {
      catalogWorkId: ELECTRICAL_CANONICAL_WORK_KEY,
      canonicalWorkKey: ELECTRICAL_CANONICAL_WORK_KEY,
      source: "FREE_TEXT",
      scopeRequired: false,
      parameters,
    },
  );
  const scope = ELECTRICAL_CANONICAL_PROFILE.scopePresets[0];
  session = bindEstimateDraftScope(session, {
    scopePresetId: ELECTRICAL_CANONICAL_SCOPE_PRESET_ID,
    calculationStrategyId: scope.calculationStrategyId,
    parameterSchemaVersion: scope.parameterSchemaVersion,
    engineVersion: scope.engineVersion,
    requiredParameterAlternatives: scope.requiredParameterAlternatives.map((alternative) => ({
      alternativeId: alternative.alternativeId,
      parameterKeys: [...alternative.parameterKeys],
    })),
  });
  if (input.canonical.status === "BLOCKING_REQUIRED" || session.status !== "READY_TO_COMPILE") {
    return session;
  }
  const compiling = prepareEstimateCompile(session).session;
  return commitEstimateCompileResult(compiling, {
    draftId: input.draftId,
    selectionEpoch: compiling.selectionEpoch,
    contextHash: compiling.contextHash!,
    revisionId: input.revisionId,
    scopePresetId: compiling.scopePresetId!,
    parameterSchemaVersion: compiling.parameterSchemaVersion!,
    calculationStrategyId: compiling.calculationStrategyId!,
  });
}

export function createCanonicalElectricalEstimateState(input: {
  draftId: string;
  rawInput: string;
  items: readonly ConsumerRepairRequestItem[];
  createdAt: string;
  revisionIndex?: number;
  previousRevisionId?: string | null;
  overrides?: ElectricalCanonicalParameterValues;
  previousCanonicalSession?: CanonicalParameterSession | null;
}): {
  canonicalParameterSession: CanonicalParameterSession;
  electricalCircuitSchedule: ElectricalCircuitScheduleV1;
  estimateDraftRevisionState: EstimateDraftRevisionState;
  estimateDraftSession: EstimateDraftSession;
  revision: EstimateDraftRevision;
} {
  const rows = input.items.map(professionalRow);
  const revisionId = `electrical_revision_${estimateDeterministicHash({
    draftId: input.draftId,
    rawInput: input.rawInput,
    revisionIndex: input.revisionIndex ?? 1,
    previousRevisionId: input.previousRevisionId ?? null,
    overrides: input.overrides ?? {},
    rows: rows.map((row) => ({
      rowId: row.rowId,
      quantity: row.quantity,
      unit: row.unit,
      unitPrice: row.unitPrice,
    })),
    calculationVersion: ELECTRICAL_CANONICAL_CALCULATION_VERSION,
  }).replace(/[^a-z0-9]/gi, "").slice(-20)}`;
  const canonicalParameterSession = buildElectricalCanonicalParameterSession({
    text: input.rawInput,
    overrides: input.overrides,
    draftId: input.draftId,
    revisionId,
    changedAt: input.createdAt,
    previousSession: input.previousCanonicalSession,
  });
  const electricalCircuitSchedule =
    buildElectricalCircuitScheduleV1(canonicalParameterSession);
  // The canonical session has already extracted and source-bound every
  // electrical parameter. Re-running the universal prompt/schema extractor
  // here would both risk collapsing distinct point types and evaluate the
  // global 11,610-work registry on Hermes.
  const rawFacts = canonicalElectricalRawInputFacts(
    input.rawInput,
    canonicalParameterSession,
  );
  const params = Object.fromEntries(
    canonicalParameterSession.parameters
      .filter((parameter) => parameter.value != null)
      .map((parameter) => [parameter.parameterId, {
        value: parameter.value!,
        ...(parameter.unit ? { canonicalUnit: parameter.unit } : {}),
        source: parameter.source === "USER_EXPLICIT"
          ? "edited_by_user" as const
          : parameter.source === "TEXT_EXTRACTED"
            ? "user_input" as const
            : parameter.source === "CALCULATED"
              ? "derived" as const
              : "default_assumption" as const,
        sourceText: parameter.sourceText ?? undefined,
        lastChangedAt: input.createdAt,
      }]),
  );
  const missingInputs = canonicalParameterSession.parameters
    .filter((parameter) => parameter.source === "MISSING")
    .map((parameter) => ({
      key: parameter.parameterId,
      label: parameter.label,
      blocksPreliminaryEstimate:
        parameter.requiredLevel === "BLOCKING_REQUIRED",
      requiredFor: parameter.requiredLevel === "CONDITIONAL"
        ? "safety_review" as const
        : parameter.requiredLevel === "CONTRACT_REQUIRED"
          ? "contract_ready" as const
          : "better_accuracy" as const,
    }));
  const assumptions = canonicalParameterSession.parameters
    .filter((parameter) => parameter.source === "ASSUMED")
    .map((parameter) => ({
      key: parameter.parameterId,
      value: parameter.value,
      reason: parameter.assumption ?? `Предварительное значение: ${parameter.label}`,
      replacedByUserInput: false,
      visibleToUser: true as const,
    }));
  const resolvedIdentityWithoutChecksum = {
    requestedCatalogWorkId: ELECTRICAL_CANONICAL_WORK_KEY,
    passportId: ELECTRICAL_CANONICAL_PROFILE.workPassportId,
    passportVersion: ELECTRICAL_CANONICAL_PROFILE.registrationVersion,
    parameterSchemaId: ELECTRICAL_CANONICAL_PARAMETER_SCHEMA_ID,
    parameterSchemaVersion: ELECTRICAL_CANONICAL_PARAMETER_SCHEMA_ID,
    calculationStrategyId: ELECTRICAL_CANONICAL_CALCULATION_VERSION,
    canonicalModelId: ELECTRICAL_CANONICAL_WORK_KEY,
    canonicalModelVersion: ELECTRICAL_CANONICAL_PROFILE.registrationVersion,
    selectedScope: ELECTRICAL_CANONICAL_SCOPE_PRESET_ID,
    scopePresetId: ELECTRICAL_CANONICAL_SCOPE_PRESET_ID,
    resolvedParameters: params,
    formulaGraphVersion: ELECTRICAL_CANONICAL_PROFILE.formulaGraphVersion,
    compilerVersion: ELECTRICAL_CANONICAL_PROFILE.scopePresets[0].engineVersion,
    sourceBindingVersions: [{
      sourceId: ELECTRICAL_CANONICAL_PARAMETER_SCHEMA_ID,
      version: ELECTRICAL_CANONICAL_PROFILE.registrationVersion,
    }],
    semanticOwner: ELECTRICAL_CANONICAL_PROFILE.workPassportId,
    originalPrompt: input.rawInput,
    legacyFallbackUsed: false,
    fallbackReason: null,
    projectionOwner: "estimate_draft_revision" as const,
  };
  const revision: EstimateDraftRevision = {
    estimateDraftId: input.draftId,
    revisionId,
    previousRevisionId: input.previousRevisionId ?? null,
    source: input.previousRevisionId ? "param_edit" : "initial_prompt",
    rawInput: input.rawInput,
    selectedTemplateId: ELECTRICAL_CANONICAL_WORK_KEY,
    matchedFamily: ELECTRICAL_CANONICAL_WORK_KEY,
    professionalWorkId: ELECTRICAL_CANONICAL_WORK_KEY,
    workAssemblyId: ELECTRICAL_CANONICAL_SCOPE_PRESET_ID,
    resolvedIdentity: {
      ...resolvedIdentityWithoutChecksum,
      checksum: estimateDeterministicHash(resolvedIdentityWithoutChecksum),
    },
    quantityBasis: null,
    workSpecificParameterSchemaId: ELECTRICAL_CANONICAL_PARAMETER_SCHEMA_ID,
    workSpecificParameterSignature: canonicalParameterSession.parameters.map(
      (parameter) => parameter.parameterId,
    ),
    applicableBoqSignature: estimateDeterministicHash(rows.map((row) => ({
      rowId: row.rowId,
      quantity: row.quantity,
      unit: row.unit,
    }))),
    legacyRowsCount: 0,
    estimateLevel: canonicalParameterSession.status === "BLOCKING_REQUIRED"
      ? "NEEDS_INPUT"
      : "SOURCE_BACKED_PROFESSIONAL_BOQ",
    rawInputFacts: rawFacts.facts,
    rawInputFactMetrics: rawFacts.metrics,
    params,
    assumptions,
    missingInputs,
    professionalClarification: null,
    electricalCircuitSchedule,
    boq: {
      sections: sections(rows),
      rows,
    },
    trace: {
      traceId: `electrical_trace_${revisionId}`,
      revisionId,
      selectedTemplateId: ELECTRICAL_CANONICAL_WORK_KEY,
      params: canonicalParameterSession.parameters
        .filter((parameter) => parameter.value != null)
        .map((parameter) => ({
          key: parameter.parameterId,
          value: parameter.value!,
          ...(parameter.unit ? { canonicalUnit: parameter.unit } : {}),
          source: params[parameter.parameterId].source,
          affectsRowIds: affectedRowIds(parameter.parameterId, rows),
        })),
      rows: rows.map((row) => ({
        rowId: row.rowId,
        formulaId: row.formulaId,
        quantityFormula: row.quantityFormula,
        calculationTrace: row.calculationTrace,
        resultQuantity: row.quantity,
        sourceParamKeys: canonicalParameterSession.parameters
          .filter((parameter) =>
            affectedRowIds(parameter.parameterId, [row]).length > 0
          )
          .map((parameter) => parameter.parameterId),
      })),
      staleTraceAccepted: false,
    },
    status: canonicalParameterSession.status === "BLOCKING_REQUIRED"
      ? "blocking_required"
      : "draft_ready",
    artifacts: {
      snapshotId: null,
      pdfArtifactId: null,
      buyerHandoffId: null,
      artifactsValidForRevisionId: null,
    },
  };
  return {
    canonicalParameterSession,
    electricalCircuitSchedule,
    estimateDraftRevisionState: {
      estimateDraftId: input.draftId,
      currentRevisionId: revisionId,
      revisions: [revision],
      diffs: [],
    },
    estimateDraftSession: toLegacyDraftSession({
      canonical: canonicalParameterSession,
      draftId: input.draftId,
      rawInput: input.rawInput,
      revisionId,
    }),
    revision,
  };
}

export function diffCanonicalElectricalRevisions(
  previous: EstimateDraftRevision,
  next: EstimateDraftRevision,
): EstimateDraftRevisionDiff {
  const previousRows = new Map(previous.boq.rows.map((row) => [row.rowId, row]));
  const nextRows = new Map(next.boq.rows.map((row) => [row.rowId, row]));
  const rowIds = new Set([...previousRows.keys(), ...nextRows.keys()]);
  const changedRows = [...rowIds].flatMap((rowId) => {
    const before = previousRows.get(rowId);
    const after = nextRows.get(rowId);
    if (
      before?.quantity === after?.quantity &&
      before?.unitPrice === after?.unitPrice &&
      before?.titleRu === after?.titleRu
    ) {
      return [];
    }
    return [{
      rowId,
      titleRu: after?.titleRu ?? before?.titleRu ?? rowId,
      beforeQuantity: before?.quantity ?? null,
      afterQuantity: after?.quantity ?? null,
      unit: after?.unit ?? before?.unit ?? "set",
    }];
  });
  const parameterIds = new Set([
    ...Object.keys(previous.params),
    ...Object.keys(next.params),
  ]);
  const changedParams = [...parameterIds].flatMap((key) => {
    const before = previous.params[key]?.value ?? null;
    const after = next.params[key]?.value ?? null;
    return before === after ? [] : [{ key, before, after }];
  });
  return {
    fromRevisionId: previous.revisionId,
    toRevisionId: next.revisionId,
    changedParams,
    changedRows,
    changedRowsCount: changedRows.length,
    staleArtifactsAfterEdit: {
      snapshotInvalidated: true,
      pdfInvalidated: true,
      buyerHandoffInvalidated: true,
    },
  };
}

export function canonicalElectricalOverridesFromBundle(
  bundle: ConsumerRepairDraftBundle,
): ElectricalCanonicalParameterValues {
  const session = bundle.canonicalParameterSession;
  if (!session || session.canonicalWorkKey !== ELECTRICAL_CANONICAL_WORK_KEY) return {};
  return Object.fromEntries(
    session.parameters
      .filter((parameter) =>
        parameter.value != null &&
        parameter.source === "USER_EXPLICIT"
      )
      .map((parameter) => [parameter.parameterId, parameter.value]),
  ) as ElectricalCanonicalParameterValues;
}
