import type { ProfessionalMaterialQuantityLine } from "./professionalMaterialQuantityContract";
import type { RawInputFact, RawInputFactExtractionMetrics } from "./rawInputFactExtraction";
import type { AsphaltClarificationExperienceV4, RoadScopeRevisionBindingV4 } from "./v4/asphalt";
import type {
  ElectricalCircuitScheduleV1,
} from "./v4/electrical/electricalCircuitScheduleV1";

export type EstimateDraftRevisionSource =
  | "initial_prompt"
  | "param_edit"
  | "param_batch"
  | "param_add"
  | "template_change"
  | "assumption_override";

export type EstimateDraftRevisionParamSource =
  | "user_input"
  | "edited_by_user"
  | "default_assumption"
  | "derived";

export type EstimateDraftRevisionParamValue = number | string | boolean;

export type EstimateDraftRevisionParam = {
  value: EstimateDraftRevisionParamValue;
  canonicalUnit?: string;
  source: EstimateDraftRevisionParamSource;
  sourceText?: string;
  lastChangedAt: string;
};

export type EstimateDraftRevisionAssumption = {
  key: string;
  value: unknown;
  reason: string;
  replacedByUserInput: boolean;
  visibleToUser: true;
};

export type EstimateDraftRevisionMissingInput = {
  key: string;
  label: string;
  blocksPreliminaryEstimate: boolean;
  requiredFor: "better_accuracy" | "contract_ready" | "safety_review";
};

export type ProfessionalBoqSection = {
  id: string;
  title: string;
  rowIds: string[];
};

export type ProfessionalBoqRow = {
  rowId: string;
  rowType: "work" | "material" | "service" | "equipment" | "transport" | "labor" | "document" | "other";
  titleRu: string;
  quantity: number;
  unit: string;
  unitLabel?: string | null;
  unitPrice?: number | null;
  currency: string;
  category?: string | null;
  sourceId?: string | null;
  sourceLabel?: string | null;
  formulaId?: string | null;
  quantityFormula?: string | null;
  calculationTrace?: string | null;
  sourceParameters?: Record<string, unknown> | null;
  templateId?: string | null;
  templateVersion?: string | null;
  normId?: string | null;
  normFamilyId?: string | null;
  normSourceId?: string | null;
  normSourceTitle?: string | null;
  normVersion?: string | null;
  normReviewStatus?: string | null;
  priceStatus?: string | null;
  priceSource?: string | null;
  priceSourceId?: string | null;
  priceSourceLabel?: string | null;
  materialKey?: string | null;
  rateKey?: string | null;
  includedInProcurement: boolean;
  materialQuantity?: ProfessionalMaterialQuantityLine | null;
};

export type ParamToCalculationTraceParam = {
  key: string;
  value: EstimateDraftRevisionParamValue;
  canonicalUnit?: string;
  source: EstimateDraftRevisionParamSource;
  affectsRowIds: string[];
};

export type ParamToCalculationTraceRow = {
  rowId: string;
  formulaId?: string | null;
  quantityFormula?: string | null;
  calculationTrace?: string | null;
  resultQuantity: number;
  sourceParamKeys: string[];
};

export type ParamToCalculationTrace = {
  traceId: string;
  revisionId: string;
  selectedTemplateId: string;
  params: ParamToCalculationTraceParam[];
  rows: ParamToCalculationTraceRow[];
  staleTraceAccepted: false;
};

export type EstimateDraftRevisionStatus =
  | "draft_ready"
  | "needs_template_selection"
  | "blocking_required"
  | "needs_more_params_but_preliminary_available"
  | "failed";

export type EstimateDraftRevisionEstimateLevel =
  | "NEEDS_INPUT"
  | "CONCEPT_SCOPE"
  | "PRELIMINARY_QUANTITY_BOQ"
  | "SOURCE_BACKED_PROFESSIONAL_BOQ"
  | "EXPERT_VALIDATED_BOQ";

export type EstimateDraftRevisionArtifacts = {
  snapshotId: string | null;
  pdfArtifactId: string | null;
  buyerHandoffId: string | null;
  artifactsValidForRevisionId: string | null;
};

export type EstimateDraftRevisionQuantityBasis = {
  basisType: "project" | "reference";
  length_m: number | null;
  width_m: number | null;
  area_m2: number;
  source: "raw_input" | "revision" | "confirmed_parameter" | "reference_policy";
  formulaTrace: string;
  assumptionIds: string[];
};

export type EstimateResolvedIdentity = {
  requestedCatalogWorkId: string | null;
  passportId: string;
  passportVersion?: string;
  parameterSchemaId?: string;
  parameterSchemaVersion?: string;
  calculationStrategyId: string;
  canonicalModelId: string;
  canonicalModelVersion: string;
  selectedScope: string | null;
  scopePresetId: string | null;
  resolvedParameters: Record<string, EstimateDraftRevisionParam>;
  formulaGraphVersion: string;
  compilerVersion: string;
  sourceBindingVersions: Array<{
    sourceId: string;
    version: string;
  }>;
  semanticOwner: string;
  originalPrompt: string;
  legacyFallbackUsed?: boolean;
  fallbackReason?: string | null;
  projectionOwner?: "estimate_draft_revision";
  checksum: string;
};

export type EstimateDraftRevision = {
  estimateDraftId: string;
  revisionId: string;
  previousRevisionId: string | null;
  source: EstimateDraftRevisionSource;
  rawInput: string;
  selectedTemplateId: string;
  matchedFamily: string;
  professionalWorkId?: string | null;
  workAssemblyId?: string | null;
  resolvedIdentity?: EstimateResolvedIdentity;
  roadScopeBinding?: RoadScopeRevisionBindingV4 | null;
  quantityBasis?: EstimateDraftRevisionQuantityBasis | null;
  workSpecificParameterSchemaId?: string | null;
  workSpecificParameterSignature?: string[];
  applicableBoqSignature?: string | null;
  legacyRowsCount?: number;
  estimateLevel: EstimateDraftRevisionEstimateLevel;
  rawInputFacts: RawInputFact[];
  rawInputFactMetrics: RawInputFactExtractionMetrics;
  params: Record<string, EstimateDraftRevisionParam>;
  assumptions: EstimateDraftRevisionAssumption[];
  missingInputs: EstimateDraftRevisionMissingInput[];
  professionalClarification?: AsphaltClarificationExperienceV4 | null;
  electricalCircuitSchedule?: ElectricalCircuitScheduleV1 | null;
  boq: {
    sections: ProfessionalBoqSection[];
    rows: ProfessionalBoqRow[];
  };
  trace: ParamToCalculationTrace;
  status: EstimateDraftRevisionStatus;
  artifacts: EstimateDraftRevisionArtifacts;
};

export type EstimateDraftRevisionDiff = {
  fromRevisionId: string;
  toRevisionId: string;
  changedParams: {
    key: string;
    before: EstimateDraftRevisionParamValue | null;
    after: EstimateDraftRevisionParamValue | null;
  }[];
  changedRows: {
    rowId: string;
    titleRu: string;
    beforeQuantity: number | null;
    afterQuantity: number | null;
    unit: string;
  }[];
  changedRowsCount: number;
  staleArtifactsAfterEdit: {
    snapshotInvalidated: boolean;
    pdfInvalidated: boolean;
    buyerHandoffInvalidated: boolean;
  };
};

export type EstimateDraftRevisionState = {
  estimateDraftId: string;
  currentRevisionId: string;
  revisions: EstimateDraftRevision[];
  diffs: EstimateDraftRevisionDiff[];
};
