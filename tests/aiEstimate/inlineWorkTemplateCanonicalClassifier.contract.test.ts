import { matchWorkTemplateFromPrompt } from "../../src/lib/ai/matchWorkTemplateFromPrompt";
import { buildConsumerRepairDraftFromAiEstimateRuntime } from "../../src/lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime";

describe("canonical inline work template classifier", () => {
  it.each([
    {
      prompt: "ленточный фундамент длиной 53 метра",
      family: "strip_foundation",
      templateId: "strip_foundation_preliminary_boq_expanded_complex_v1",
      reasonPrefix: "phrase:strip_foundation",
    },
    {
      prompt: "монолитная фундаментная плита площадью 76 м2",
      family: "raft_foundation",
      templateId: "raft_foundation_preliminary_boq_expanded_complex_v1",
      reasonPrefix: "category_hint:foundation_concrete",
    },
    {
      prompt: "external sewer 3 km pipe 200 mm manholes every 60 m",
      family: "village_sewer_network",
      templateId: "village_sewer_network_preliminary_boq_expanded_complex_v1",
      reasonPrefix: "contextual_explicit_village_sewer_network_alias",
    },
    {
      prompt: "наружная канализация 3 км",
      family: "village_sewer_network",
      templateId: "village_sewer_network_preliminary_boq_expanded_complex_v1",
      reasonPrefix: "expanded_complex_resolver",
    },
    {
      prompt: "РІРѕРґРѕРїСЂРѕРїСѓСЃРєРЅР°СЏ С‚СЂСѓР±Р° РїРѕРґ РґРѕСЂРѕРіРѕР№ 36 Рј СЃРµС‡РµРЅРёРµ 2 Рј Р±РµС‚РѕРЅРЅС‹Рµ РѕРіРѕР»РѕРІРєРё",
      family: "culverts",
      templateId: "culverts_preliminary_boq_expanded_complex_v1",
      reasonPrefix: "expanded_complex_resolver",
    },
    {
      prompt: "estimate cost for roadworks site grading base compaction industrial earthworks and site preparation package alpha 40 sqm",
      family: "road_subgrade",
      templateId: "road_subgrade_preliminary_boq_expanded_complex_v1",
      reasonPrefix: "contextual_explicit_road_subgrade_alias",
    },
    {
      prompt: "estimate cost for concrete bridge culvert installation residential small bridges and culverts package alpha 84 sqm",
      family: "bridge_construction",
      templateId: "bridge_construction_preliminary_boq_expanded_complex_v1",
      reasonPrefix: "contextual_explicit_bridge_culvert_alias",
    },
    {
      prompt: "РєР°Р±РµР»СЊРЅР°СЏ Р»РёРЅРёСЏ 0.4 РєР’ 800 Рј С‚СЂР°РЅС€РµСЏ РєР°Р±РµР»СЊ 4С…50",
      family: "underground_cable_line",
      templateId: "underground_cable_line_preliminary_boq_expanded_complex_v1",
      reasonPrefix: "explicit_underground_cable_line_alias",
    },
    {
      prompt: "С‚СЂР°РЅСЃС„РѕСЂРјР°С‚РѕСЂРЅР°СЏ РїРѕРґСЃС‚Р°РЅС†РёСЏ 10 РєР’ СЃ РљРўРџ РєР°Р±РµР»СЊРЅС‹РјРё РІРІРѕРґР°РјРё",
      family: "transformer_substation",
      templateId: "transformer_substation_preliminary_boq_expanded_complex_v1",
      reasonPrefix: "explicit_transformer_substation_alias",
    },
  ])("matches natural-language $family without synthetic work-key prompts", ({ prompt, family, templateId, reasonPrefix }) => {
    const result = matchWorkTemplateFromPrompt({ rawInput: prompt });

    expect(result.matchedTemplate).toMatchObject({ family, templateId });
    expect(result.candidateTemplates[0]).toMatchObject({ family, templateId });
    expect(result.candidateTemplates[0]?.reason.startsWith(reasonPrefix)).toBe(true);
    expect(result.mustAskUserToSelectTemplate).toBe(false);
  });

  it("does not treat underscore work keys as free-text classifier evidence", () => {
    const fuzzy = matchWorkTemplateFromPrompt({ rawInput: "Estimate strip_foundation 53 linear_m" });
    const explicit = matchWorkTemplateFromPrompt({
      rawInput: "53 linear_m",
      selectedWorkKey: "strip_foundation",
    });
    const runtimeDraft = buildConsumerRepairDraftFromAiEstimateRuntime({
      rawInput: "53 linear_m",
      selectedWorkKey: "strip_foundation",
      city: "Bishkek",
      currency: "KGS",
    });

    expect(fuzzy.matchedTemplate).toBeNull();
    expect(fuzzy.blockingReason).toBe("technical_work_key_requires_explicit_selection");
    expect(explicit.matchedTemplate).toMatchObject({
      family: "strip_foundation",
      templateId: "strip_foundation_preliminary_boq_expanded_complex_v1",
    });
    expect(runtimeDraft?.items[0]?.templateId).toBe("strip_foundation_preliminary_boq_expanded_complex_v1");
  });

  it("does not route profile sheet fence free text to the interior catalog template", () => {
    const prompt = "site perimeter profiled metal fence 60 m height 2 m concrete posts";
    const match = matchWorkTemplateFromPrompt({ rawInput: prompt });
    const draft = buildConsumerRepairDraftFromAiEstimateRuntime({ rawInput: prompt, city: "Bishkek", currency: "KGS" });

    expect(match.matchedTemplate).toBeNull();
    expect(match.candidateTemplates.map((candidate) => candidate.templateId)).not.toContain(
      "carpentry_metal_interior_fence_install_standard_professional_expanded_v1",
    );
    expect(draft).toMatchObject({
      repairType: "profile_sheet_fence",
      selectedWork: {
        selectedWorkKey: "dynamic_fencing_estimate_dynamic_professional_boq_runtime_v1",
      },
    });
    expect(draft?.items[0]?.templateId).toBe("dynamic_fencing_estimate_dynamic_professional_boq_runtime_v1");
    expect(draft?.items.map((item) => item.unit)).toEqual(
      expect.arrayContaining(["linear_m", "m3", "pcs", "sq_m", "trip"]),
    );
  });

  it("defers diamond drilling away from generic concrete and keeps runtime draft identity", () => {
    const prompt = "diamond core drilling concrete 12 holes diameter 90 mm depth 180 mm";
    const match = matchWorkTemplateFromPrompt({ rawInput: prompt });
    const draft = buildConsumerRepairDraftFromAiEstimateRuntime({ rawInput: prompt, city: "Bishkek", currency: "KGS" });

    expect(match.matchedTemplate).toBeNull();
    expect(match.blockingReason).toBe("specific_professional_fallback");
    expect(draft).toMatchObject({
      repairType: "diamond_core_drilling_concrete",
      selectedWork: {
        selectedWorkKey: "diamond_core_drilling_concrete_professional_boq_runtime_v1",
      },
    });
    expect(draft?.items[0]?.templateId).toBe("diamond_core_drilling_concrete_professional_boq_runtime_v1");
  });
});
