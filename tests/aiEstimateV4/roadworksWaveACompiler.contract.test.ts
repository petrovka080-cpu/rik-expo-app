import {
  DEFAULT_ROADWORKS_WAVE_A_INPUTS,
  RoadworksWaveAInventory,
  compileRoadworksWaveAWork,
  getRoadworksWaveAOperation,
  getRoadworksWaveAParameterKeys,
  resolveRoadworksWaveAWork,
  roadworksWaveANaturalLanguageCases,
} from "../../src/lib/estimate/v4/roadworks";

const CASES = [
  { ...DEFAULT_ROADWORKS_WAVE_A_INPUTS, area_m2: 10, thickness_mm: 40, productivity_m2_h: 40 },
  { ...DEFAULT_ROADWORKS_WAVE_A_INPUTS, area_m2: 100 },
  { ...DEFAULT_ROADWORKS_WAVE_A_INPUTS, area_m2: 10_000, thickness_mm: 70 },
  { ...DEFAULT_ROADWORKS_WAVE_A_INPUTS, area_m2: 350, thickness_mm: 90, haul_distance_km: 75, productivity_m2_h: 35 },
] as const;

describe("Roadworks Wave A work-specific compilation", () => {
  test("compiles all 35 work IDs in four acceptance cases (140/140)", () => {
    let compiled = 0;
    for (const item of RoadworksWaveAInventory) {
      for (const input of CASES) {
        const result = compileRoadworksWaveAWork(item.workId, input);
        expect(result.workId).toBe(item.workId);
        expect(result.rows.length).toBeGreaterThan(0);
        expect(new Set(result.rows.map((row) => row.rowId)).size).toBe(result.rows.length);
        expect(result.rows.every((row) => Number.isFinite(row.quantity) && row.quantity > 0)).toBe(true);
        expect(result.rows.every((row) => row.rowId.startsWith(`${item.workId}:`))).toBe(true);
        expect(result.rows.every((row) => row.formulaId && row.sourceIds.length > 0)).toBe(true);
        compiled += 1;
      }
    }
    expect(compiled).toBe(140);
  });

  test("resolves three natural-language requests per ID without template identifiers (105/105)", () => {
    let resolved = 0;
    for (const item of RoadworksWaveAInventory) {
      const prompts = roadworksWaveANaturalLanguageCases(item);
      expect(prompts).toHaveLength(3);
      for (const prompt of prompts) {
        expect(prompt).not.toContain(item.templateId);
        expect(resolveRoadworksWaveAWork(prompt)).toBe(item.workId);
        resolved += 1;
      }
    }
    expect(resolved).toBe(105);
  });

  test("keeps technologically different operations out of the full-road asphalt compiler", () => {
    for (const item of RoadworksWaveAInventory) {
      const operation = getRoadworksWaveAOperation(item.workId);
      const rows = compileRoadworksWaveAWork(item.workId, DEFAULT_ROADWORKS_WAVE_A_INPUTS).rows;
      expect(item.workId).not.toBe("asphalt_concrete_pavement");
      if (operation === "compact") {
        expect(rows.some((row) => row.rowId.endsWith(":mix"))).toBe(false);
        expect(rows.some((row) => row.rowId.endsWith(":roller"))).toBe(true);
      }
      if (operation === "prepare" || operation === "drain") {
        expect(rows.some((row) => row.category === "material")).toBe(false);
      }
      if (operation === "repair") {
        expect(rows.some((row) => row.rowId.endsWith(":removal"))).toBe(true);
        expect(rows.some((row) => row.rowId.endsWith(":waste_haul"))).toBe(true);
      }
    }
  });

  test("has no dead declared parameter and isolates sensitivity to linked rows", () => {
    for (const item of RoadworksWaveAInventory) {
      const base = compileRoadworksWaveAWork(item.workId, DEFAULT_ROADWORKS_WAVE_A_INPUTS).rows;
      for (const parameter of getRoadworksWaveAParameterKeys(item.workId)) {
        const changedInput = {
          ...DEFAULT_ROADWORKS_WAVE_A_INPUTS,
          [parameter]: DEFAULT_ROADWORKS_WAVE_A_INPUTS[parameter as keyof typeof DEFAULT_ROADWORKS_WAVE_A_INPUTS] * 1.25,
        };
        const changed = compileRoadworksWaveAWork(item.workId, changedInput).rows;
        const changedIds = base
          .filter((row, index) => row.quantity !== changed[index]?.quantity)
          .map((row) => row.rowId);
        expect(changedIds.length).toBeGreaterThan(0);
        for (const rowId of changedIds) {
          expect(base.find((row) => row.rowId === rowId)?.affectedBy).toContain(parameter);
        }
      }
    }
  });
});
