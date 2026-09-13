import { buildDirectConsumerRepairOpenWorldAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { compileDynamicProfessionalBoq } from "../../src/lib/ai/professionalBoq/compileDynamicProfessionalBoq";
import { buildOwnedDomainEstimatorReasoningPlan } from "../../src/lib/estimate/ownedDomain/buildOwnedDomainEstimatorReasoningPlan";
import { resolveDirectConsumerRepairOpenWorldOwner } from "../../src/lib/estimate/ownedDomain/directConsumerRepairOpenWorldRouting";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import {
  CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1,
  SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_NORM_ID,
  SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_PRODUCT_PROFILE_ID,
  SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_ID,
  SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_METADATA,
  constructionNormativeRegistryV1,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../../src/lib/estimate/v4/domainFactory";

const CAPTURED_AT = "2026-09-12T15:00:00.000Z";

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
    applicability: "Exact Sikagard Wood Preserver preventative-treatment fixture",
  };
}

function exactInputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_PRODUCT_PROFILE_ID),
    treated_timber_surface_area_m2: explicit(40, "m2"),
    treatment_purpose: explicit("PREVENTATIVE_INSECTS_AND_WOOD_ROTTING_FUNGI"),
    timber_surface_condition: explicit("CLEAN_DRY_BARE_TIMBER"),
    application_method: explicit("BRUSH"),
    minimum_coat_count: explicit(2),
    selected_package_mix_l: explicit(10, "l"),
    ...changes,
  };
}

function resolve(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "TIMBER_PRESERVATION",
    operation_class: "APPLY",
    material_system: "SIKAGARD_WOOD_PRESERVER",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: values,
  });
}

function completePrompt(packageMixL = 10): string {
  const mix = packageMixL === 10 ? "2×5 л" : "2×5 л + 1×1 л";
  return [
    "Смета обработки Sikagard Wood Preserver:",
    "чистая площадь обрабатываемой деревянной поверхности 40 м²;",
    "профилактическая защита от насекомых и дереворазрушающих грибов;",
    "чистая, сухая, необработанная деревянная поверхность;",
    "способ нанесения: кистью;",
    "не менее 2 слоёв;",
    `закупочная комбинация банок ${mix} итого ${packageMixL} л`,
  ].join(" ");
}

describe("Sikagard Wood Preserver exact preventative physical norm", () => {
  test("registers the reviewed 0.25 L/m2 profile and 1/5 L packaging", () => {
    expect(SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_METADATA).toMatchObject({
      norm_id: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_NORM_ID,
      product: "Sikagard Wood Preserver",
      manufacturer_consumption_ml_m2: 250,
      minimum_coats_for_brush_or_spray: 2,
      package_sizes_l: [1, 5],
    });
    expect(constructionNormativeRegistryV1.get(SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_ID))
      .toMatchObject({
        source_type: "MANUFACTURER_PASSPORT",
        jurisdiction: "INTERNATIONAL_PROJECT",
        authority: "Sika",
        operation_class_applicability: ["APPLY"],
        material_system_applicability: ["SIKAGARD_WOOD_PRESERVER"],
        product_profile_applicability: [SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_PRODUCT_PROFILE_ID],
        exact_rate_code_required: false,
      });
    expect(CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1)
      .toContainEqual(expect.objectContaining({
        norm_id: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_NORM_ID,
        work_group: "carpentry",
        technology_class: "TIMBER_PRESERVATION",
        produced_parameter_ids: [
          "sikagard_wood_preserver_net_quantity_l",
          "sikagard_wood_preserver_procurement_quantity_l",
        ],
      }));
  });

  test("keeps the 10 L net requirement distinct from the explicit procurement mix", () => {
    const first = resolve(exactInputs());
    const second = resolve(exactInputs());
    expect(first).toMatchObject({
      status: "APPLIED",
      norm_id: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_NORM_ID,
      source_id: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_ID,
      calculated_sikagard_wood_preserver_net_quantity_l: 10,
      calculated_sikagard_wood_preserver_procurement_quantity_l: 10,
      blockers: [],
    });
    expect(first.parameter_values.sikagard_wood_preserver_net_quantity_l).toMatchObject({
      value: 10,
      unit_id: "l",
      source_type: "APPLICABLE_NORM",
      source_id: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_ID,
    });
    expect(first.parameter_values.sikagard_wood_preserver_procurement_quantity_l)
      .toMatchObject({ value: 10, unit_id: "l", source_type: "USER_EXPLICIT" });
    expect(first.parameter_values.sikagard_wood_preserver_net_quantity_l.applicability)
      .toContain("automatic_package_rounding=false");
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
  });

  test("fails closed for inferred area, wrong purpose/surface, one coat, or insufficient mix", () => {
    const withoutArea = { ...exactInputs(), timber_volume_m3: explicit(2, "m3") };
    delete (withoutArea as Record<string, ProfessionalParameterValueV4>).treated_timber_surface_area_m2;
    expect(resolve(withoutArea)).toMatchObject({
      status: "BLOCKED_REQUIRED_INPUTS",
      blockers: expect.arrayContaining([
        "PROJECT_VALUE_REQUIRED_EXPLICIT:treated_timber_surface_area_m2",
      ]),
    });
    expect(resolve(exactInputs({ treatment_purpose: explicit("DECORATIVE_ONLY") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining([expect.stringContaining("treatment_purpose=DECORATIVE_ONLY")]),
      });
    expect(resolve(exactInputs({ timber_surface_condition: explicit("PAINTED_WET_TIMBER") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining([expect.stringContaining("timber_surface_condition=PAINTED_WET_TIMBER")]),
      });
    expect(resolve(exactInputs({ minimum_coat_count: explicit(1) })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining([expect.stringContaining("minimum_coat_count=1")]),
      });
    expect(resolve(exactInputs({ selected_package_mix_l: explicit(9, "l") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining([expect.stringContaining("selected_package_mix_l=9")]),
      });
    expect(resolve(exactInputs({ sikagard_wood_preserver_net_quantity_l: explicit(11, "l") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: [expect.stringContaining("PHYSICAL_NORM_VALUE_CONFLICT")],
      });
  });

  test("uses an independent carpentry owner and one exact procurement row", () => {
    expect(resolveDirectConsumerRepairOpenWorldOwner(completePrompt())).toBe("carpentry");
    expect(resolveDirectConsumerRepairOpenWorldOwner("антисептическая обработка деревянной стены 40 м²"))
      .toBeNull();

    const draft = buildDirectConsumerRepairOpenWorldAiDraft(completePrompt(), {
      city: "Бишкек",
      countryCode: "KG",
    });
    const exactRows = draft.items.filter(
      (item) => item.normId === SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_NORM_ID,
    );
    expect(draft.selectedWork?.selectedWorkKey)
      .toBe("carpentry_sikagard_wood_preserver_preventative");
    expect(exactRows).toHaveLength(1);
    expect(exactRows[0]).toMatchObject({
      quantity: 10,
      unit: "l",
      normSourceId: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_ID,
    });
    expect(exactRows[0]?.sourceParameters).toMatchObject({
      normSourceProfile: "MANUFACTURER_TECHNICAL",
      includedInEstimate: true,
      includedInProcurement: true,
      parameterBlockerIds: [],
    });
    expect(exactRows[0]?.calculationTrace).toContain("netResult=10");
    expect(exactRows[0]?.calculationTrace).toContain("automaticPackageRounding=false");
  });

  test("changes quantity and money only with the explicit procurement mix", () => {
    const mix10 = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({
      text: completePrompt(10),
      owner: "carpentry",
      currency: "KGS",
    }));
    const mix11 = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({
      text: completePrompt(11),
      owner: "carpentry",
      currency: "KGS",
    }));
    const first = mix10.rows.find(
      (row) => row.normId === SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_NORM_ID,
    )!;
    const second = mix11.rows.find(
      (row) => row.normId === SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_NORM_ID,
    )!;
    const firstOtherMaterial = mix10.rows.find((row) => row.code === "material_2")!;
    const secondOtherMaterial = mix11.rows.find((row) => row.code === "material_2")!;
    expect(second.quantity - first.quantity).toBeCloseTo(1, 9);
    expect(second.unitPrice).toBe(first.unitPrice);
    expect(second.quantity * second.unitPrice - first.quantity * first.unitPrice)
      .toBeCloseTo(first.unitPrice, 9);
    expect(secondOtherMaterial.quantity).toBe(firstOtherMaterial.quantity);
    expect(first.calculationTrace).toContain("netResult=10");
    expect(second.calculationTrace).toContain("netResult=10");
  });

  test("keeps incomplete exact input blocked and generic wood treatment unbound", () => {
    const incomplete = buildDirectConsumerRepairOpenWorldAiDraft(
      "Смета Sikagard Wood Preserver для деревянной поверхности 40 м²",
      { city: "Бишкек", countryCode: "KG" },
    );
    const blocked = incomplete.items.find(
      (item) => item.normId === SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_NORM_ID,
    );
    expect(blocked).toMatchObject({ quantity: 0 });
    expect(blocked?.sourceParameters).toMatchObject({
      includedInEstimate: false,
      includedInProcurement: false,
      conditionalStatus: "blocked_missing_parameters",
    });
    expect(incomplete.missingData).toEqual(expect.arrayContaining([
      expect.stringContaining("профилактическую защиту"),
      expect.stringContaining("не менее двух слоёв"),
      expect.stringContaining("закупочной комбинации"),
    ]));

    const generic = buildDirectConsumerRepairOpenWorldAiDraft(
      "Смета антисептической обработки деревянных конструкций 40 м²",
      { city: "Бишкек", countryCode: "KG" },
    );
    expect(generic.items.some(
      (item) => item.normId === SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_NORM_ID,
    )).toBe(false);
    expect(generic.items.some(
      (item) => item.normSourceId === SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_ID,
    )).toBe(false);
  });
});
