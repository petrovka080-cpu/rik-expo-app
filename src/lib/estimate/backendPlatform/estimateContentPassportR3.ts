export const ESTIMATE_CONTENT_PASSPORT_R3_CONTRACT =
  "real-professional-estimates-r3.content-passport.v1" as const;

export type EstimateContentGroupR3 =
  | "material"
  | "construction_work"
  | "machine_equipment"
  | "delivery";

export type EstimateContentIdentityModeR3 = "WORK" | "ALIAS_ONLY" | "REDIRECT";
export type EstimateContentProvenanceKindR3 =
  | "CANONICAL_PHYSICAL_RESOURCE"
  | "EXPLICIT_CONSTRUCTION_OPERATION"
  | "EXPLICIT_EQUIPMENT"
  | "EXPLICIT_CARGO_DELIVERY"
  | "SPECIALIZED_MEASURABLE_SERVICE"
  | "SEARCH_ALIAS"
  | "SIBLING_IDENTITY"
  | "ENGLISH_KEYWORD"
  | "QA_TERM"
  | "DOCUMENT_TERM";

export type EstimateContentCapabilityR3 = {
  group: EstimateContentGroupR3;
  status: "INCLUDED" | "OPTIONAL" | "NOT_APPLICABLE";
  reasonRu: string;
};

export type EstimateContentParameterR3 = {
  parameterId: string;
  titleRu: string;
  guideRu: string;
  visibilityRole: "USER_INPUT" | "INTERNAL_ONLY";
  formulaConsumerIds: readonly string[];
  resourceConsumerIds: readonly string[];
};

export type EstimateContentFormulaR3 = {
  formulaId: string;
  outputUnitId: string;
  expressionSource: string;
  inputParameterIds: readonly string[];
};

export type EstimateContentResourceR3 = {
  rowId: string;
  group: EstimateContentGroupR3;
  titleRu: string;
  unitId: string;
  formulaId: string;
  semanticOwnerId: string;
  costOwnerId: string;
  resourceIdentity: string;
  provenanceKind: EstimateContentProvenanceKindR3;
  generationAxes: readonly string[];
  costingMode: "OWN_COST" | "INCLUDED_IN_PARENT";
  procurementEligible: boolean;
  normativeSource: {
    sourceKey: string;
    locator: string;
  };
  delivery?: {
    cargoRu: string;
    vehicleRu: string;
    physicalQuantityFormulaId: string;
    distanceParameterId: string;
  };
};

export type EstimateContentPassportR3 = {
  contract: typeof ESTIMATE_CONTENT_PASSPORT_R3_CONTRACT;
  catalogId: string;
  titleRu: string;
  identityMode: EstimateContentIdentityModeR3;
  redirectCatalogId?: string | null;
  aliasesRu: readonly string[];
  physicalResultRu: string;
  includedScopeRu: readonly string[];
  excludedScopeRu: readonly string[];
  parameters: readonly EstimateContentParameterR3[];
  formulas: readonly EstimateContentFormulaR3[];
  resources: readonly EstimateContentResourceR3[];
  capabilityMatrix: readonly EstimateContentCapabilityR3[];
};

export type EstimateContentPassportDecisionR3 = {
  contract: typeof ESTIMATE_CONTENT_PASSPORT_R3_CONTRACT;
  allowed: boolean;
  status: "GREEN" | "RED";
  errors: readonly string[];
  metrics: {
    resourceCount: number;
    userInputCount: number;
    groups: Readonly<Record<EstimateContentGroupR3, number>>;
    genericCartesianRows: number;
    rawInternalUnitRows: number;
    duplicateSemanticOwners: number;
    duplicateOwnCostOwners: number;
  };
};

const GROUPS: readonly EstimateContentGroupR3[] = [
  "material",
  "construction_work",
  "machine_equipment",
  "delivery",
];
const PHYSICAL_PROVENANCE = new Set<EstimateContentProvenanceKindR3>([
  "CANONICAL_PHYSICAL_RESOURCE",
  "EXPLICIT_CONSTRUCTION_OPERATION",
  "EXPLICIT_EQUIPMENT",
  "EXPLICIT_CARGO_DELIVERY",
  "SPECIALIZED_MEASURABLE_SERVICE",
]);
const FORBIDDEN_GENERATION_AXES = new Set([
  "alias",
  "search_alias",
  "sibling",
  "sibling_title",
  "english_keyword",
  "qa_term",
  "document_term",
]);
const FORBIDDEN_UNITS = new Set([
  "worker_h",
  "man_hour",
  "machine_h",
  "test",
  "document",
  "connection",
  "service",
]);
const FORBIDDEN_TITLE = /(?:выполнени|обмер|подтверждени|рабочая детализац|контрол|журнал|акт\b|фотофиксац|мониторинг|координац|организац.{0,20}поток|поставк[аи] состава|сметное сопровождени|налоговая строка)/iu;
const GENERIC_TITLE = /^(?:материал(?:ы)?|механизм|машина|оборудование|логистика|доставка|работа|услуга|material(?:s)?|machine|equipment|delivery|work|service)$/iu;

function normalized(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("ru-RU").replaceAll("ё", "е").trim();
}

function nonBlank(value: string): boolean {
  return value.trim().length > 0;
}

function duplicateCount(values: readonly string[]): number {
  const seen = new Set<string>();
  let duplicates = 0;
  for (const value of values) {
    if (seen.has(value)) duplicates += 1;
    else seen.add(value);
  }
  return duplicates;
}

function hasCyrillic(value: string): boolean {
  return /[а-яё]/iu.test(value);
}

export function evaluateEstimateContentPassportR3(
  passport: EstimateContentPassportR3,
): EstimateContentPassportDecisionR3 {
  const errors: string[] = [];
  const add = (code: string): void => {
    errors.push(code);
  };
  if (passport.contract !== ESTIMATE_CONTENT_PASSPORT_R3_CONTRACT) add("CONTENT_CONTRACT_DRIFT");
  if (!nonBlank(passport.catalogId)) add("CATALOG_ID_MISSING");
  if (!nonBlank(passport.titleRu) || !hasCyrillic(passport.titleRu)) add("CANONICAL_RU_TITLE_MISSING");

  const searchOnly = passport.identityMode === "ALIAS_ONLY" || passport.identityMode === "REDIRECT";
  if (passport.identityMode === "REDIRECT" && !nonBlank(passport.redirectCatalogId ?? "")) {
    add("REDIRECT_TARGET_MISSING");
  }
  if (searchOnly && passport.resources.length > 0) add("SEARCH_IDENTITY_HAS_ESTIMATE_ROWS");
  if (searchOnly && passport.parameters.length > 0) add("SEARCH_IDENTITY_HAS_ESTIMATE_PARAMETERS");
  if (!searchOnly) {
    if (!nonBlank(passport.physicalResultRu) || !hasCyrillic(passport.physicalResultRu)) add("PHYSICAL_RESULT_MISSING");
    if (passport.includedScopeRu.length === 0 || passport.includedScopeRu.some((value) => !nonBlank(value))) add("INCLUDED_SCOPE_MISSING");
    if (passport.excludedScopeRu.length === 0 || passport.excludedScopeRu.some((value) => !nonBlank(value))) add("EXCLUDED_SCOPE_MISSING");
    if (passport.resources.length === 0) add("PHYSICAL_RESOURCE_GRAPH_EMPTY");
  }

  const formulaById = new Map(passport.formulas.map((formula) => [formula.formulaId, formula]));
  const resourceById = new Map(passport.resources.map((resource) => [resource.rowId, resource]));
  const parameterIds = new Set(passport.parameters.map((parameter) => parameter.parameterId));
  if (parameterIds.size !== passport.parameters.length) add("DUPLICATE_PARAMETER_ID");
  if (formulaById.size !== passport.formulas.length) add("DUPLICATE_FORMULA_ID");
  for (const formula of passport.formulas) {
    if (!nonBlank(formula.formulaId) || !nonBlank(formula.expressionSource) || !nonBlank(formula.outputUnitId)) {
      add(`FORMULA_INCOMPLETE:${formula.formulaId}`);
    }
    for (const inputId of formula.inputParameterIds) {
      if (!parameterIds.has(inputId)) add(`FORMULA_UNKNOWN_PARAMETER:${formula.formulaId}:${inputId}`);
    }
  }

  const userInputs = passport.parameters.filter((parameter) => parameter.visibilityRole === "USER_INPUT");
  if (!searchOnly && userInputs.length === 0) add("USER_INPUT_SCHEMA_EMPTY");
  for (const parameter of userInputs) {
    if (!hasCyrillic(parameter.titleRu)) add(`USER_INPUT_RU_TITLE_MISSING:${parameter.parameterId}`);
    if (parameter.guideRu.trim().length < 12) add(`USER_INPUT_GUIDE_MISSING:${parameter.parameterId}`);
    if (parameter.formulaConsumerIds.length + parameter.resourceConsumerIds.length === 0) {
      add(`USER_INPUT_UNUSED:${parameter.parameterId}`);
    }
    for (const formulaId of parameter.formulaConsumerIds) {
      if (!formulaById.has(formulaId)) add(`PARAMETER_UNKNOWN_FORMULA_CONSUMER:${parameter.parameterId}:${formulaId}`);
    }
    for (const resourceId of parameter.resourceConsumerIds) {
      if (!resourceById.has(resourceId)) add(`PARAMETER_UNKNOWN_RESOURCE_CONSUMER:${parameter.parameterId}:${resourceId}`);
    }
  }

  const groupCounts = Object.fromEntries(GROUPS.map((group) => [group, 0])) as Record<EstimateContentGroupR3, number>;
  let genericCartesianRows = 0;
  let rawInternalUnitRows = 0;
  for (const resource of passport.resources) {
    groupCounts[resource.group] += 1;
    const title = normalized(resource.titleRu);
    const invalidProvenance = !PHYSICAL_PROVENANCE.has(resource.provenanceKind);
    const invalidAxis = resource.generationAxes.some((axis) => FORBIDDEN_GENERATION_AXES.has(normalized(axis)));
    const invalidTitle = FORBIDDEN_TITLE.test(title) || GENERIC_TITLE.test(title);
    if (invalidProvenance || invalidAxis || invalidTitle) {
      genericCartesianRows += 1;
      add(`GENERIC_CARTESIAN_RESOURCE:${resource.rowId}`);
    }
    if (!hasCyrillic(resource.titleRu)) add(`RAW_ENGLISH_RESOURCE_TITLE:${resource.rowId}`);
    if (FORBIDDEN_UNITS.has(normalized(resource.unitId)) || /_per_unit$/iu.test(resource.unitId)) {
      rawInternalUnitRows += 1;
      add(`RAW_INTERNAL_RESOURCE_UNIT:${resource.rowId}:${resource.unitId}`);
    }
    if (!formulaById.has(resource.formulaId)) add(`RESOURCE_FORMULA_MISSING:${resource.rowId}:${resource.formulaId}`);
    if (!nonBlank(resource.normativeSource.sourceKey) || !nonBlank(resource.normativeSource.locator)) {
      add(`RESOURCE_NORMATIVE_SOURCE_MISSING:${resource.rowId}`);
    }
    if (!nonBlank(resource.semanticOwnerId)) add(`SEMANTIC_OWNER_MISSING:${resource.rowId}`);
    if (!nonBlank(resource.costOwnerId)) add(`COST_OWNER_MISSING:${resource.rowId}`);
    if (!nonBlank(resource.resourceIdentity)) add(`RESOURCE_IDENTITY_MISSING:${resource.rowId}`);
    if (resource.group === "delivery") {
      if (!resource.delivery || !nonBlank(resource.delivery.cargoRu) || !nonBlank(resource.delivery.vehicleRu)
        || !nonBlank(resource.delivery.physicalQuantityFormulaId) || !nonBlank(resource.delivery.distanceParameterId)) {
        add(`DELIVERY_FLOW_INCOMPLETE:${resource.rowId}`);
      } else {
        if (!formulaById.has(resource.delivery.physicalQuantityFormulaId)) {
          add(`DELIVERY_PHYSICAL_FORMULA_MISSING:${resource.rowId}`);
        }
        if (!parameterIds.has(resource.delivery.distanceParameterId)) {
          add(`DELIVERY_DISTANCE_PARAMETER_MISSING:${resource.rowId}`);
        }
      }
    } else if (resource.delivery) {
      add(`DELIVERY_METADATA_ON_NON_DELIVERY_ROW:${resource.rowId}`);
    }
  }

  const duplicateRowIds = duplicateCount(passport.resources.map((resource) => resource.rowId));
  const duplicateSemanticOwners = duplicateCount(passport.resources.map((resource) => resource.semanticOwnerId));
  const duplicateOwnCostOwners = duplicateCount(passport.resources
    .filter((resource) => resource.costingMode === "OWN_COST")
    .map((resource) => resource.costOwnerId));
  if (duplicateRowIds > 0) add(`DUPLICATE_ROW_ID:${duplicateRowIds}`);
  if (duplicateSemanticOwners > 0) add(`DUPLICATE_SEMANTIC_OWNER:${duplicateSemanticOwners}`);
  if (duplicateOwnCostOwners > 0) add(`DUPLICATE_OWN_COST_OWNER:${duplicateOwnCostOwners}`);

  const capabilityByGroup = new Map(passport.capabilityMatrix.map((capability) => [capability.group, capability]));
  if (capabilityByGroup.size !== GROUPS.length) add("CAPABILITY_MATRIX_INCOMPLETE");
  for (const group of GROUPS) {
    const capability = capabilityByGroup.get(group);
    if (!capability) continue;
    if (!nonBlank(capability.reasonRu)) add(`CAPABILITY_REASON_MISSING:${group}`);
    if (groupCounts[group] === 0 && capability.status !== "NOT_APPLICABLE") {
      add(`CAPABILITY_DECLARED_WITHOUT_ROWS:${group}`);
    }
    if (groupCounts[group] > 0 && capability.status === "NOT_APPLICABLE") {
      add(`ROWS_PRESENT_FOR_NOT_APPLICABLE_CAPABILITY:${group}`);
    }
  }

  const uniqueErrors = [...new Set(errors)].sort();
  return {
    contract: ESTIMATE_CONTENT_PASSPORT_R3_CONTRACT,
    allowed: uniqueErrors.length === 0,
    status: uniqueErrors.length === 0 ? "GREEN" : "RED",
    errors: uniqueErrors,
    metrics: {
      resourceCount: passport.resources.length,
      userInputCount: userInputs.length,
      groups: groupCounts,
      genericCartesianRows,
      rawInternalUnitRows,
      duplicateSemanticOwners,
      duplicateOwnCostOwners,
    },
  };
}

export function assertEstimateContentPassportR3(passport: EstimateContentPassportR3): void {
  const decision = evaluateEstimateContentPassportR3(passport);
  if (!decision.allowed) throw new Error(`ESTIMATE_CONTENT_PASSPORT_R3_RED:${decision.errors.join("|")}`);
}
