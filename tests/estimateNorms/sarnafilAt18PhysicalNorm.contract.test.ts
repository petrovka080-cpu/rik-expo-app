import {
  CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1,
  SARNAFIL_AT18_FIELD_80MM_NORM_ID,
  SARNAFIL_AT18_FIELD_80MM_PRODUCT_PROFILE_ID,
  SARNAFIL_AT18_FIELD_80MM_SOURCE_ID,
  SARNAFIL_AT18_FIELD_80MM_SOURCE_METADATA,
  constructionNormativeRegistryV1,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../../src/lib/estimate/v4/domainFactory";
import { buildDirectConsumerRepairOpenWorldAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";

const CAPTURED_AT = "2026-09-12T00:00:00.000Z";

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
    applicability: "Exact Sarnafil AT-18 rectangular field layout fixture",
  };
}

function exactInputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(SARNAFIL_AT18_FIELD_80MM_PRODUCT_PROFILE_ID),
    net_rectangular_field_area_m2: explicit(96.8, "m2"),
    fixing_method: explicit("FIELD_FASTENED"),
    roll_orientation: explicit("PARALLEL_TO_LONG_EDGE"),
    field_course_count: explicit(5, "item"),
    field_course_lengths_m: explicit("10,10,10,10,10", "m"),
    end_lap_design: explicit("NO_END_LAPS_WITHIN_FIELD"),
    details_and_upstands_area_m2: explicit(0, "m2"),
    selected_package_variation: explicit("FIELD_FASTENED_80_MM_OVERLAP"),
    sika_project_specific_fastening_calculation: explicit("SIKA-CALC-2026-17"),
    ...changes,
  };
}

function resolve(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "ROOF_WATERPROOFING",
    operation_class: "INSTALL",
    material_system: "SARNAFIL_AT18_ROOF_MEMBRANE",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: values,
  });
}

const COMPLETE_PROMPT = [
  "Смета гидроизоляции кровли Sarnafil AT-18:",
  "чистая площадь прямоугольного поля 96,8 м²;",
  "механическое полевое крепление;",
  "полотна вдоль длинной стороны;",
  "5 полотен;",
  "длины полотен: 10, 10, 10, 10, 10;",
  "без торцевых нахлёстов;",
  "площадь деталей и примыканий 0 м²;",
  "полевой нахлёст 80 мм;",
  "расчёт крепления Sika: SIKA-CALC-2026-17",
].join(" ");

describe("Sarnafil AT-18 exact field-layout physical norm", () => {
  test("registers one reviewed manufacturer source and executable binding", () => {
    expect(SARNAFIL_AT18_FIELD_80MM_SOURCE_METADATA).toMatchObject({
      norm_id: SARNAFIL_AT18_FIELD_80MM_NORM_ID,
      product: "Sarnafil AT-18",
      roll_width_m: 2,
      roll_length_m: 15,
      roll_area_m2: 30,
      field_overlap_m: 0.08,
      effective_course_width_m: 1.92,
    });
    expect(constructionNormativeRegistryV1.get(SARNAFIL_AT18_FIELD_80MM_SOURCE_ID))
      .toMatchObject({
        source_type: "MANUFACTURER_PASSPORT",
        jurisdiction: "INTERNATIONAL_PROJECT",
        authority: "Sika",
        operation_class_applicability: ["INSTALL"],
        material_system_applicability: ["SARNAFIL_AT18_ROOF_MEMBRANE"],
        product_profile_applicability: [SARNAFIL_AT18_FIELD_80MM_PRODUCT_PROFILE_ID],
        exact_rate_code_required: false,
      });
    expect(CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1)
      .toContainEqual(expect.objectContaining({
        norm_id: SARNAFIL_AT18_FIELD_80MM_NORM_ID,
        work_group: "roofing",
        technology_class: "ROOF_WATERPROOFING",
        produced_parameter_ids: ["sarnafil_at18_gross_field_membrane_m2"],
      }));
  });

  test("derives 100 m2 gross field membrane from the complete layout without roll rounding", () => {
    const first = resolve(exactInputs());
    const second = resolve(exactInputs());
    expect(first).toMatchObject({
      status: "APPLIED",
      source_id: SARNAFIL_AT18_FIELD_80MM_SOURCE_ID,
      norm_id: SARNAFIL_AT18_FIELD_80MM_NORM_ID,
      calculated_sarnafil_at18_gross_field_membrane_m2: 100,
      produced_parameter_ids: ["sarnafil_at18_gross_field_membrane_m2"],
      blockers: [],
    });
    expect(first.parameter_values.sarnafil_at18_gross_field_membrane_m2).toMatchObject({
      value: 100,
      unit_id: "m2",
      source_type: "APPLICABLE_NORM",
      source_id: SARNAFIL_AT18_FIELD_80MM_SOURCE_ID,
    });
    expect(first.parameter_values.sarnafil_at18_gross_field_membrane_m2.applicability)
      .toContain("roll_rounding=false");
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
  });

  test("fails closed for missing inputs, excluded variants, layout conflicts and output conflicts", () => {
    const incomplete = { ...exactInputs() };
    delete (incomplete as Record<string, ProfessionalParameterValueV4>).field_course_lengths_m;
    expect(resolve(incomplete)).toMatchObject({
      status: "BLOCKED_REQUIRED_INPUTS",
      blockers: ["PROJECT_VALUE_REQUIRED_EXPLICIT:field_course_lengths_m"],
    });
    expect(resolve(exactInputs({
      fixing_method: explicit("SPOT_FASTENED"),
      selected_package_variation: explicit("SPOT_FASTENED_120_MM_OVERLAP"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: expect.arrayContaining([
        expect.stringContaining("fixing_method=SPOT_FASTENED"),
        expect.stringContaining("selected_package_variation=SPOT_FASTENED_120_MM_OVERLAP"),
      ]),
    });
    expect(resolve(exactInputs({ details_and_upstands_area_m2: explicit(2, "m2") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining([expect.stringContaining("details_and_upstands_area_m2=2")]),
      });
    expect(resolve(exactInputs({ net_rectangular_field_area_m2: explicit(97, "m2") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining([expect.stringContaining("PHYSICAL_NORM_LAYOUT_AREA_CONFLICT")]),
      });
    expect(resolve(exactInputs({
      sarnafil_at18_gross_field_membrane_m2: explicit(101, "m2"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [expect.stringContaining("PHYSICAL_NORM_VALUE_CONFLICT")],
    });
  });

  test("reaches the real consumer owner once and preserves the exact procurement quantity", () => {
    const draft = buildDirectConsumerRepairOpenWorldAiDraft(COMPLETE_PROMPT, {
      city: "Бишкек",
      countryCode: "KG",
    });
    const exactRows = draft.items.filter((item) => item.normId === SARNAFIL_AT18_FIELD_80MM_NORM_ID);
    expect(draft.selectedWork?.selectedWorkKey).toBe("dynamic_waterproofing_estimate");
    expect(exactRows).toHaveLength(1);
    expect(exactRows[0]).toMatchObject({
      quantity: 100,
      unit: "sq_m",
      normSourceId: SARNAFIL_AT18_FIELD_80MM_SOURCE_ID,
    });
    expect(exactRows[0]?.sourceParameters).toMatchObject({
      normSourceProfile: "MANUFACTURER_TECHNICAL",
      includedInEstimate: true,
      includedInProcurement: true,
      parameterBlockerIds: [],
    });
    expect(exactRows[0]?.calculationTrace).toContain("rollRounding=false");
    const automaticReserve = draft.items.find((item) =>
      item.sourceParameters?.rowCode === "reserve"
    );
    expect(automaticReserve).toMatchObject({ quantity: 0 });
    expect(automaticReserve?.sourceParameters).toMatchObject({
      conditionalStatus: "blocked_missing_parameters",
      includedInEstimate: false,
      includedInProcurement: false,
      parameterBlockerIds: [
        "SARNAFIL_AT18_COMPLETE_COURSE_AND_DETAIL_LAYOUT_REQUIRED_BEFORE_ROLL_ROUNDING",
      ],
    });
    expect(draft.items.some((item) =>
      item.normId !== SARNAFIL_AT18_FIELD_80MM_NORM_ID &&
      item.sourceParameters?.rowCode === "waterproofing" &&
      item.quantity === 104.54
    )).toBe(false);
  });

  test("shows an exact blocked row for incomplete Sarnafil input and leaves a generic roof request unbound", () => {
    const incomplete = buildDirectConsumerRepairOpenWorldAiDraft(
      "Смета гидроизоляции кровли Sarnafil AT-18, чистая площадь прямоугольного поля 96,8 м²",
      { city: "Бишкек", countryCode: "KG" },
    );
    const blocked = incomplete.items.find((item) => item.normId === SARNAFIL_AT18_FIELD_80MM_NORM_ID);
    expect(blocked).toMatchObject({
      quantity: 0,
    });
    expect(blocked?.sourceParameters).toMatchObject({
      conditionalStatus: "blocked_missing_parameters",
      includedInEstimate: false,
      includedInProcurement: false,
    });
    expect((blocked?.sourceParameters?.parameterBlockerIds as string[]).length).toBeGreaterThan(0);
    expect(incomplete.missingData).toEqual(expect.arrayContaining([
      expect.stringContaining("способ укладки Sarnafil AT-18"),
      expect.stringContaining("длину каждого полотна"),
    ]));

    const generic = buildDirectConsumerRepairOpenWorldAiDraft(
      "Смета гидроизоляции плоской кровли 96,8 м² рулонной мембраной",
      { city: "Бишкек", countryCode: "KG" },
    );
    expect(generic.items.some((item) => item.normId === SARNAFIL_AT18_FIELD_80MM_NORM_ID)).toBe(false);
    expect(generic.items.some((item) => item.normSourceId === SARNAFIL_AT18_FIELD_80MM_SOURCE_ID)).toBe(false);
  });
});
