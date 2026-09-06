import { expectProfessionalDomainVisibleBaselineJourney } from "./professionalDomainVisibleBaseline.shared";
import { buildInteriorFinishesFromInlineInputV1 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/productionBinding";
import { resolveRegisteredProfessionalEstimateSelectionV1 } from "../../src/lib/estimate/v4/domains/registeredProfessionalEstimateDomainsV1";

describe("registered professional visible baseline — drywall", () => {
  it("builds and recalculates the exact drywall schema without unrelated dimensions or invented prices", () => {
    expectProfessionalDomainVisibleBaselineJourney({
      templateId: "drywall_ceiling_interior_bulkhead_prepare_small_area_professional_expanded_v1",
      titleRu: "Подготовка короба из гипсокартона",
    });
  });

  it("keeps repair fail-closed until an exact KRERr rate code is supplied", () => {
    const selection = resolveRegisteredProfessionalEstimateSelectionV1(
      "drywall_ceiling_interior_drywall_partition_repair_standard_professional_expanded_v1",
    );
    expect(selection).not.toBeNull();
    const rawInput = `${selection!.title_ru} площадь 100 м2`;
    const baseInput = {
      rawInput,
      selectedWorkKey: selection!.work_key,
      selectedTemplateId: selection!.template_id,
      currency: "KGS",
      countryCode: "KG",
    };
    const blocked = buildInteriorFinishesFromInlineInputV1(baseInput);
    expect(blocked.production?.compile_result.status).toBe("NEEDS_REQUIRED_INPUTS");
    expect(blocked.missing_parameter_ids).toContain("PROJECT_VALUE_REQUIRED:normative_rate_code");
    expect(blocked.production?.draft).toBeNull();

    const confirmed = buildInteriorFinishesFromInlineInputV1({
      ...baseInput,
      paramOverrides: {
        normative_rate_code: {
          value: "PROJECT-VERIFIED-EXACT-KRERR-RATE-CODE",
          source: "user_input",
        },
      },
    });
    expect(confirmed.production?.compile_result.status).toBe("COMPILED");
    expect(confirmed.production?.draft?.items.length).toBeGreaterThan(0);
    expect(confirmed.production?.draft?.items.every((item) => item.unitPrice == null)).toBe(true);
  });
});
