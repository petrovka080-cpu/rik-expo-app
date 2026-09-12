import {
  NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID,
  NRMCA_CIP31_SELECTED_CONTINGENCY_NORM_ID,
  NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
  NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA,
  constructionNormativeRegistryV1,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../../src/lib/estimate/v4/domainFactory";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import { buildProfessionalWorkPassport } from "../../src/lib/estimate/buildProfessionalWorkPassport";
import type { EstimateDraftRevisionParam } from "../../src/lib/estimate/estimateDraftRevisionContract";
import {
  STRIP_FOUNDATION_GOLD_INPUT,
  compileStripFoundationEstimate,
} from "../../src/lib/estimate/v4/reinforcedConcreteStripFoundationR1";
import { createStripFoundationCanonicalBackendAuditRevision } from "../../scripts/estimate/stripFoundationCanonicalBackendAuditAdapter";

const CAPTURED_AT = "2026-09-12T00:00:00.000Z";

function explicit(
  value: string | number | boolean,
  unitId: string | null = null,
): ProfessionalParameterValueV4 {
  return {
    value,
    unit_id: unitId,
    source_type: "USER_EXPLICIT",
    source_id: `nrmca-cip31-test:${String(value)}`,
    captured_at: CAPTURED_AT,
    confidence: "high",
    applicability: "Exact project fixture for the NRMCA CIP 31 ready-mix order",
  };
}

function exactNrmcaInputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID),
    plan_dimension_concrete_volume_m3: explicit(30, "m3"),
    plan_volume_calculation_reference: explicit("КЖ-4, оси 1-8/А-Д, rev.5"),
    mix_design_or_project_specification_reference: explicit("КЖ-4, примечание 7; mix card RM-25-114"),
    mixture_designation: explicit("B25 W6 F150 P4, RM-25-114"),
    placement_location: explicit("Ленточный фундамент, оси 1-8/А-Д, захватка 1"),
    placement_method: explicit("pump"),
    selected_contingency_percent: explicit(8, "percent"),
    contingency_selection_justification: explicit("Сложная опалубка и остаток в бетононасосе по ППР-12"),
    delivery_schedule_and_truck_capacity: explicit("4 миксера по 8 м³; последний объём уточняется до отправки"),
    producer_order_confirmation: explicit("RM-PRODUCER-2026-0912-17"),
    estimator_approval_reference: explicit("EST-APPROVAL-2026-0912-04"),
    ...changes,
  };
}

function resolve(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "REINFORCED_CONCRETE_STRIP_FOUNDATION",
    operation_class: "ORDER_READY_MIX",
    material_system: "READY_MIX_CONCRETE",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: values,
  });
}

const exactStripFoundationInput = Object.freeze({
  ...STRIP_FOUNDATION_GOLD_INPUT,
  product_profile_id: NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID,
  concrete_order_allowance_percent: 8,
  plan_volume_calculation_reference: "КЖ-4, оси 1-8/А-Д, rev.5",
  mix_design_or_project_specification_reference: "КЖ-4, примечание 7; mix card RM-25-114",
  mixture_designation: "B25 W6 F150 P4, RM-25-114",
  placement_location: "Ленточный фундамент, оси 1-8/А-Д, захватка 1",
  contingency_selection_justification: "Сложная опалубка и остаток в бетононасосе по ППР-12",
  delivery_schedule_and_truck_capacity: "4 миксера по 8 м³; последний объём уточняется до отправки",
  producer_order_confirmation: "RM-PRODUCER-2026-0912-17",
  estimator_approval_reference: "EST-APPROVAL-2026-0912-04",
});

function revisionParam(value: string | number | boolean): EstimateDraftRevisionParam {
  return {
    value,
    source: "user_input",
    sourceText: "Exact NRMCA CIP 31 project fixture",
    lastChangedAt: CAPTURED_AT,
  };
}

describe("NRMCA CIP 31 exact ready-mix order binding", () => {
  test("pins the reviewed source and exposes it through the production source registry", () => {
    expect(NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA).toMatchObject({
      norm_id: NRMCA_CIP31_SELECTED_CONTINGENCY_NORM_ID,
      source_id: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
      source_document_version: "2026.09-nrmca-cip31-order-quantity-primary-review-r2",
      minimum_selected_contingency_percent: 4,
      maximum_selected_contingency_percent: 10,
      automatic_generic_binding_forbidden: true,
    });
    expect(constructionNormativeRegistryV1.get(NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID)).toMatchObject({
      source_type: "WORK_EXECUTION_STANDARD",
      operation_class_applicability: ["ORDER_READY_MIX"],
      material_system_applicability: ["READY_MIX_CONCRETE"],
      product_profile_applicability: [NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID],
    });
  });

  test("requires every project fact and rejects the former 2 percent allowance", () => {
    const { producer_order_confirmation: _removed, ...missingProducerConfirmation } = exactNrmcaInputs();
    expect(resolve(missingProducerConfirmation)).toMatchObject({
      status: "BLOCKED_REQUIRED_INPUTS",
      blockers: ["PROJECT_VALUE_REQUIRED_EXPLICIT:producer_order_confirmation"],
    });
    expect(resolve(exactNrmcaInputs({ selected_contingency_percent: explicit(2, "percent") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: [expect.stringContaining("selected_contingency_percent=2")],
      });
  });

  test("calculates the selected 8 percent order deterministically without using the 4 percent lower bound as a default", () => {
    const first = resolve(exactNrmcaInputs());
    const second = resolve(exactNrmcaInputs());
    expect(first).toMatchObject({
      status: "APPLIED",
      norm_id: NRMCA_CIP31_SELECTED_CONTINGENCY_NORM_ID,
      source_id: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
      calculated_concrete_order_quantity_m3: 32.4,
      produced_parameter_ids: ["concrete_order_quantity_m3"],
    });
    expect(first.parameter_values.concrete_order_quantity_m3).toMatchObject({
      value: 32.4,
      unit_id: "m3",
      source_type: "APPLICABLE_NORM",
      source_id: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
    });
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
  });

  test("routes the applied source into the canonical material and delivery quantities", () => {
    const rows = new Map(compileStripFoundationEstimate(exactStripFoundationInput)
      .map((row) => [row.rowId, row]));
    expect(rows.get("main_concrete")).toMatchObject({
      evaluatedQuantity: "32.4",
      normSource: { sourceKey: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID },
      professionalPhysicalNormApplicabilityV1: {
        status: "APPLIED",
        norm_id: NRMCA_CIP31_SELECTED_CONTINGENCY_NORM_ID,
        calculated_concrete_order_quantity_m3: 32.4,
      },
    });
    expect(rows.get("concrete_delivery")).toMatchObject({
      cargoQuantity: "32.4",
      professionalPhysicalNormApplicabilityV1: {
        source_id: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
      },
    });
  });

  test("keeps the source binding in the canonical revision projection consumed downstream", () => {
    const passport = buildProfessionalWorkPassport("strip_foundation_preliminary_boq_expanded_complex_v1");
    if (!passport) throw new Error("NRMCA_CIP31_STRIP_FOUNDATION_PASSPORT_MISSING");
    const exactOverrides = Object.fromEntries(Object.entries(exactStripFoundationInput)
      .filter(([parameterId]) => [
        "product_profile_id",
        "concrete_order_allowance_percent",
        "plan_volume_calculation_reference",
        "mix_design_or_project_specification_reference",
        "mixture_designation",
        "placement_location",
        "contingency_selection_justification",
        "delivery_schedule_and_truck_capacity",
        "producer_order_confirmation",
        "estimator_approval_reference",
      ].includes(parameterId))
      .map(([parameterId, value]) => [parameterId, revisionParam(value)]));
    const revision = createStripFoundationCanonicalBackendAuditRevision({
      passport,
      estimateDraftId: "nrmca-cip31-strip-foundation-revision",
      rawInput: "Ленточный фундамент: подтверждённый заказ товарного бетона по NRMCA CIP 31",
      createdAt: CAPTURED_AT,
      paramOverrides: exactOverrides,
    });
    const material = revision.boq.rows.find((row) => row.sourceParameters?.rowCode === "main_concrete");
    const delivery = revision.boq.rows.find((row) => row.sourceParameters?.rowCode === "concrete_delivery");
    expect(material).toMatchObject({
      quantity: 32.4,
      sourceId: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
      sourceParameters: {
        normativeSourceIds: [NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID],
        parameterSourceIds: [NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID],
        professionalPhysicalNormApplicabilityV1: {
          status: "APPLIED",
          calculated_concrete_order_quantity_m3: 32.4,
        },
      },
    });
    expect(delivery).toMatchObject({
      sourceParameters: {
        professionalPhysicalNormApplicabilityV1: {
          source_id: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
        },
      },
    });
  });

  test("keeps generic legacy calculations separate and fails closed after explicit profile selection", () => {
    const genericMainConcrete = compileStripFoundationEstimate(STRIP_FOUNDATION_GOLD_INPUT)
      .find((row) => row.rowId === "main_concrete");
    expect(genericMainConcrete).toMatchObject({ evaluatedQuantity: "30.6" });
    expect(genericMainConcrete?.professionalPhysicalNormApplicabilityV1).toBeUndefined();

    const { plan_volume_calculation_reference: _removed, ...missingReference } = exactStripFoundationInput;
    expect(() => compileStripFoundationEstimate(missingReference))
      .toThrow("STRIP_FOUNDATION_MISSING_INPUT:plan_volume_calculation_reference");
    expect(() => compileStripFoundationEstimate({
      ...exactStripFoundationInput,
      concrete_order_allowance_percent: 2,
    })).toThrow("selected_contingency_percent=2");
  });
});
