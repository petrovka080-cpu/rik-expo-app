import { buildDirectConsumerRepairOpenWorldAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { compileDynamicProfessionalBoq } from "../../src/lib/ai/professionalBoq/compileDynamicProfessionalBoq";
import { buildOwnedDomainEstimatorReasoningPlan } from "../../src/lib/estimate/ownedDomain/buildOwnedDomainEstimatorReasoningPlan";
import { resolveDirectConsumerRepairOpenWorldOwner } from "../../src/lib/estimate/ownedDomain/directConsumerRepairOpenWorldRouting";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import {
  CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1,
  ROCKWOOL_FIXROCK_CONVENTIONAL_NORM_ID,
  ROCKWOOL_FIXROCK_CONVENTIONAL_PRODUCT_PROFILE_ID,
  ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_ID,
  ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_METADATA,
  constructionNormativeRegistryV1,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../../src/lib/estimate/v4/domainFactory";

const CAPTURED_AT = "2026-09-12T17:00:00.000Z";

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
    applicability: "Exact ROCKWOOL Fixrock conventional VHF fixture",
  };
}

function exactInputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(ROCKWOOL_FIXROCK_CONVENTIONAL_PRODUCT_PROFILE_ID),
    facade_insulation_area_m2: explicit(10, "m2"),
    fixing_variant: explicit("CONVENTIONAL_INSULATION_HOLDER"),
    conventional_holder_fixing_confirmed: explicit(true),
    adhesive_variant_excluded: explicit(true),
    one_dowel_variant_excluded: explicit(true),
    ...changes,
  };
}

function resolve(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "VENTILATED_FACADE_INSULATION",
    operation_class: "FIX",
    material_system: "ROCKWOOL_FIXROCK_CONVENTIONAL",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: values,
  });
}

function completePrompt(areaM2 = 10): string {
  return [
    "Смета крепления ROCKWOOL Fixrock вентилируемого фасада:",
    `чистая площадь фасадной теплоизоляции Fixrock ${areaM2} м²;`,
    "вариант крепления: обычные держатели;",
    "обычное крепление держателями для VHF подтверждено;",
    "клеевой вариант исключён;",
    "вариант одного дюбеля на плиту исключён",
  ].join(" ");
}

describe("ROCKWOOL Fixrock exact conventional VHF holder physical norm", () => {
  test("registers the reviewed average five holders per m2 profile", () => {
    expect(ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_METADATA).toMatchObject({
      norm_id: ROCKWOOL_FIXROCK_CONVENTIONAL_NORM_ID,
      rate_value: 5,
      system: "ROCKWOOL Fixrock ventilated facade insulation",
      installation_variant: "conventional insulation-holder fixing",
    });
    expect(constructionNormativeRegistryV1.get(ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_ID))
      .toMatchObject({
        source_type: "MANUFACTURER_PASSPORT",
        jurisdiction: "INTERNATIONAL_PROJECT",
        authority: "ROCKWOOL",
        operation_class_applicability: ["FIX"],
        material_system_applicability: ["ROCKWOOL_FIXROCK_CONVENTIONAL"],
        product_profile_applicability: [ROCKWOOL_FIXROCK_CONVENTIONAL_PRODUCT_PROFILE_ID],
        exact_rate_code_required: false,
      });
    expect(CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1)
      .toContainEqual(expect.objectContaining({
        norm_id: ROCKWOOL_FIXROCK_CONVENTIONAL_NORM_ID,
        work_group: "facade",
        technology_class: "VENTILATED_FACADE_INSULATION",
        produced_parameter_ids: ["rockwool_fixrock_conventional_holder_quantity_piece"],
      }));
  });

  test("returns 50 holders for 10 m2 and rounds a fractional result upward", () => {
    const first = resolve(exactInputs());
    const fractional = resolve(exactInputs({ facade_insulation_area_m2: explicit(10.1, "m2") }));
    expect(first).toMatchObject({
      status: "APPLIED",
      norm_id: ROCKWOOL_FIXROCK_CONVENTIONAL_NORM_ID,
      source_id: ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_ID,
      calculated_rockwool_fixrock_conventional_holder_quantity_piece: 50,
      blockers: [],
    });
    expect(fractional).toMatchObject({
      status: "APPLIED",
      calculated_rockwool_fixrock_conventional_holder_quantity_piece: 51,
    });
    expect(first.parameter_values.rockwool_fixrock_conventional_holder_quantity_piece)
      .toMatchObject({
        value: 50,
        unit_id: "piece",
        source_type: "APPLICABLE_NORM",
        source_id: ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_ID,
      });
    expect(first.deterministic_hash).toBe(resolve(exactInputs()).deterministic_hash);
  });

  test("fails closed for inferred area, another variant, missing exclusions, or conflict", () => {
    const withoutArea = { ...exactInputs(), facade_gross_area_m2: explicit(10, "m2") };
    delete (withoutArea as Record<string, ProfessionalParameterValueV4>).facade_insulation_area_m2;
    expect(resolve(withoutArea)).toMatchObject({
      status: "BLOCKED_REQUIRED_INPUTS",
      blockers: expect.arrayContaining(["PROJECT_VALUE_REQUIRED_EXPLICIT:facade_insulation_area_m2"]),
    });
    expect(resolve(exactInputs({ fixing_variant: explicit("ONE_DOWEL_PER_BOARD") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining([expect.stringContaining("fixing_variant=ONE_DOWEL_PER_BOARD")]),
      });
    expect(resolve(exactInputs({ adhesive_variant_excluded: explicit(false) })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining(["PHYSICAL_NORM_NOT_APPLICABLE:adhesive_variant_excluded"]),
      });
    expect(resolve(exactInputs({ one_dowel_variant_excluded: explicit(false) })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining(["PHYSICAL_NORM_NOT_APPLICABLE:one_dowel_variant_excluded"]),
      });
    expect(resolve(exactInputs({
      rockwool_fixrock_conventional_holder_quantity_piece: explicit(51, "piece"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [expect.stringContaining("PHYSICAL_NORM_VALUE_CONFLICT")],
    });
  });

  test("uses a product-exact facade owner and one holder row", () => {
    expect(resolveDirectConsumerRepairOpenWorldOwner(completePrompt())).toBe("facade");
    expect(resolveDirectConsumerRepairOpenWorldOwner("утепление вентилируемого фасада 10 м²"))
      .toBe("insulation");

    const draft = buildDirectConsumerRepairOpenWorldAiDraft(completePrompt(), {
      city: "Бишкек",
      countryCode: "KG",
    });
    const exactRows = draft.items.filter(
      (item) => item.normId === ROCKWOOL_FIXROCK_CONVENTIONAL_NORM_ID,
    );
    expect(draft.selectedWork?.selectedWorkKey).toBe("facade_rockwool_fixrock_conventional_holders");
    expect(exactRows).toHaveLength(1);
    expect(exactRows[0]).toMatchObject({
      quantity: 50,
      unit: "piece",
      normSourceId: ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_ID,
    });
    expect(exactRows[0]?.sourceParameters).toMatchObject({
      normSourceProfile: "MANUFACTURER_TECHNICAL",
      includedInEstimate: true,
      includedInProcurement: true,
      parameterBlockerIds: [],
    });
    expect(exactRows[0]?.calculationTrace).toContain("result=50");
  });

  test("changes quantity and money only with the exact insulation area", () => {
    const area10 = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({
      text: completePrompt(10),
      owner: "facade",
      currency: "KGS",
    }));
    const area102 = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({
      text: completePrompt(10.2),
      owner: "facade",
      currency: "KGS",
    }));
    const first = area10.rows.find((row) => row.normId === ROCKWOOL_FIXROCK_CONVENTIONAL_NORM_ID)!;
    const second = area102.rows.find((row) => row.normId === ROCKWOOL_FIXROCK_CONVENTIONAL_NORM_ID)!;
    const firstOtherMaterial = area10.rows.find((row) => row.code === "material_2")!;
    const secondOtherMaterial = area102.rows.find((row) => row.code === "material_2")!;
    expect(second.quantity - first.quantity).toBe(1);
    expect(second.unitPrice).toBe(first.unitPrice);
    expect(second.quantity * second.unitPrice - first.quantity * first.unitPrice)
      .toBeCloseTo(first.unitPrice, 9);
    expect(secondOtherMaterial.quantity).toBe(firstOtherMaterial.quantity);
  });

  test("keeps incomplete Fixrock input blocked and generic facade insulation unbound", () => {
    const incomplete = buildDirectConsumerRepairOpenWorldAiDraft(
      "Смета ROCKWOOL Fixrock, площадь фасадной теплоизоляции Fixrock 10 м²",
      { city: "Бишкек", countryCode: "KG" },
    );
    const blocked = incomplete.items.find(
      (item) => item.normId === ROCKWOOL_FIXROCK_CONVENTIONAL_NORM_ID,
    );
    expect(blocked).toMatchObject({ quantity: 0 });
    expect(blocked?.sourceParameters).toMatchObject({
      includedInEstimate: false,
      includedInProcurement: false,
      conditionalStatus: "blocked_missing_parameters",
    });
    expect(incomplete.missingData).toEqual(expect.arrayContaining([
      expect.stringContaining("обычный вариант"),
      expect.stringContaining("клеевой вариант"),
      expect.stringContaining("одного дюбеля"),
    ]));

    const generic = buildDirectConsumerRepairOpenWorldAiDraft(
      "Смета утепления вентилируемого фасада каменной ватой 10 м²",
      { city: "Бишкек", countryCode: "KG" },
    );
    expect(generic.items.some((item) => item.normId === ROCKWOOL_FIXROCK_CONVENTIONAL_NORM_ID))
      .toBe(false);
    expect(generic.items.some((item) => item.normSourceId === ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_ID))
      .toBe(false);
  });
});
