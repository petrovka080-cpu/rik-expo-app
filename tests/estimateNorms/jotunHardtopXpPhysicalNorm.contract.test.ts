import { buildDirectConsumerRepairOpenWorldAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { compileDynamicProfessionalBoq } from "../../src/lib/ai/professionalBoq/compileDynamicProfessionalBoq";
import { buildOwnedDomainEstimatorReasoningPlan } from "../../src/lib/estimate/ownedDomain/buildOwnedDomainEstimatorReasoningPlan";
import { resolveDirectConsumerRepairOpenWorldOwner } from "../../src/lib/estimate/ownedDomain/directConsumerRepairOpenWorldRouting";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import {
  CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1,
  JOTUN_HARDTOP_XP_100UM_NORM_ID,
  JOTUN_HARDTOP_XP_100UM_PRODUCT_PROFILE_ID,
  JOTUN_HARDTOP_XP_100UM_SOURCE_ID,
  JOTUN_HARDTOP_XP_100UM_SOURCE_METADATA,
  constructionNormativeRegistryV1,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../../src/lib/estimate/v4/domainFactory";

const CAPTURED_AT = "2026-09-12T14:00:00.000Z";

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
    applicability: "Exact Jotun Hardtop XP approved steel-coating fixture",
  };
}

function exactInputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(JOTUN_HARDTOP_XP_100UM_PRODUCT_PROFILE_ID),
    coated_steel_area_m2: explicit(63, "m2"),
    specified_dry_film_thickness_um: explicit(100, "um"),
    application_method: explicit("AIRLESS_SPRAY"),
    surface_profile: explicit("SSPC-SP10/NACE2-PROFILE-2026-04"),
    application_loss_factor: explicit(1),
    selected_kit_size_l: explicit(5, "l"),
    component_mixing_ratio_confirmed: explicit(true),
    coating_system_approved: explicit(true),
    ...changes,
  };
}

function resolve(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "STEEL_PROTECTIVE_COATING",
    operation_class: "APPLY",
    material_system: "JOTUN_HARDTOP_XP",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: values,
  });
}

function completePrompt(areaM2 = 63): string {
  return [
    "Смета покрытия стали Jotun Hardtop XP:",
    `чистая площадь окрашиваемой стальной поверхности ${areaM2} м²;`,
    "толщина сухой плёнки 100 мкм;",
    "способ нанесения: безвоздушное распыление;",
    "профиль поверхности: SSPC-SP10-NACE2-PROFILE-2026-04;",
    "коэффициент потерь нанесения 1,0;",
    "выбранный комплект Jotun Hardtop XP 5 л;",
    "соотношение компонентов A:B=10:1: подтверждено;",
    "система покрытия и совместимость предыдущего слоя: утверждены",
  ].join(" ");
}

describe("Jotun Hardtop XP exact theoretical coating physical norm", () => {
  test("registers the reviewed 100 um profile without loss or kit rounding", () => {
    expect(JOTUN_HARDTOP_XP_100UM_SOURCE_METADATA).toMatchObject({
      norm_id: JOTUN_HARDTOP_XP_100UM_NORM_ID,
      product: "Jotun Hardtop XP",
      dry_film_thickness_um: 100,
      wet_film_thickness_um: 160,
      theoretical_spreading_rate_m2_l: 6.3,
      mixing_ratio_component_a_to_b_by_volume: "10:1",
      typical_combined_kit_sizes_l: [5, 20],
    });
    expect(constructionNormativeRegistryV1.get(JOTUN_HARDTOP_XP_100UM_SOURCE_ID))
      .toMatchObject({
        source_type: "MANUFACTURER_PASSPORT",
        jurisdiction: "INTERNATIONAL_PROJECT",
        authority: "Jotun",
        operation_class_applicability: ["APPLY"],
        material_system_applicability: ["JOTUN_HARDTOP_XP"],
        product_profile_applicability: [JOTUN_HARDTOP_XP_100UM_PRODUCT_PROFILE_ID],
        exact_rate_code_required: false,
      });
    expect(CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1)
      .toContainEqual(expect.objectContaining({
        norm_id: JOTUN_HARDTOP_XP_100UM_NORM_ID,
        work_group: "metalwork",
        technology_class: "STEEL_PROTECTIVE_COATING",
        produced_parameter_ids: ["jotun_hardtop_xp_theoretical_quantity_l"],
      }));
  });

  test("returns 10 theoretical litres for 63 m2 at 100 um", () => {
    const first = resolve(exactInputs());
    const second = resolve(exactInputs());
    expect(first).toMatchObject({
      status: "APPLIED",
      norm_id: JOTUN_HARDTOP_XP_100UM_NORM_ID,
      source_id: JOTUN_HARDTOP_XP_100UM_SOURCE_ID,
      calculated_jotun_hardtop_xp_theoretical_quantity_l: 10,
      produced_parameter_ids: ["jotun_hardtop_xp_theoretical_quantity_l"],
      blockers: [],
    });
    expect(first.parameter_values.jotun_hardtop_xp_theoretical_quantity_l).toMatchObject({
      value: 10,
      unit_id: "l",
      source_type: "APPLICABLE_NORM",
      source_id: JOTUN_HARDTOP_XP_100UM_SOURCE_ID,
    });
    expect(first.parameter_values.jotun_hardtop_xp_theoretical_quantity_l.applicability)
      .toContain("application_loss_factor=1");
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
  });

  test("fails closed for inferred area, another DFT, project loss, kit conflict, or unapproved system", () => {
    const withoutArea = { ...exactInputs(), steel_mass_ton: explicit(5, "ton") };
    delete (withoutArea as Record<string, ProfessionalParameterValueV4>).coated_steel_area_m2;
    expect(resolve(withoutArea)).toMatchObject({
      status: "BLOCKED_REQUIRED_INPUTS",
      blockers: expect.arrayContaining(["PROJECT_VALUE_REQUIRED_EXPLICIT:coated_steel_area_m2"]),
    });
    expect(resolve(exactInputs({ specified_dry_film_thickness_um: explicit(80, "um") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining([expect.stringContaining("specified_dry_film_thickness_um=80")]),
      });
    expect(resolve(exactInputs({ application_loss_factor: explicit(1.15) })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining([expect.stringContaining("application_loss_factor=1.15")]),
      });
    expect(resolve(exactInputs({ selected_kit_size_l: explicit(10, "l") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining([expect.stringContaining("selected_kit_size_l=10")]),
      });
    expect(resolve(exactInputs({ coating_system_approved: explicit(false) })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining(["PHYSICAL_NORM_NOT_APPLICABLE:coating_system_approved"]),
      });
    expect(resolve(exactInputs({ jotun_hardtop_xp_theoretical_quantity_l: explicit(11, "l") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: [expect.stringContaining("PHYSICAL_NORM_VALUE_CONFLICT")],
      });
  });

  test("uses an independent metalwork owner and preserves one theoretical material row", () => {
    expect(resolveDirectConsumerRepairOpenWorldOwner(completePrompt())).toBe("metalwork");
    expect(resolveDirectConsumerRepairOpenWorldOwner("покраска стальной балки 63 м²"))
      .toBeNull();

    const draft = buildDirectConsumerRepairOpenWorldAiDraft(completePrompt(), {
      city: "Бишкек",
      countryCode: "KG",
    });
    const exactRows = draft.items.filter((item) => item.normId === JOTUN_HARDTOP_XP_100UM_NORM_ID);
    expect(draft.selectedWork?.selectedWorkKey).toBe("metalwork_jotun_hardtop_xp_100um_coating");
    expect(exactRows).toHaveLength(1);
    expect(exactRows[0]).toMatchObject({
      quantity: 10,
      unit: "l",
      normSourceId: JOTUN_HARDTOP_XP_100UM_SOURCE_ID,
    });
    expect(exactRows[0]?.sourceParameters).toMatchObject({
      normSourceProfile: "MANUFACTURER_TECHNICAL",
      includedInEstimate: true,
      includedInProcurement: true,
      parameterBlockerIds: [],
    });
    expect(exactRows[0]?.calculationTrace).toContain("kitRounding=false");
  });

  test("changes quantity and money only with independently changed coated area", () => {
    const area63 = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({
      text: completePrompt(63),
      owner: "metalwork",
      currency: "KGS",
    }));
    const area693 = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({
      text: completePrompt(69.3),
      owner: "metalwork",
      currency: "KGS",
    }));
    const first = area63.rows.find((row) => row.normId === JOTUN_HARDTOP_XP_100UM_NORM_ID)!;
    const second = area693.rows.find((row) => row.normId === JOTUN_HARDTOP_XP_100UM_NORM_ID)!;
    const firstOtherMaterial = area63.rows.find((row) => row.code === "material_2")!;
    const secondOtherMaterial = area693.rows.find((row) => row.code === "material_2")!;
    expect(second.quantity - first.quantity).toBeCloseTo(1, 9);
    expect(second.unitPrice).toBe(first.unitPrice);
    expect(second.quantity * second.unitPrice - first.quantity * first.unitPrice)
      .toBeCloseTo(first.unitPrice, 9);
    expect(secondOtherMaterial.quantity).toBe(firstOtherMaterial.quantity);
    expect(second.calculationTrace).toContain("applicationLoss=false");
  });

  test("keeps incomplete exact input blocked and generic metal paint unbound", () => {
    const incomplete = buildDirectConsumerRepairOpenWorldAiDraft(
      "Смета Jotun Hardtop XP для металлоконструкций 63 м²",
      { city: "Бишкек", countryCode: "KG" },
    );
    const blocked = incomplete.items.find((item) => item.normId === JOTUN_HARDTOP_XP_100UM_NORM_ID);
    expect(blocked).toMatchObject({ quantity: 0 });
    expect(blocked?.sourceParameters).toMatchObject({
      includedInEstimate: false,
      includedInProcurement: false,
      conditionalStatus: "blocked_missing_parameters",
    });
    expect(incomplete.missingData).toEqual(expect.arrayContaining([
      expect.stringContaining("чистую площадь"),
      expect.stringContaining("толщину сухой плёнки"),
    ]));

    const generic = buildDirectConsumerRepairOpenWorldAiDraft(
      "Смета обычной окраски стальных конструкций 63 м²",
      { city: "Бишкек", countryCode: "KG" },
    );
    expect(generic.items.some((item) => item.normId === JOTUN_HARDTOP_XP_100UM_NORM_ID))
      .toBe(false);
    expect(generic.items.some((item) => item.normSourceId === JOTUN_HARDTOP_XP_100UM_SOURCE_ID))
      .toBe(false);
  });
});
