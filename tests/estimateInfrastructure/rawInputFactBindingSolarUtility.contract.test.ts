import { parseInlineWorkEstimatePrompt } from "../../src/lib/ai/parseInlineWorkEstimatePrompt";
import { calculateExpandedComplexEstimate } from "../../src/lib/ai/expandedComplexWorks";
import { renderPdfFromDraftRevision } from "../../src/features/pdf/renderPdfFromDraftRevision";
import { buildAiEstimateParameterCards } from "../../src/lib/estimate/buildAiEstimateParameterCards";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { materialQuantityLinesFromRows } from "../../src/lib/estimate/professionalMaterialQuantityTrace";

describe("raw input fact binding for utility solar", () => {
  it("keeps 100 MW as explicit solar capacity, scale and first-step questions", () => {
    const prompt = "Солнечная электростанция 100 МВт";
    const parse = parseInlineWorkEstimatePrompt(prompt);
    const factsByKey = new Map(parse.rawInputFacts.map((fact) => [fact.canonical_parameter_key, fact]));

    expect(parse.matchedTemplate?.family).toBe("solar_power_plant");
    expect(factsByKey.get("work_family")?.normalized_value).toBe("solar_power_plant");
    expect(factsByKey.get("capacity")?.normalized_value).toBe(100);
    expect(factsByKey.get("capacity")?.normalized_unit).toBe("MW");
    expect(factsByKey.get("capacity_mw")?.normalized_value).toBe(100);
    expect(factsByKey.get("capacity_watts")?.normalized_value).toBe(100_000_000);
    expect(factsByKey.get("scale_class")?.normalized_value).toBe("utility_scale");
    expect(parse.rawInputFactExtraction.metrics).toEqual({
      explicit_input_facts_ignored: 0,
      explicit_input_unit_mismatches: 0,
      explicit_input_facts_overwritten_by_default: 0,
    });

    const revision = createEstimateDraftRevision({
      rawInput: prompt,
      createdAt: "2026-07-14T00:00:00.000Z",
    });
    const missingKeys = revision.missingInputs.map((item) => item.key);
    const cards = buildAiEstimateParameterCards({ revision, includeMissing: true });
    const cardKeys = cards.map((card) => card.key);
    const visibleCardText = cards.map((card) => `${card.labelRu} ${card.displayValueRu} ${card.sourceLabelRu}`).join("\n");

    expect(revision.matchedFamily).toBe("solar_power_plant");
    expect(revision.estimateLevel).toBe("CONCEPT_SCOPE");
    expect(revision.params.capacity_mw).toEqual(expect.objectContaining({
      value: 100,
      canonicalUnit: "MW",
      source: "user_input",
      sourceText: "100 МВт",
    }));
    expect(revision.params.capacity_watts?.value).toBe(100_000_000);
    expect(revision.params.scale_class?.value).toBe("utility_scale");
    expect(missingKeys).toEqual([
      "solar_capacity_basis",
      "solar_installation_type",
      "project_location",
      "solar_mounting_type",
      "grid_connection_scope",
    ]);
    expect(missingKeys).not.toContain("capacity");
    expect(cardKeys).toEqual(expect.arrayContaining([
      "capacity_mw",
      "scale_class",
      "solar_capacity_basis",
      "solar_installation_type",
      "project_location",
      "solar_mounting_type",
      "grid_connection_scope",
    ]));
    expect(cardKeys).not.toEqual(expect.arrayContaining(["area_m2", "work_package", "power_mw"]));
    expect(cards.find((card) => card.key === "capacity_mw")).toEqual(expect.objectContaining({
      labelRu: "Мощность электростанции",
      displayValueRu: "100 МВт",
      sourceLabelRu: "из запроса",
      missing: false,
    }));
    expect(cards.find((card) => card.key === "scale_class")?.displayValueRu).toBe("промышленная электростанция");
    expect(visibleCardText).not.toMatch(/Дополнительный параметр|Р”РѕРїРѕР»РЅРёС‚РµР»СЊРЅС‹Р№ РїР°СЂР°РјРµС‚СЂ|solar_power_plant|PRELIMINARY_REQUIRES_INPUT/i);
    expect(revision.boq.rows.length).toBeGreaterThanOrEqual(25);
    expect(revision.boq.rows.map((row) => row.titleRu).join("\n")).toEqual(expect.stringContaining("Фотоэлектрические модули"));
    expect(revision.boq.rows.map((row) => row.titleRu).join("\n")).not.toMatch(/BESS|ВЭУ|Солнечные панели без выбора модели/i);
    expect(revision.boq.rows.filter((row) => row.unit === "set" && row.quantity === 1)).toEqual([]);

    const pdf = renderPdfFromDraftRevision({ revision });
    expect(pdf.pdf.body).toMatch(/Предварительная смета:|РџСЂРµРґРІР°СЂРёС‚РµР»СЊРЅР°СЏ СЃРјРµС‚Р°:/);
    expect(pdf.pdf.body).toMatch(/Солнечная электростанция мощностью 100 МВт|РЎРѕР»РЅРµС‡РЅР°СЏ СЌР»РµРєС‚СЂРѕСЃС‚Р°РЅС†РёСЏ РјРѕС‰РЅРѕСЃС‚СЊСЋ 100 РњР’С‚/);
    expect(pdf.pdf.body).toMatch(/Уровень сметы: концепция состава работ|РЈСЂРѕРІРµРЅСЊ СЃРјРµС‚С‹: РєРѕРЅС†РµРїС†РёСЏ СЃРѕСЃС‚Р°РІР° СЂР°Р±РѕС‚/);
    expect(pdf.pdf.body).toMatch(/Мощность электростанции: 100 МВт|РњРѕС‰РЅРѕСЃС‚СЊ СЌР»РµРєС‚СЂРѕСЃС‚Р°РЅС†РёРё: 100 РњР’С‚/);
    expect(pdf.pdf.body).toMatch(/Стоимость не рассчитана|РЎС‚РѕРёРјРѕСЃС‚СЊ РЅРµ СЂР°СЃСЃС‡РёС‚Р°РЅР°/);
    expect(pdf.pdf.body).not.toMatch(/предварительная профессиональная ведомость|РїСЂРµРґРІР°СЂРёС‚РµР»СЊРЅР°СЏ РїСЂРѕС„РµСЃСЃРёРѕРЅР°Р»СЊРЅР°СЏ РІРµРґРѕРјРѕСЃС‚СЊ/i);
    expect(pdf.pdf.body).not.toMatch(/revision=.*solar_power_plant|snapshot=.*solar_power_plant|solar_power_plant|draft_solar_power_plant|PRELIMINARY_REQUIRES_INPUT|Материалы\s*[—-]\s*0\s*сом|РњР°С‚РµСЂРёР°Р»С‹\s*[—-]\s*0\s*СЃРѕРј|materials=0\.00|preliminary_total=0\.00/i);

    const mwQuantityLines = materialQuantityLinesFromRows({
      rows: revision.boq.rows,
      templateId: revision.selectedTemplateId,
      family: revision.matchedFamily,
    }).filter((line) => line.unit === "mw");
    expect(mwQuantityLines.length).toBeGreaterThanOrEqual(3);
    expect(mwQuantityLines.every((line) => line.procurementUnit === "mw")).toBe(true);
  });

  it("classifies 30 kW solar as small and never converts it into utility scale", () => {
    const prompt = "Солнечная электростанция 30 кВт";
    const revision = createEstimateDraftRevision({
      rawInput: prompt,
      createdAt: "2026-07-14T00:00:00.000Z",
    });
    const estimate = calculateExpandedComplexEstimate({ prompt });

    expect(revision.params.capacity_mw?.value).toBe(0.03);
    expect(revision.params.capacity_kw?.value).toBe(30);
    expect(revision.params.capacity_watts?.value).toBe(30_000);
    expect(revision.params.scale_class?.value).toBe("small_rooftop_or_ground");
    expect(estimate?.input_parameters.capacity_mw).toBe(0.03);
    expect(estimate?.input_parameters.scale_class).toBe("small_rooftop_or_ground");
  });
});
