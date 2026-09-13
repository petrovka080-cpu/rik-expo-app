import { buildDirectConsumerRepairOpenWorldAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { compileDynamicProfessionalBoq } from "../../src/lib/ai/professionalBoq/compileDynamicProfessionalBoq";
import { buildOwnedDomainEstimatorReasoningPlan } from "../../src/lib/estimate/ownedDomain/buildOwnedDomainEstimatorReasoningPlan";
import { resolveDirectConsumerRepairOpenWorldOwner } from "../../src/lib/estimate/ownedDomain/directConsumerRepairOpenWorldRouting";
import { classifyProfessionalNormSourceAdmission } from "../../src/lib/estimate/professionalNormSourceAdmission";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import {
  CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1,
  RICS_NRM2_FORMWORK_NORM_ID,
  RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID,
  RICS_NRM2_FORMWORK_SOURCE_ID,
  RICS_NRM2_FORMWORK_SOURCE_METADATA,
  constructionNormativeRegistryV1,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../../src/lib/estimate/v4/domainFactory";

const CAPTURED_AT = "2026-09-12T19:00:00.000Z";

function explicit(
  value: string | number | boolean,
  unitId: string | null = null,
): ProfessionalParameterValueV4 {
  return {
    value,
    unit_id: unitId,
    source_type: "USER_EXPLICIT",
    source_id: `test-project:${String(value)}`,
    captured_at: CAPTURED_AT,
    confidence: "high",
    applicability: "Exact RICS NRM2 formwork contact-area fixture",
  };
}

function exactInputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID),
    measured_formwork_contact_area_m2: explicit(123.45, "m2"),
    project_drawing_reference: explicit("STR-FW-21-REV-C"),
    element_type: explicit("WALL"),
    element_dimensions_and_face_count: explicit("12.5m x 4.938m x 2 measured faces"),
    plain_or_special_finish: explicit("PLAIN"),
    vertical_battered_horizontal_or_curved_class: explicit("VERTICAL"),
    single_or_double_sided_scope: explicit("DOUBLE_SIDED"),
    openings_voids_and_deduction_rule: explicit("PROJECT_RULE:deduct openings per QTO-21-REV-C"),
    permanent_or_removable_formwork: explicit("REMOVABLE"),
    project_measurement_rule_reference: explicit("RICS_NRM2_WS11_CONFIRMED:QTO-21-REV-C"),
    estimator_approval_reference: explicit("EST-FW-REV-C"),
    ...changes,
  };
}

function resolve(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "FORMWORK_MEASUREMENT",
    operation_class: "MEASURE",
    material_system: "FORMWORK_CONTACT_AREA",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: values,
  });
}

function completePrompt(areaM2 = 123.45): string {
  return [
    "Опалубка по RICS NRM 2, Work section 11;",
    `измеренная площадь контакта: ${areaM2} м²;`,
    "ссылка на чертёж: STR-FW-21-REV-C;",
    "тип элемента: WALL;",
    "размеры и количество граней: 12.5m x 4.938m x 2 measured faces;",
    "отделка: PLAIN;",
    "класс геометрии: VERTICAL;",
    "сторона опалубки: DOUBLE_SIDED;",
    "правило проёмов и пустот: PROJECT_RULE:deduct openings per QTO-21-REV-C;",
    "тип опалубки: REMOVABLE;",
    "правило измерения проекта: RICS_NRM2_WS11_CONFIRMED:QTO-21-REV-C;",
    "согласование сметчика: EST-FW-REV-C",
  ].join(" ");
}

describe("RICS NRM2 measured formwork contact-area norm", () => {
  test("registers the reviewed Work section 11 measurement identity", () => {
    expect(RICS_NRM2_FORMWORK_SOURCE_METADATA).toMatchObject({
      norm_id: RICS_NRM2_FORMWORK_NORM_ID,
      rate_value: 1,
      measurement_unit: "m2",
    });
    expect(constructionNormativeRegistryV1.get(RICS_NRM2_FORMWORK_SOURCE_ID))
      .toMatchObject({
        source_type: "WORK_EXECUTION_STANDARD",
        jurisdiction: "INTERNATIONAL_PROJECT",
        operation_class_applicability: ["MEASURE"],
        material_system_applicability: ["FORMWORK_CONTACT_AREA"],
        product_profile_applicability: [RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID],
        exact_rate_code_required: false,
      });
    expect(CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1)
      .toContainEqual(expect.objectContaining({
        norm_id: RICS_NRM2_FORMWORK_NORM_ID,
        work_group: "formwork",
        technology_class: "FORMWORK_MEASUREMENT",
        produced_parameter_ids: ["formwork_measured_contact_area_routed_m2"],
      }));
  });

  test("routes 123.45 m2 without a volume factor, waste or package rounding", () => {
    const first = resolve(exactInputs());
    const second = resolve(exactInputs());
    expect(first).toMatchObject({
      status: "APPLIED",
      norm_id: RICS_NRM2_FORMWORK_NORM_ID,
      source_id: RICS_NRM2_FORMWORK_SOURCE_ID,
      calculated_formwork_measured_contact_area_m2: 123.45,
      blockers: [],
    });
    expect(first.parameter_values.formwork_measured_contact_area_routed_m2).toMatchObject({
      value: 123.45,
      unit_id: "m2",
      source_type: "APPLICABLE_NORM",
      source_id: RICS_NRM2_FORMWORK_SOURCE_ID,
    });
    expect(first.parameter_values.formwork_measured_contact_area_routed_m2.applicability)
      .toContain("automatic_m2_per_m3_factor=false");
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
  });

  test("fails closed for an incomplete or wrongly classified project measurement", () => {
    const withoutDrawing = { ...exactInputs() };
    delete (withoutDrawing as Record<string, ProfessionalParameterValueV4>).project_drawing_reference;
    expect(resolve(withoutDrawing)).toMatchObject({
      status: "BLOCKED_REQUIRED_INPUTS",
      blockers: expect.arrayContaining([
        "PROJECT_VALUE_REQUIRED_EXPLICIT:project_drawing_reference",
      ]),
    });
    expect(resolve(exactInputs({ plain_or_special_finish: explicit("UNCLASSIFIED") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining([
          "PHYSICAL_NORM_CLASSIFICATION_INVALID:plain_or_special_finish=UNCLASSIFIED",
        ]),
      });
    expect(resolve(exactInputs({ single_or_double_sided_scope: explicit("ASSUMED") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining([
          "PHYSICAL_NORM_CLASSIFICATION_INVALID:single_or_double_sided_scope=ASSUMED",
        ]),
      });
    expect(resolve(exactInputs({ formwork_measured_contact_area_routed_m2: explicit(296.28, "m2") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: [expect.stringContaining("PHYSICAL_NORM_VALUE_CONFLICT")],
      });
  });

  test("uses the exact formwork owner and one non-procurement measured labor row", () => {
    expect(resolveDirectConsumerRepairOpenWorldOwner(completePrompt())).toBe("formwork");
    expect(resolveDirectConsumerRepairOpenWorldOwner("Опалубка стен, площадь около 120 м²"))
      .toBeNull();

    const draft = buildDirectConsumerRepairOpenWorldAiDraft(completePrompt(), {
      city: "Бишкек",
      countryCode: "KG",
    });
    const exactRows = draft.items.filter((item) => item.normId === RICS_NRM2_FORMWORK_NORM_ID);
    expect(draft.selectedWork?.selectedWorkKey).toBe("formwork_rics_nrm2_measured_contact_area");
    expect(exactRows).toHaveLength(1);
    expect(exactRows[0]).toMatchObject({
      quantity: 123.45,
      unit: "m2",
      normSourceId: RICS_NRM2_FORMWORK_SOURCE_ID,
    });
    expect(exactRows[0]?.sourceParameters).toMatchObject({
      normSourceProfile: "INTL_REFERENCE",
      includedInEstimate: true,
      includedInProcurement: false,
      parameterBlockerIds: [],
      professionalPhysicalNormApplicabilityV1: {
        status: "APPLIED",
        source_id: RICS_NRM2_FORMWORK_SOURCE_ID,
        norm_id: RICS_NRM2_FORMWORK_NORM_ID,
        source_document_version: RICS_NRM2_FORMWORK_SOURCE_METADATA.source_document_version,
      },
    });
    expect(classifyProfessionalNormSourceAdmission({
      normSourceId: exactRows[0]?.normSourceId,
      normId: exactRows[0]?.normId,
      normVersion: exactRows[0]?.normVersion,
      sourceParameters: exactRows[0]?.sourceParameters,
    })).toEqual({
      admitted: true,
      route: "CANONICAL_PHYSICAL_APPLICABILITY",
      reason: "ADMITTED_CANONICAL_PHYSICAL_APPLICABILITY",
    });
    expect(exactRows[0]?.calculationTrace).toContain("automaticM2PerM3Factor=false");
    expect(exactRows[0]?.calculationTrace).toContain("priceSource=separate_configured_reference");
  });

  test("changes measured quantity and money while leaving fixed survey scope unchanged", () => {
    const area120 = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({
      text: completePrompt(120),
      owner: "formwork",
      currency: "KGS",
    }));
    const area135 = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({
      text: completePrompt(135),
      owner: "formwork",
      currency: "KGS",
    }));
    const first = area120.rows.find((row) => row.normId === RICS_NRM2_FORMWORK_NORM_ID)!;
    const second = area135.rows.find((row) => row.normId === RICS_NRM2_FORMWORK_NORM_ID)!;
    const firstSurvey = area120.rows.find((row) => row.code === "survey")!;
    const secondSurvey = area135.rows.find((row) => row.code === "survey")!;
    expect(second.quantity - first.quantity).toBeCloseTo(15, 9);
    expect(second.unitPrice).toBe(first.unitPrice);
    expect(second.quantity * second.unitPrice - first.quantity * first.unitPrice)
      .toBeCloseTo(15 * first.unitPrice, 9);
    expect(first.unitPrice).toBeGreaterThan(0);
    expect(secondSurvey.quantity).toBe(firstSurvey.quantity);
    expect(secondSurvey.unitPrice).toBe(firstSurvey.unitPrice);
  });

  test("keeps incomplete exact input blocked and generic formwork unbound", () => {
    const incomplete = buildDirectConsumerRepairOpenWorldAiDraft(
      "Опалубка по RICS NRM 2",
      { city: "Бишкек", countryCode: "KG" },
    );
    const blocked = incomplete.items.find((item) => item.normId === RICS_NRM2_FORMWORK_NORM_ID);
    expect(blocked).toMatchObject({ quantity: 0 });
    expect(blocked?.sourceParameters).toMatchObject({
      includedInEstimate: false,
      includedInProcurement: false,
      conditionalStatus: "blocked_missing_parameters",
    });
    expect(incomplete.missingData).toEqual(expect.arrayContaining([
      expect.stringContaining("площадь контакта"),
      expect.stringContaining("чертёж"),
      expect.stringContaining("проёмов"),
    ]));

    const generic = buildDirectConsumerRepairOpenWorldAiDraft(
      "Смета на опалубку стен площадью 123 м²",
      { city: "Бишкек", countryCode: "KG" },
    );
    expect(generic.items.some((item) => item.normId === RICS_NRM2_FORMWORK_NORM_ID)).toBe(false);
    expect(generic.items.some((item) => item.normSourceId === RICS_NRM2_FORMWORK_SOURCE_ID))
      .toBe(false);
  });
});
