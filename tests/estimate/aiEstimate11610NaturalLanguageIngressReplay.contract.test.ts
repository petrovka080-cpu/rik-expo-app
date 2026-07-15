import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { buildProfessionalWorkPassport } from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { extractWorkParamsFromInlinePrompt } from "../../src/lib/ai/extractWorkParamsFromInlinePrompt";
import { matchWorkTemplateFromPrompt } from "../../src/lib/ai/matchWorkTemplateFromPrompt";
import {
  runAiEstimate11610NaturalLanguageIngressReplay,
  STOP_AI_ESTIMATE_11610_NATURAL_LANGUAGE_INGRESS_BLOCKED_NO_RELEASE,
} from "../../scripts/estimate/runAiEstimate11610NaturalLanguageIngressReplay";

describe("AI estimate 11610 natural-language ingress replay", () => {
  it("runs user-ingress estimates without explicit template or work-key backdoors", () => {
    const result = runAiEstimate11610NaturalLanguageIngressReplay({ limit: 2 });

    expect(result.summary.selected_templates).toBe(2);
    expect(result.summary.cases_completed).toBe(6);
    expect(result.summary.cases_passed).toBe(6);
    expect(result.summary.cases_failed).toBe(0);
    expect(result.summary.explicit_template_id_used).toBe(false);
    expect(result.summary.explicit_work_key_used).toBe(false);
    expect(result.summary.limited_smoke_only).toBe(true);
    expect(result.summary.full_34830_natural_language_ingress_passed).toBe(false);
    expect(result.summary.final_status).toBe(STOP_AI_ESTIMATE_11610_NATURAL_LANGUAGE_INGRESS_BLOCKED_NO_RELEASE);
  });

  it("builds a passport-backed draft from natural text only", () => {
    const templateId = "strip_foundation_preliminary_boq_expanded_complex_v1";
    const passport = buildProfessionalWorkPassport(templateId);
    expect(passport).toBeTruthy();

    const revision = createEstimateDraftRevision({
      rawInput: `${passport!.localizedNameRu} 40 linear_m`,
      city: "Bishkek",
      countryCode: "KG",
      currency: "KGS",
      createdAt: "2026-07-15T00:00:00.000Z",
    });

    expect(revision.selectedTemplateId).toBe(templateId);
    expect(revision.boq.rows).toHaveLength(passport!.boqRecipe.rowCount);
    expect(revision.boq.rows.every((row) => row.sourceParameters?.passportBackedNaturalLanguageIngress === true)).toBe(true);
  });

  it("rejects an arbitrary selectedTemplateId and keeps resolver-selected semantics", () => {
    const revision = createEstimateDraftRevision({
      rawInput: "ventilated facade 1500 m2",
      selectedTemplateId: "not_a_registry_template",
      city: "Bishkek",
      countryCode: "KG",
      currency: "KGS",
      createdAt: "2026-07-15T00:00:00.000Z",
    });

    expect(revision.selectedTemplateId).toBe("ventilated_facade_preliminary_boq_expanded_complex_v1");
    expect(revision.selectedTemplateId).not.toBe("not_a_registry_template");
    expect(revision.matchedFamily).toBe("ventilated_facade");
  });

  it("prefers the most specific catalog title over broad expanded-family resolvers", () => {
    const cases = [
      {
        templateId: "high_rise_glazing_tender_boq_expanded_complex_v1",
        levelPhrase: "тендерная ведомость объемов",
      },
      {
        templateId: "process_piping_dn50_dn1200_rom_concept_expanded_complex_v1",
        levelPhrase: "укрупненная концептуальная смета",
      },
      {
        templateId: "boiler_installation_rom_concept_expanded_complex_v1",
        levelPhrase: "укрупненная концептуальная смета",
      },
    ];

    for (const { templateId, levelPhrase } of cases) {
      const passport = buildProfessionalWorkPassport(templateId);
      expect(passport).toBeTruthy();
      const match = matchWorkTemplateFromPrompt({
        rawInput: `${levelPhrase} ${passport!.localizedNameRu} 400 м, город Бишкек.`,
      });

      expect(match.matchedTemplate?.templateId).toBe(templateId);
      expect(match.matchedTemplate?.family).toBe(passport!.familyId);
    }
  });

  it("extracts bare linear quantities when punctuation follows the unit", () => {
    const params = extractWorkParamsFromInlinePrompt("Строительство дороги 400 м, город Бишкек.");

    expect(params.length_m?.value).toBe(400);
    expect(params.length_m?.canonicalUnit).toBe("m");
  });

  it("extracts count quantities when punctuation follows the unit", () => {
    const params = extractWorkParamsFromInlinePrompt("Монтаж дверей 40 шт, город Бишкек.");

    expect(params.count?.value).toBe(40);
    expect(params.count?.canonicalUnit).toBe("pcs");
  });

  it("keeps duplicate generated catalog titles disambiguated by a user-visible section label", () => {
    const expectedTemplateIds = [
      "ventilation_interior_duct_insulation_install_standard_professional_expanded_v1",
      "insulation_interior_duct_install_standard_professional_expanded_v1",
      "paving_roads_landscape_interior_gravel_base_compact_standard_professional_expanded_v1",
      "earthworks_interior_gravel_base_compact_standard_professional_expanded_v1",
      "waterproofing_interior_joint_repair_standard_professional_expanded_v1",
      "special_repair_interior_joint_seal_repair_standard_professional_expanded_v1",
    ];

    for (const templateId of expectedTemplateIds) {
      const passport = buildProfessionalWorkPassport(templateId);
      expect(passport?.localizedNameRu).toContain("раздел:");
      const match = matchWorkTemplateFromPrompt({
        rawInput: `${passport!.localizedNameRu} 100 м2, город Бишкек.`,
      });

      expect(match.matchedTemplate?.templateId).toBe(templateId);
    }
  });
});
