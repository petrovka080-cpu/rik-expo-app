import { parseRoadGeometryV4 } from "../../src/lib/estimate/v4/asphalt";

const fixtures = [
  ...Array.from({ length: 10 }, (_, index) => ({
    id: `conversion-${index + 1}`, text: index % 3 === 0 ? "1000 м × 32 м" : index % 3 === 1 ? "1 км × 32 м" : "1,5 км × 7,5 м",
    status: "RESOLVED", area: index % 3 === 2 ? 11250 : 32000,
  })),
  ...Array.from({ length: 10 }, (_, index) => ({
    id: `missing-${index + 1}`, text: index % 2 === 0 ? `длина ${100 + index} м` : `ширина ${5 + index} м`,
    status: "INCOMPLETE", area: null,
  })),
  ...Array.from({ length: 10 }, (_, index) => ({
    id: `conflict-${index + 1}`, text: `100 м × 10 м, площадь ${2000 + index} м²`,
    status: "NEEDS_GEOMETRY_CONFIRMATION", area: 2000 + index,
  })),
  ...Array.from({ length: 10 }, (_, index) => ({
    id: `invalid-${index + 1}`, text: index % 2 === 0 ? "0 м × 32 м" : "-1 км × 32 м",
    status: "INVALID", area: index % 2 === 0 ? 0 : -32000,
  })),
] as const;

describe("Road geometry V4 40-case contract", () => {
  test("has 40 independently identified cases", () => {
    expect(fixtures).toHaveLength(40);
    expect(new Set(fixtures.map((item) => item.id)).size).toBe(40);
  });
  test.each(fixtures)("$id", ({ text, status, area }) => {
    expect(parseRoadGeometryV4(text)).toMatchObject({ status, areaM2: area });
  });
  test("normalizes standalone thickness without treating it as width", () => {
    expect(parseRoadGeometryV4("площадь 32000 м², толщина 5 см")).toMatchObject({
      status: "RESOLVED", areaM2: 32000, widthM: null, thicknessMm: 50,
    });
    expect(parseRoadGeometryV4("площадь 32000 м², толщина 50 мм")).toMatchObject({ thicknessMm: 50 });
  });
  test("does not treat price or lane count as geometry", () => {
    expect(parseRoadGeometryV4("цена 5000 сом, 4 полосы")).toMatchObject({
      status: "INCOMPLETE", lengthM: null, widthM: null, areaM2: null,
    });
  });
});
