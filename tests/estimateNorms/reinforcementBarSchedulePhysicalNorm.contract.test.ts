import { buildDirectConsumerRepairOpenWorldAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { compileDynamicProfessionalBoq } from "../../src/lib/ai/professionalBoq/compileDynamicProfessionalBoq";
import { buildOwnedDomainEstimatorReasoningPlan } from "../../src/lib/estimate/ownedDomain/buildOwnedDomainEstimatorReasoningPlan";
import { resolveDirectConsumerRepairOpenWorldOwner } from "../../src/lib/estimate/ownedDomain/directConsumerRepairOpenWorldRouting";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import {
  CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1,
  REINFORCEMENT_BAR_SCHEDULE_NORM_ID,
  REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID,
  REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
  REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA,
  constructionNormativeRegistryV1,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../../src/lib/estimate/v4/domainFactory";

const CAPTURED_AT = "2026-09-12T20:00:00.000Z";

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
    applicability: "Exact approved reinforcement schedule fixture",
  };
}

function exactInputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID),
    approved_reinforcement_schedule_weight_kg: explicit(2480.5, "kg"),
    bar_bending_schedule_reference: explicit("BBS-S01-REV-D"),
    structural_drawing_and_revision_reference: explicit("STR-S01-REV-D"),
    bar_standard_and_grade: explicit("ASTM A615 Grade 60"),
    bar_size_designation: explicit("No. 5"),
    nominal_diameter_mm: explicit(15.875, "mm"),
    shape_straight_bent_curved_or_link: explicit("BENT:shape-code-21"),
    bar_count_and_cut_length_m: explicit("160 bars x 9.75 m approved cut length"),
    selected_standard_mass_kg_per_m: explicit(1.552, "kg_per_m"),
    laps_hooks_chairs_connectors_and_accessories_scope: explicit(
      "PROJECT_SCOPE:all BBS laps and hooks; chairs/connectors scheduled separately",
    ),
    fabrication_allowance_if_documented: explicit("NONE:INCLUDED_IN_APPROVED_SCHEDULE"),
    supplier_bundle_or_length_constraints: explicit("NONE:NO_AUTOMATIC_BUNDLE_ROUNDING"),
    estimator_approval_reference: explicit("EST-REBAR-REV-D"),
    ...changes,
  };
}

function resolve(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "REINFORCEMENT_SCHEDULE_MEASUREMENT",
    operation_class: "MEASURE",
    material_system: "APPROVED_REINFORCEMENT_BAR_SCHEDULE",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: values,
  });
}

function completePrompt(weightKg = 2480.5): string {
  return [
    "Арматура по утверждённой ведомости стержней, FHWA-HIF-16-026 Table 3 и RICS NRM 2;",
    `масса по утверждённой ведомости стержней: ${weightKg} кг;`,
    "ссылка на ведомость стержней: BBS-S01-REV-D;",
    "конструктивный чертёж: STR-S01-REV-D;",
    "стандарт и класс арматуры: ASTM A615 Grade 60;",
    "обозначение размера стержня: No. 5;",
    "номинальный диаметр: 15.875 мм;",
    "форма стержня: BENT:shape-code-21;",
    "число стержней и длина резки: 160 bars x 9.75 m approved cut length;",
    "масса погонного метра: 1.552 кг/м;",
    "состав нахлёстов и аксессуаров: PROJECT_SCOPE:all BBS laps and hooks, chairs scheduled separately;",
    "запас изготовления: NONE:INCLUDED_IN_APPROVED_SCHEDULE;",
    "ограничения поставки: NONE:NO_AUTOMATIC_BUNDLE_ROUNDING;",
    "согласование сметчика: EST-REBAR-REV-D",
  ].join(" ");
}

describe("approved reinforcement bar-schedule weight norm", () => {
  test("registers the reviewed FHWA and RICS schedule identity", () => {
    expect(REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA).toMatchObject({
      norm_id: REINFORCEMENT_BAR_SCHEDULE_NORM_ID,
      rate_value: 1,
    });
    expect(constructionNormativeRegistryV1.get(REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID))
      .toMatchObject({
        source_type: "WORK_EXECUTION_STANDARD",
        jurisdiction: "INTERNATIONAL_PROJECT",
        operation_class_applicability: ["MEASURE"],
        material_system_applicability: ["APPROVED_REINFORCEMENT_BAR_SCHEDULE"],
        product_profile_applicability: [REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID],
      });
    expect(CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1)
      .toContainEqual(expect.objectContaining({
        norm_id: REINFORCEMENT_BAR_SCHEDULE_NORM_ID,
        work_group: "reinforcement",
        produced_parameter_ids: ["reinforcement_schedule_weight_routed_kg"],
      }));
  });

  test("routes 2480.5 kg without kg-per-m3, shortcut or package rounding", () => {
    const first = resolve(exactInputs());
    const second = resolve(exactInputs());
    expect(first).toMatchObject({
      status: "APPLIED",
      source_id: REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
      calculated_reinforcement_schedule_weight_kg: 2480.5,
      blockers: [],
    });
    expect(first.parameter_values.reinforcement_schedule_weight_routed_kg).toMatchObject({
      value: 2480.5,
      unit_id: "kg",
      source_type: "APPLICABLE_NORM",
      source_id: REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
    });
    expect(first.parameter_values.reinforcement_schedule_weight_routed_kg.applicability)
      .toContain("automatic_diameter_squared_over_162=false");
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
  });

  test("fails closed for missing evidence, invalid shape and conflicting mass", () => {
    const withoutSchedule = { ...exactInputs() };
    delete (withoutSchedule as Record<string, ProfessionalParameterValueV4>).bar_bending_schedule_reference;
    expect(resolve(withoutSchedule)).toMatchObject({
      status: "BLOCKED_REQUIRED_INPUTS",
      blockers: expect.arrayContaining([
        "PROJECT_VALUE_REQUIRED_EXPLICIT:bar_bending_schedule_reference",
      ]),
    });
    expect(resolve(exactInputs({ shape_straight_bent_curved_or_link: explicit("ASSUMED") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining([
          "PHYSICAL_NORM_CLASSIFICATION_INVALID:shape_straight_bent_curved_or_link=ASSUMED",
        ]),
      });
    expect(resolve(exactInputs({ reinforcement_schedule_weight_routed_kg: explicit(2350, "kg") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: [expect.stringContaining("PHYSICAL_NORM_VALUE_CONFLICT")],
      });
  });

  test("uses the exact owner and one procurement material row", () => {
    expect(resolveDirectConsumerRepairOpenWorldOwner(completePrompt())).toBe("reinforcement");
    expect(resolveDirectConsumerRepairOpenWorldOwner("Арматура для фундамента примерно 95 кг/м³"))
      .toBeNull();
    const draft = buildDirectConsumerRepairOpenWorldAiDraft(completePrompt(), {
      city: "Бишкек",
      countryCode: "KG",
    });
    const exactRows = draft.items.filter((item) => item.normId === REINFORCEMENT_BAR_SCHEDULE_NORM_ID);
    expect(draft.selectedWork?.selectedWorkKey).toBe("reinforcement_approved_bar_schedule_weight");
    expect(exactRows).toHaveLength(1);
    expect(exactRows[0]).toMatchObject({
      quantity: 2480.5,
      unit: "kg",
      normSourceId: REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
    });
    expect(exactRows[0]?.sourceParameters).toMatchObject({
      normSourceProfile: "INTL_REFERENCE",
      includedInEstimate: true,
      includedInProcurement: true,
      parameterBlockerIds: [],
    });
    expect(exactRows[0]?.calculationTrace).toContain("automaticKgPerM3Allowance=false");
    expect(exactRows[0]?.calculationTrace).toContain("automaticDiameterSquaredOver162=false");
  });

  test("changes the schedule quantity and money while fixed survey stays stable", () => {
    const weight2400 = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({
      text: completePrompt(2400), owner: "reinforcement", currency: "KGS",
    }));
    const weight2500 = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({
      text: completePrompt(2500), owner: "reinforcement", currency: "KGS",
    }));
    const first = weight2400.rows.find((row) => row.normId === REINFORCEMENT_BAR_SCHEDULE_NORM_ID)!;
    const second = weight2500.rows.find((row) => row.normId === REINFORCEMENT_BAR_SCHEDULE_NORM_ID)!;
    const firstSurvey = weight2400.rows.find((row) => row.code === "survey")!;
    const secondSurvey = weight2500.rows.find((row) => row.code === "survey")!;
    expect(second.quantity - first.quantity).toBeCloseTo(100, 9);
    expect(second.unitPrice).toBe(first.unitPrice);
    expect(second.quantity * second.unitPrice - first.quantity * first.unitPrice)
      .toBeCloseTo(100 * first.unitPrice, 9);
    expect(first.unitPrice).toBeGreaterThan(0);
    expect(secondSurvey).toMatchObject({
      quantity: firstSurvey.quantity,
      unitPrice: firstSurvey.unitPrice,
    });
  });

  test("keeps incomplete exact input blocked and generic reinforcement unbound", () => {
    const incomplete = buildDirectConsumerRepairOpenWorldAiDraft(
      "Арматура по ведомости стержней FHWA-HIF-16-026",
      { city: "Бишкек", countryCode: "KG" },
    );
    const blocked = incomplete.items.find((item) => item.normId === REINFORCEMENT_BAR_SCHEDULE_NORM_ID);
    expect(blocked).toMatchObject({ quantity: 0 });
    expect(blocked?.sourceParameters).toMatchObject({
      includedInEstimate: false,
      includedInProcurement: false,
      conditionalStatus: "blocked_missing_parameters",
    });
    expect(incomplete.missingData).toEqual(expect.arrayContaining([
      expect.stringContaining("массу арматуры"),
      expect.stringContaining("ведомости стержней"),
      expect.stringContaining("стандарт и класс"),
    ]));
    const generic = buildDirectConsumerRepairOpenWorldAiDraft(
      "Смета на армирование фундамента массой около 2400 кг",
      { city: "Бишкек", countryCode: "KG" },
    );
    expect(generic.items.some((item) => item.normId === REINFORCEMENT_BAR_SCHEDULE_NORM_ID)).toBe(false);
  });
});
