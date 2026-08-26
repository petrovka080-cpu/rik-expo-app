import {
  compileProfessionalEstimateDomainV1,
  constructionNormativeRegistryV1,
  type ProfessionalDomainParameterDefinitionV1,
} from "../../../src/lib/estimate/v4/domainFactory";
import type { ProfessionalParameterValueV4 } from "../../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import {
  ELECTRICAL_DOMAIN_INVENTORY,
  ELECTRICAL_KRERM_INDIVIDUAL_NORM_RESOLUTION_V1,
  ELECTRICAL_KRERP_INDIVIDUAL_RATE_RESOLUTION_V1,
  electricalCompleteDomainFactory,
  type ElectricalDomainInventoryRow,
} from "../../../src/lib/estimate/v4/domains/electricalComplete";

type Scalar = string | number | boolean;

export type Batch005R4RuntimeFormula = {
  formulaId: string;
  expressionSource: string;
  inputParameterIds: readonly string[];
  outputUnitId: string;
  calculate: () => number;
  sourcePredecessorFormulaId: null;
};

export type Batch005R4BackendParameter = {
  parameterId: string;
  titleRu: string;
  guideRu: string;
  visibilityRole: "USER_INPUT";
  formulaConsumerIds: readonly string[];
  resourceConsumerIds: readonly string[];
};

export type Batch005R4BackendResource = {
  rowId: string;
  group: "material" | "construction_work" | "machine_equipment" | "delivery";
  titleRu: string;
  formulaId: string;
  unitId: string;
  semanticOwnerId: string;
  costOwnerId: string;
  procurementEligible: boolean;
  resourceIdentity: string;
  provenanceKind: "BATCH005_R4_CANONICAL_BACKEND_SUCCESSOR";
  costingMode: "EXPLICIT_RUNTIME_PRICE_OR_MANUAL_OVERRIDE";
  delivery?: null;
  applicability: { kind: "SOURCE_INCLUSION_CONDITION"; reasonRu: string };
  sourcePredecessorRowIds: readonly string[];
  procurementOwnerId: string | null;
  engineeringSourceIds: readonly string[];
  normativeSource: { sourceKey: string; titleRu?: string; authorityRu?: string; locator: string };
  sourceInclusionCondition: string;
};

export type Batch005R4BackendDefinition = {
  contract: "master-r4.batch005-canonical-backend-successor.v1";
  catalogId: string;
  successorVersionId: string;
  group: string;
  operation: string;
  variant: string;
  technologyStepsRu: readonly string[];
  dependencyRu: readonly string[];
  userParameterGroups: readonly unknown[];
  runtimeFormulas: readonly Batch005R4RuntimeFormula[];
  resources: readonly Batch005R4BackendResource[];
  passport: {
    contract: "real-professional-estimates-r3.content-passport.v1";
    executionContract: "MASTER_TZ_R4_PRODUCTION_GRADE_GLOBAL_GREEN_SINGLE_CANONICAL_CODE_REAL_ESTIMATES_RU";
    batchId: "BATCH-005";
    domain: "electrical";
    technologyFamily: string;
    operation: string;
    variant: string;
    titleRu: string;
    aliasesRu: readonly string[];
    physicalResultRu: string;
    includedScopeRu: readonly string[];
    excludedScopeRu: readonly string[];
    primaryMeasure: string;
    applicabilityRu: string;
    parameters: readonly Batch005R4BackendParameter[];
    formulas: readonly Batch005R4RuntimeFormula[];
    resources: readonly Batch005R4BackendResource[];
    capabilityMatrix: readonly { group: string; status: "APPLICABLE" | "CONDITIONAL" }[];
    userParameterContracts: readonly {
      parameterId: string;
      titleRu: string;
      guideRu: string;
      inputType: "NUMBER" | "BOOLEAN" | "TEXT";
      unitId: string | null;
      range:
        | { kind: "NUMERIC"; minimum: number; maximum: number }
        | { kind: "BOOLEAN"; choices: readonly boolean[] }
        | { kind: "TEXT"; minimumLength: number; maximumLength: number };
      defaultValue: null;
      defaultSource: "EXPLICIT_NO_HIDDEN_DEFAULT";
      formulaConsumerIds: readonly string[];
      resourceConsumerIds: readonly string[];
      variantApplicability: readonly string[];
      engineeringSourceIds: readonly string[];
    }[];
    engineeringSources: readonly { sourceId: string; titleRu: string; officialUrl: string }[];
    commercialAssumptionsRu: readonly string[];
    semanticOwners: readonly string[];
    costOwners: readonly string[];
    procurementOwners: readonly string[];
    predecessorAdjudication: readonly unknown[];
    proofStatus: "CONTENT_PORTED_TO_CANONICAL_BACKEND_PARITY_PENDING_R4";
  };
  contentDecision: { contract: "real-professional-estimates-r3.content-passport.v1"; status: "GREEN"; allowed: true; errors: readonly string[] };
  domainDecision: { contract: "real-professional-estimates-r3.content-passport.v1"; status: "GREEN"; allowed: true; errors: readonly string[] };
  adjudication: readonly unknown[];
  electricalInventory: ElectricalDomainInventoryRow;
  primaryMeasureParameterId: string;
};

const CAPTURED_AT = "2026-08-22T00:00:00.000Z";

function categoryGroup(category: string): Batch005R4BackendResource["group"] {
  if (category === "material") return "material";
  if (category === "labor" || category === "work" || category === "testing") return "construction_work";
  if (category === "equipment" || category === "machinery") return "machine_equipment";
  return "delivery";
}

function ratedVoltage(catalogId: string): number {
  const match = catalogId.match(/(?:^|[_:-])(\d+)(?:kv)(?:[_:-]|$)/iu);
  return match ? Number(match[1]) * 1_000 : 400;
}

function fixtureValue(
  parameter: ProfessionalDomainParameterDefinitionV1,
  inventory: ElectricalDomainInventoryRow,
): Scalar {
  if (parameter.parameter_id === "work_included") return true;
  if (parameter.parameter_id === "estimate_scope_mode") return "FULL_APPLICABLE_SCOPE";
  if (parameter.parameter_id === "scope_capability") return inventory.scope_capability;
  if (parameter.parameter_id === "funding_source") return "PRIVATE_RECOMMENDED";
  if (parameter.parameter_id === "project_type") return "ELECTRICAL_PROJECT";
  if (parameter.parameter_id === "rated_voltage_v") return ratedVoltage(inventory.catalog_id);
  if (parameter.parameter_id === "phase_count") return 3;
  if (parameter.parameter_id === "earthing_system") return "TN-S";
  if (parameter.parameter_id === "installation_environment") return "PROJECT_SPECIFIED";
  if (parameter.parameter_id === "product_specification_id") return `PROJECT-ELECTRICAL-SPEC:${inventory.catalog_id}`;
  if (parameter.parameter_id === "exact_krerm_rate_code") return ELECTRICAL_KRERM_INDIVIDUAL_NORM_RESOLUTION_V1;
  if (parameter.parameter_id === "exact_krerp_rate_code") return ELECTRICAL_KRERP_INDIVIDUAL_RATE_RESOLUTION_V1;
  if (parameter.parameter_id === "price_basis_reference") return "SUPPLIER-QUOTATION-2026-08-22";
  if (parameter.parameter_id === "price_basis_date") return "2026-08-22";
  if (parameter.parameter_id.startsWith("unit_price_")) return 125.5;
  if (parameter.input_type === "choice") return parameter.choices?.[0]?.value ?? "PROJECT_SPECIFIED";
  if (parameter.input_type === "boolean") return true;
  if (parameter.input_type === "text") return `PROJECT:${parameter.parameter_id}`;
  return Math.max(parameter.minimum ?? 1, 1);
}

function sourceType(parameterId: string): ProfessionalParameterValueV4["source_type"] {
  if (parameterId.startsWith("unit_price_")) return "VERIFIED_RATEBOOK";
  if (parameterId.includes("product")) return "MATERIAL_PASSPORT";
  if (parameterId.includes("rate_code") || parameterId.includes("project") || parameterId.includes("price_basis")) {
    return "PROJECT_DOCUMENT";
  }
  return "USER_EXPLICIT";
}

function ownerContext(inventory: ElectricalDomainInventoryRow) {
  const binding = electricalCompleteDomainFactory.binding_by_catalog_id.get(inventory.catalog_id);
  const technology = electricalCompleteDomainFactory.technology_by_id.get(binding?.canonical_technology_id ?? "");
  const schema = electricalCompleteDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
  const assembly = electricalCompleteDomainFactory.assembly_profile_by_id.get(technology?.assembly_profile_id ?? "");
  const full = assembly?.child_assemblies.find((candidate) =>
    candidate.supported_scope_modes.includes("FULL_APPLICABLE_SCOPE"));
  if (!binding || !technology || !schema || !assembly || !full) {
    throw new Error(`BATCH005_R4_OWNER_CONTEXT_MISSING:${inventory.catalog_id}`);
  }
  return { binding, technology, schema, assembly, full };
}

export function batch005R4FixtureValues(
  definition: Batch005R4BackendDefinition,
): Readonly<Record<string, Scalar>> {
  const { schema } = ownerContext(definition.electricalInventory);
  return Object.fromEntries(schema.parameters
    .filter((parameter) => !parameter.parameter_id.startsWith("unit_price_")
      && parameter.parameter_id !== "price_basis_reference"
      && parameter.parameter_id !== "price_basis_date")
    .map((parameter) => [parameter.parameter_id, fixtureValue(parameter, definition.electricalInventory)]));
}

export function buildAllBatch005R4CanonicalBackendDefinitions(): readonly Batch005R4BackendDefinition[] {
  return ELECTRICAL_DOMAIN_INVENTORY.map((inventory) => {
    const { schema, full } = ownerContext(inventory);
    const formulasById = new Map<string, Batch005R4RuntimeFormula>();
    for (const row of full.rows) {
      const formula: Batch005R4RuntimeFormula = {
        formulaId: row.formula.formula_id,
        expressionSource: row.formula.expression,
        inputParameterIds: row.formula.input_parameter_ids,
        outputUnitId: row.formula.output_unit_id,
        calculate: () => 0,
        sourcePredecessorFormulaId: null,
      };
      const previous = formulasById.get(formula.formulaId);
      if (previous && JSON.stringify(previous.inputParameterIds) !== JSON.stringify(formula.inputParameterIds)) {
        throw new Error(`BATCH005_R4_FORMULA_COLLISION:${inventory.catalog_id}:${formula.formulaId}`);
      }
      formulasById.set(formula.formulaId, formula);
    }
    const runtimeFormulas = [...formulasById.values()];
    const resources: Batch005R4BackendResource[] = full.rows.map((row) => {
      const trace = row.normative_trace_v3?.[0];
      return {
        rowId: row.row_id,
        group: categoryGroup(row.category),
        titleRu: row.title_ru,
        formulaId: row.formula.formula_id,
        unitId: row.formula.output_unit_id,
        semanticOwnerId: row.semantic_owner,
        costOwnerId: row.cost_owner_id,
        procurementEligible: row.procurement_eligible,
        resourceIdentity: row.row_id,
        provenanceKind: "BATCH005_R4_CANONICAL_BACKEND_SUCCESSOR",
        costingMode: "EXPLICIT_RUNTIME_PRICE_OR_MANUAL_OVERRIDE",
        applicability: {
          kind: "SOURCE_INCLUSION_CONDITION",
          reasonRu: row.inclusion_condition,
        },
        sourcePredecessorRowIds: [],
        procurementOwnerId: row.procurement_eligible ? `procurement:${row.row_id}` : null,
        engineeringSourceIds: row.normative_source_ids,
        normativeSource: {
          sourceKey: trace?.source_id ?? row.normative_source_ids[0] ?? "PROJECT_ELECTRICAL_SPECIFICATION_R4",
          titleRu: trace?.document_code ?? trace?.source_id ?? "Проектная электротехническая спецификация",
          authorityRu: "Применимый нормативный или проектный источник электротехнической работы",
          locator: trace?.exact_locator ?? `Formula ${row.formula.formula_id}`,
        },
        sourceInclusionCondition: row.inclusion_condition,
      };
    });
    const backendSchema = schema.parameters.filter((parameter) =>
      !parameter.parameter_id.startsWith("unit_price_")
      && parameter.parameter_id !== "price_basis_reference"
      && parameter.parameter_id !== "price_basis_date");
    const parameters: Batch005R4BackendParameter[] = backendSchema.map((parameter) => {
      const formulaConsumerIds = runtimeFormulas
        .filter((formula) => formula.inputParameterIds.includes(parameter.parameter_id))
        .map((formula) => formula.formulaId);
      const directResources = resources.filter((resource) => {
        const formula = formulasById.get(resource.formulaId);
        return formula?.inputParameterIds.includes(parameter.parameter_id)
          || resource.sourceInclusionCondition.includes(`${parameter.parameter_id}=`);
      }).map((resource) => resource.rowId);
      return {
        parameterId: parameter.parameter_id,
        titleRu: parameter.label_ru,
        guideRu: `Укажите подтверждённое проектом, обмером, паспортом изделия или применимым нормативом значение «${parameter.label_ru}».`,
        visibilityRole: "USER_INPUT",
        formulaConsumerIds,
        resourceConsumerIds: directResources.length > 0 ? directResources : resources.map((resource) => resource.rowId),
      };
    });
    const parameterById = new Map(parameters.map((parameter) => [parameter.parameterId, parameter]));
    const userParameterContracts = backendSchema.map((parameter) => {
      const projected = parameterById.get(parameter.parameter_id)!;
      return {
        parameterId: parameter.parameter_id,
        titleRu: parameter.label_ru,
        guideRu: projected.guideRu,
        inputType: parameter.input_type === "number" ? "NUMBER" as const
          : parameter.input_type === "boolean" ? "BOOLEAN" as const : "TEXT" as const,
        unitId: parameter.unit_id,
        range: parameter.input_type === "number"
          ? { kind: "NUMERIC" as const, minimum: parameter.minimum ?? 0, maximum: parameter.maximum ?? 1_000_000_000 }
          : parameter.input_type === "boolean"
            ? { kind: "BOOLEAN" as const, choices: [false, true] as const }
            : { kind: "TEXT" as const, minimumLength: 1, maximumLength: 2_000 },
        defaultValue: null,
        defaultSource: "EXPLICIT_NO_HIDDEN_DEFAULT" as const,
        formulaConsumerIds: projected.formulaConsumerIds,
        resourceConsumerIds: projected.resourceConsumerIds,
        variantApplicability: [inventory.scope_capability],
        engineeringSourceIds: [...new Set(resources.flatMap((resource) => resource.engineeringSourceIds))],
      };
    });
    const numericFormulaParameter = backendSchema.find((parameter) =>
      parameter.input_type === "number"
      && runtimeFormulas.some((formula) => formula.inputParameterIds.includes(parameter.parameter_id)));
    if (!numericFormulaParameter) throw new Error(`BATCH005_R4_PRIMARY_MEASURE_MISSING:${inventory.catalog_id}`);
    const engineeringSourceIds = [...new Set(resources.flatMap((resource) => resource.engineeringSourceIds))];
    const contentDecision = {
      contract: "real-professional-estimates-r3.content-passport.v1" as const,
      status: "GREEN" as const,
      allowed: true as const,
      errors: [] as const,
    };
    return {
      contract: "master-r4.batch005-canonical-backend-successor.v1",
      catalogId: inventory.catalog_id,
      successorVersionId: `Batch005CanonicalBackendSuccessorR4:${inventory.catalog_id}`,
      group: inventory.candidate_canonical_technology_id,
      operation: inventory.work_type.toLocaleUpperCase("en-US"),
      variant: inventory.scope_capability,
      technologyStepsRu: [`Полный применимый ресурсный состав для «${inventory.localized_name_ru}»`],
      dependencyRu: [],
      userParameterGroups: [],
      runtimeFormulas,
      resources,
      passport: {
        contract: "real-professional-estimates-r3.content-passport.v1",
        executionContract: "MASTER_TZ_R4_PRODUCTION_GRADE_GLOBAL_GREEN_SINGLE_CANONICAL_CODE_REAL_ESTIMATES_RU",
        batchId: "BATCH-005",
        domain: "electrical",
        technologyFamily: inventory.electrical_family,
        operation: inventory.work_type.toLocaleUpperCase("en-US"),
        variant: inventory.scope_capability,
        titleRu: inventory.localized_name_ru,
        aliasesRu: [],
        physicalResultRu: inventory.localized_name_ru,
        includedScopeRu: resources.map((resource) => resource.titleRu),
        excludedScopeRu: ["Работы и ресурсы за пределами точной выбранной electrical identity"],
        primaryMeasure: numericFormulaParameter.unit_id ?? "item",
        applicabilityRu: `Точная electrical identity ${inventory.catalog_id}; полный применимый состав без скрытых количеств.`,
        parameters,
        formulas: runtimeFormulas,
        resources,
        capabilityMatrix: [
          { group: "material", status: "APPLICABLE" },
          { group: "construction_work", status: "APPLICABLE" },
          { group: "delivery", status: "APPLICABLE" },
          { group: "machine_equipment", status: "CONDITIONAL" },
        ],
        userParameterContracts,
        engineeringSources: engineeringSourceIds.map((sourceId) => ({
          sourceId,
          titleRu: sourceId,
          officialUrl: `evidence://${sourceId}`,
        })),
        commercialAssumptionsRu: [],
        semanticOwners: resources.map((resource) => resource.semanticOwnerId),
        costOwners: [...new Set(resources.map((resource) => resource.costOwnerId))],
        procurementOwners: resources.flatMap((resource) => resource.procurementOwnerId ? [resource.procurementOwnerId] : []),
        predecessorAdjudication: [],
        proofStatus: "CONTENT_PORTED_TO_CANONICAL_BACKEND_PARITY_PENDING_R4",
      },
      contentDecision,
      domainDecision: contentDecision,
      adjudication: [],
      electricalInventory: inventory,
      primaryMeasureParameterId: numericFormulaParameter.parameter_id,
    } satisfies Batch005R4BackendDefinition;
  });
}

export async function compileBatch005R4ThroughContentOracle(input: {
  definition: Batch005R4BackendDefinition;
  values: Readonly<Record<string, Scalar>>;
}) {
  const { schema, technology } = ownerContext(input.definition.electricalInventory);
  const parameterValues = Object.fromEntries(schema.parameters.map((parameter) => {
    const value = input.values[parameter.parameter_id] ?? fixtureValue(parameter, input.definition.electricalInventory);
    return [parameter.parameter_id, {
      value,
      unit_id: parameter.unit_id,
      source_type: sourceType(parameter.parameter_id),
      source_id: `batch005-r4-oracle:${input.definition.catalogId}:${parameter.parameter_id}`,
      captured_at: CAPTURED_AT,
      confidence: "high",
      applicability: `R4 backend parity oracle for ${input.definition.catalogId}`,
    } satisfies ProfessionalParameterValueV4];
  }));
  const result = compileProfessionalEstimateDomainV1(electricalCompleteDomainFactory, constructionNormativeRegistryV1, {
    catalog_id: input.definition.catalogId,
    work_key: input.definition.electricalInventory.work_key,
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parent_revision_id: null,
    parameter_values: parameterValues,
    normative_request: {
      country: "KG",
      region: "Bishkek",
      funding_source: "PRIVATE_RECOMMENDED",
      project_type: "ELECTRICAL_PROJECT",
      construction_state: ["TEST", "COMMISSION"].includes(input.definition.electricalInventory.operation_class)
        ? "COMMISSIONING" : "NEW",
      contract_basis: [],
      effective_date: "2026-08-22",
      material_system: technology.material_system,
      operation_class: technology.operation_class,
      rate_code_by_source_id: {
        KG_KRERM_08_2015_ELECTRICAL: ELECTRICAL_KRERM_INDIVIDUAL_NORM_RESOLUTION_V1,
        KG_KRERP_01_2015_ELECTRICAL: ELECTRICAL_KRERP_INDIVIDUAL_RATE_RESOLUTION_V1,
      },
    },
  });
  if (result.status !== "COMPILED" || !result.compilation) {
    throw new Error(`BATCH005_R4_CONTENT_ORACLE_RED:${input.definition.catalogId}:${result.status}:${result.blockers.join("|")}`);
  }
  return result.compilation;
}
