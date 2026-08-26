import {
  CONCRETE_R6_DEFINITIONS,
  compileConcreteR6Estimate,
  findConcreteDefinitionR6,
  sampleConcreteR6Input,
} from "../../scripts/estimate/concreteBackendR6/concreteProfessionalDefinitionsR6";
import { auditRealProfessionalRowsR1 } from "../../scripts/estimate/concreteBackendR6/realProfessionalEstimateContentGateR1";
import {
  REAL_PROFESSIONAL_ESTIMATES_R2_SPEC_SHA256,
  STRIP_FOUNDATION_GOLD_INPUT,
  STRIP_FOUNDATION_INPUTS,
  STRIP_FOUNDATION_ROWS,
  compileStripFoundationEstimate,
} from "../../scripts/estimate/concreteBackendR6/reinforcedConcreteStripFoundationR1";

const rowMap = (rows: ReturnType<typeof compileStripFoundationEstimate>) =>
  new Map(rows.map((row) => [row.rowId, row]));

describe("R6 real professional concrete content contract", () => {
  test("binds the exact master specification", () => {
    expect(REAL_PROFESSIONAL_ESTIMATES_R2_SPEC_SHA256).toBe(
      "b9373689e495a8d7e0883818371022eb792800baf10d19340f50c1aace08d986",
    );
  });

  test("keeps sixteen distinct first-wave concrete definitions", () => {
    expect(CONCRETE_R6_DEFINITIONS).toHaveLength(16);
    expect(new Set(CONCRETE_R6_DEFINITIONS.map((item) => item.catalogId)).size).toBe(16);
    expect(new Set(CONCRETE_R6_DEFINITIONS.map((item) => item.titleRu)).size).toBe(16);
  });

  test("gold strip foundation has exactly four allowed non-empty sections", () => {
    const rows = compileStripFoundationEstimate(STRIP_FOUNDATION_GOLD_INPUT);
    const categories = [...new Set(rows.map((row) => row.category))].sort();
    expect(categories).toEqual(["construction_work", "delivery", "machine_equipment", "material"]);
    for (const category of categories) expect(rows.filter((row) => row.category === category).length).toBeGreaterThan(0);
  });

  test("gold geometry reproduces 30.00/30.60/2.00/120.00/20.00 and 2.40 t", () => {
    const rows = rowMap(compileStripFoundationEstimate(STRIP_FOUNDATION_GOLD_INPUT));
    expect(rows.get("concrete_placement")?.evaluatedQuantity).toBe("30");
    expect(rows.get("main_concrete")?.evaluatedQuantity).toBe("30.6");
    expect(rows.get("preparation_concrete")?.evaluatedQuantity).toBe("2");
    expect(rows.get("formwork_system")?.evaluatedQuantity).toBe("120");
    expect(rows.get("curing_membrane")?.evaluatedQuantity).toBe("20");
    expect(rows.get("reinforcement")?.evaluatedQuantity).toBe("2.4");
  });

  test("gold delivery is separated by cargo, distance and vehicle", () => {
    const rows = rowMap(compileStripFoundationEstimate(STRIP_FOUNDATION_GOLD_INPUT));
    expect(rows.get("concrete_delivery")).toMatchObject({ cargoQuantity: "30.6", distanceKm: "18" });
    expect(rows.get("reinforcement_delivery")).toMatchObject({ cargoQuantity: "2.4", distanceKm: "18" });
    expect(rows.get("formwork_delivery")).toMatchObject({ cargoQuantity: "12", distanceKm: "18" });
    expect(rows.get("concrete_delivery")?.cargo?.vehicleRu).toBe("автобетоносмеситель");
    expect(rows.get("reinforcement_delivery")?.cargo?.vehicleRu).toBe("бортовой автомобиль");
  });

  test("gold rows pass the anti-garbage compiler gate", () => {
    expect(auditRealProfessionalRowsR1(compileStripFoundationEstimate(STRIP_FOUNDATION_GOLD_INPUT))).toEqual([]);
  });

  test("all displayed parameter labels are concise and explanations stay in guides", () => {
    expect(STRIP_FOUNDATION_INPUTS.every((parameter) => !parameter.titleRu.includes(":"))).toBe(true);
    expect(STRIP_FOUNDATION_INPUTS.every((parameter) => parameter.guideRu.trim().length > 10)).toBe(true);
    expect(STRIP_FOUNDATION_INPUTS.filter((parameter) => parameter.visibilityRole === "INTERNAL_ONLY")
      .every((parameter) => /паспорт|схем/iu.test(parameter.guideRu))).toBe(true);
  });

  test("pump and crane bucket branches are mutually exclusive", () => {
    const pumpRows = rowMap(compileStripFoundationEstimate(STRIP_FOUNDATION_GOLD_INPUT));
    const craneRows = rowMap(compileStripFoundationEstimate({
      ...STRIP_FOUNDATION_GOLD_INPUT,
      placement_method: "crane_bucket",
      crane_bucket_productivity_m3_h: 12,
    }));
    expect(pumpRows.has("concrete_pump")).toBe(true);
    expect(pumpRows.has("crane_bucket")).toBe(false);
    expect(craneRows.has("concrete_pump")).toBe(false);
    expect(craneRows.has("crane_bucket")).toBe(true);
  });

  test("winter mode adds only the approved winter material, work and machine branch", () => {
    const warm = compileStripFoundationEstimate(STRIP_FOUNDATION_GOLD_INPUT);
    const cold = compileStripFoundationEstimate({
      ...STRIP_FOUNDATION_GOLD_INPUT,
      winter_mode: true,
      winter_heating_cable_length_m: 480,
      heating_transformer_productivity_m3_h: 3,
    });
    const added = cold.filter((row) => !warm.some((candidate) => candidate.rowId === row.rowId));
    expect(added.map((row) => row.rowId).sort()).toEqual([
      "heating_transformer",
      "winter_heating_cable",
      "winter_heating_work",
    ]);
  });

  test("site-fabricated reinforcement adds only fabrication work and named machines", () => {
    const ready = compileStripFoundationEstimate(STRIP_FOUNDATION_GOLD_INPUT);
    const site = compileStripFoundationEstimate({
      ...STRIP_FOUNDATION_GOLD_INPUT,
      reinforcement_fabrication: "site_fabricated",
      rebar_cutting_productivity_t_h: 0.8,
      rebar_bending_productivity_t_h: 0.6,
    });
    const added = site.filter((row) => !ready.some((candidate) => candidate.rowId === row.rowId));
    expect(added.map((row) => row.rowId).sort()).toEqual([
      "rebar_bending_machine",
      "rebar_cutting_machine",
      "reinforcement_fabrication",
    ]);
  });

  test("placement-only scope cannot leak concrete purchase, reinforcement, formwork or delivery", () => {
    const rows = compileStripFoundationEstimate({ ...STRIP_FOUNDATION_GOLD_INPUT, scope_variant: "placement_only" });
    const forbidden = new Set([
      "main_concrete", "preparation_concrete", "reinforcement", "binding_wire", "formwork_system",
      "formwork_install", "reinforcement_install", "formwork_remove", "concrete_delivery",
      "reinforcement_delivery", "formwork_delivery",
    ]);
    expect(rows.some((row) => forbidden.has(row.rowId))).toBe(false);
    expect(rows.some((row) => row.rowId === "concrete_placement")).toBe(true);
  });

  test("delivery disappears when it is included in material prices", () => {
    const rows = compileStripFoundationEstimate({ ...STRIP_FOUNDATION_GOLD_INPUT, delivery_separately_priced: false });
    expect(rows.some((row) => row.category === "delivery")).toBe(false);
  });

  test("all first-wave sample definitions compile from geometry and contain named work and equipment", () => {
    for (const definition of CONCRETE_R6_DEFINITIONS) {
      const estimate = compileConcreteR6Estimate(definition, sampleConcreteR6Input(definition));
      expect(estimate.groups.construction_work.length).toBeGreaterThan(0);
      expect(estimate.groups.machine_equipment.length).toBeGreaterThan(0);
      expect(estimate.rows.every((row) =>
        ["material", "construction_work", "machine_equipment", "delivery"].includes(row.group),
      )).toBe(true);
      expect(estimate.rows.every((row) => row.quantity !== "30" || row.formulaId !== "constant")).toBe(true);
    }
  });
});

const geometryCases = Array.from({ length: 40 }, (_, index) => ({
  label: `geometry-${index + 1}`,
  length: 20 + index,
  width: 0.4 + (index % 4) * 0.1,
  height: 0.8 + (index % 5) * 0.15,
  allowance: index % 6,
}));

describe.each(geometryCases)("40 concrete formula scenarios: $label", ({ length, width, height, allowance }) => {
  test("recomputes net and ordered concrete from causal inputs", () => {
    const rows = rowMap(compileStripFoundationEstimate({
      ...STRIP_FOUNDATION_GOLD_INPUT,
      total_axis_length_m: length,
      strip_width_m: width,
      strip_height_m: height,
      concrete_order_allowance_percent: allowance,
    }));
    const net = length * width * height;
    expect(Number(rows.get("concrete_placement")?.evaluatedQuantity)).toBeCloseTo(net, 8);
    expect(Number(rows.get("main_concrete")?.evaluatedQuantity)).toBeCloseTo(net * (1 + allowance / 100), 8);
  });
});

const crossDomainQueries = [
  "асфальтирование парковки", "укладка ламината", "монтаж гипсокартона", "кирпичная подпорная стена",
  "штукатурка фасада", "кабельная линия", "установка розеток", "кровля из металлочерепицы",
  "водопровод из полиэтиленовой трубы", "канализация наружная", "монтаж воздуховода", "установка радиатора",
  "монтаж окон", "установка дверей", "укладка керамической плитки", "демонтаж бетона",
  "алмазная резка бетонной стены", "бурение отверстий в бетоне", "дробление бетона", "поклейка обоев",
];

describe.each(crossDomainQueries)("20 cross-domain exclusions", (query) => {
  test(`does not route «${query}» into a concrete construction passport`, () => {
    expect(findConcreteDefinitionR6(query)).toBeNull();
  });
});

const forbiddenPayloadFragments = [
  "worker_h", "man_hour", "чел.-ч", "контроль", "журнал", "акт ", "обмер", "детализация", "фотофиксация", "испытание",
  "инструктаж", "согласование", "сиз", "мониторинг", "реестр", "сертификат", "поставка состава", "работа механизма", "защищённое хранение", "приёмка результата",
];

describe.each(forbiddenPayloadFragments)("20 payload regressions", (fragment) => {
  test(`keeps «${fragment}» out of every compiled row`, () => {
    const serialized = JSON.stringify(compileStripFoundationEstimate(STRIP_FOUNDATION_GOLD_INPUT)).toLocaleLowerCase("ru-RU");
    expect(serialized).not.toContain(fragment);
  });
});

describe("fail-closed input behavior", () => {
  test("rejects a missing geometric input", () => {
    const { total_axis_length_m: _removed, ...input } = STRIP_FOUNDATION_GOLD_INPUT;
    expect(() => compileStripFoundationEstimate(input)).toThrow("STRIP_FOUNDATION_MISSING_INPUT:total_axis_length_m");
  });

  test("rejects a negative geometric input", () => {
    expect(() => compileStripFoundationEstimate({ ...STRIP_FOUNDATION_GOLD_INPUT, strip_width_m: -0.5 }))
      .toThrow("STRIP_FOUNDATION_NEGATIVE_INPUT:strip_width_m");
  });

  test("rejects an unknown technology choice", () => {
    expect(() => compileStripFoundationEstimate({ ...STRIP_FOUNDATION_GOLD_INPUT, placement_method: "all_methods" }))
      .toThrow("STRIP_FOUNDATION_INVALID_CHOICE:placement_method");
  });

  test("rejects missing selected-equipment productivity", () => {
    const { pump_productivity_m3_h: _removed, ...input } = STRIP_FOUNDATION_GOLD_INPUT;
    expect(() => compileStripFoundationEstimate(input)).toThrow("STRIP_FOUNDATION_MISSING_INPUT:pump_productivity_m3_h");
  });

  test("rejects division by zero instead of inventing machine hours", () => {
    expect(() => compileStripFoundationEstimate({ ...STRIP_FOUNDATION_GOLD_INPUT, pump_productivity_m3_h: 0 }))
      .toThrow("formula division by zero");
  });

  test("keeps search aliases out of BOQ rows", () => {
    const aliases = ["подбетонка", "lean concrete", "blinding", "mud slab"];
    const titles = STRIP_FOUNDATION_ROWS.map((row) => row.canonicalRuName.toLocaleLowerCase("ru-RU"));
    expect(aliases.some((alias) => titles.some((title) => title.includes(alias)))).toBe(false);
  });
});
