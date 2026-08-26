import { evaluateFormulaGraph } from "../../src/lib/estimate/backendPlatform/formulaGraph";
import {
  R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS,
  compileR41SurfaceDefinitionRows,
  r41SurfaceContentSha256,
} from "../../scripts/estimate/r4/r41OfficialAndroidSurfaceDefinitions";

const INPUTS: Record<string, Record<string, string>> = {
  r41_surface_electrical_turnkey_explicit: {
    area_m2: "100",
    route_length_m: "500",
    outlet_count: "10",
    switch_count: "10",
    lighting_point_count: "10",
  },
  r41_surface_house_electrical_area: { area_m2: "180" },
  r41_surface_roof_waterproofing: { area_m2: "100" },
  r41_surface_paving_stone_laying: { area_m2: "587" },
};

describe("R4.1 official Android surface canonical definitions", () => {
  test("фиксирует четыре реальные backend-работы без второго compiler", () => {
    expect(R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS).toHaveLength(4);
    expect(new Set(R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS.map((item) => item.catalogId)).size).toBe(4);
    expect(r41SurfaceContentSha256()).toMatch(/^[0-9a-f]{64}$/u);
  });

  test.each(R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS)(
    "$catalogId имеет конкретный состав, исполнимые формулы и явные цены-источники",
    (definition) => {
      const rows = compileR41SurfaceDefinitionRows(definition);
      expect(rows.length).toBeGreaterThanOrEqual(18);
      expect(new Set(rows.map((item) => item.rowId)).size).toBe(rows.length);
      expect(rows.some((item) => item.rowType === "material")).toBe(true);
      expect(rows.some((item) => item.rowType === "labor")).toBe(true);
      expect(rows.some((item) => item.section === "Логистика")).toBe(true);
      expect(rows.some((item) => item.section === "Контроль качества")).toBe(true);
      expect(Object.fromEntries(definition.parameters.map((parameter) => [
        parameter.parameterId,
        String(parameter.baselineValue),
      ]))).toEqual(INPUTS[definition.catalogId]);
      for (const parameter of definition.parameters) {
        expect(parameter.baselineValue).toBeGreaterThanOrEqual(parameter.constraints.min);
        expect(parameter.baselineValue).toBeLessThanOrEqual(parameter.constraints.max);
      }
      for (const item of rows) {
        expect(item.titleRu).not.toMatch(/placeholder|generic|материалы и комплектующие для|комплект без состава/iu);
        expect(item.referenceUnitPriceKgs).toBeGreaterThan(0);
        expect(item.astSha256).toMatch(/^[0-9a-f]{64}$/u);
        expect(item.rowSha256).toMatch(/^[0-9a-f]{64}$/u);
        expect(Number(evaluateFormulaGraph(item.ast, INPUTS[definition.catalogId]))).toBeGreaterThan(0);
      }
    },
  );

  test("четыре fixed prompt получают требуемые предметные строки", () => {
    const byCatalog = new Map(R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS.map((definition) => [
      definition.catalogId,
      definition.rows.map((item) => item.titleRu.toLocaleLowerCase("ru-RU")).join(" "),
    ]));
    expect(byCatalog.get("r41_surface_electrical_turnkey_explicit")).toMatch(/кабел.*розет/u);
    expect(byCatalog.get("r41_surface_house_electrical_area")).toMatch(/кабел.*щит/u);
    expect(byCatalog.get("r41_surface_roof_waterproofing")).toMatch(/кровл.*гидроизоля/u);
    expect(byCatalog.get("r41_surface_paving_stone_laying")).toMatch(/брусчат/u);
  });
});
