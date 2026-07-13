import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function json<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8")) as T;
}

describe("controlled pilot critical scenarios", () => {
  it("contains at least 50 stratified pilot scenarios", () => {
    const file = json<any>("data/estimate-pilot/pilot-web-emulator-critical-scenarios.json");
    const categories = new Set(file.scenarios.map((scenario: any) => scenario.category));

    expect(file.acceptance.pilot_critical_scenarios_created).toBe(true);
    expect(file.scenarios).toHaveLength(50);
    expect(file.scenarios.length).toBeGreaterThanOrEqual(file.minimum_required_count);
    expect(categories).toEqual(new Set(["CORE", "INFRASTRUCTURE", "COMPLEX", "ENERGY", "RANDOM_NPLUS"]));
    expect(file.scenarios.map((scenario: any) => scenario.prompt)).toEqual(expect.arrayContaining([
      "капитальный ремонт квартиры 98 м² потолок 3 м 2 санузла",
      "водоснабжение села 5 км труба ПЭ100 d110",
      "мост 30 м 2 полосы свайное основание",
      "ТЭЦ 100 МВт турбинный зал котельное отделение",
      "ленточный фундамент 60 м бетон арматура опалубка гидроизоляция",
    ]));
    for (const scenario of file.scenarios) {
      expect(scenario.case_id).toMatch(/^(CORE|INFRA|COMPLEX|ENERGY|RANDOM)-/);
      expect(scenario.expected_min_rows).toBeGreaterThanOrEqual(4);
    }
  });
});
