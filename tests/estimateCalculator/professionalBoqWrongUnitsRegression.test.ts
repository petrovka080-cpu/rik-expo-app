import {
  compileProductionExpandedEstimate10000,
  type ProductionCompiledExpandedRow,
} from "../../src/lib/ai/estimateTemplate10000";
import { validateProfessionalBoqUnitRows } from "../../src/lib/estimate/validateBoqUnits";

type Case = {
  workKey: string;
  workFamily: string;
  expectedUnits: Record<string, string>;
};

const CASES: Case[] = [
  {
    workKey: "facade_interior_wet_facade_install_standard",
    workFamily: "facade",
    expectedUnits: {
      facade_interior_wet_facade_install_standard_materials_03: "kg",
      facade_interior_wet_facade_install_standard_materials_06: "l",
    },
  },
  {
    workKey: "plaster_paint_interior_wall_putty_apply_standard",
    workFamily: "plaster_paint",
    expectedUnits: {
      plaster_paint_interior_wall_putty_apply_standard_materials_01: "kg",
      plaster_paint_interior_wall_putty_apply_standard_materials_02: "l",
    },
  },
  {
    workKey: "flooring_interior_laminate_lay_standard",
    workFamily: "flooring",
    expectedUnits: {
      flooring_interior_laminate_lay_standard_materials_03: "l",
      flooring_interior_laminate_lay_standard_materials_05: "kg",
      flooring_interior_laminate_lay_standard_labor_23: "linear_m",
    },
  },
];

function rowByCode(rows: readonly ProductionCompiledExpandedRow[], rowCode: string): ProductionCompiledExpandedRow {
  const row = rows.find((candidate) => candidate.rowCode === rowCode);
  if (!row) throw new Error(`ROW_MISSING:${rowCode}`);
  return row;
}

describe("professional BOQ wrong-unit regression", () => {
  it("compiles targeted base catalog materials and baseboard labor with professional units", () => {
    for (const testCase of CASES) {
      const compiled = compileProductionExpandedEstimate10000({
        workKey: testCase.workKey,
        quantity: 54,
        countryCode: "KG",
      });

      for (const [rowCode, expectedUnit] of Object.entries(testCase.expectedUnits)) {
        expect(rowByCode(compiled.rows, rowCode).unit).toBe(expectedUnit);
      }

      const validation = validateProfessionalBoqUnitRows(compiled.rows.map((row) => ({
        rowId: row.rowCode,
        unit: row.unit,
        rowCode: row.rowCode,
        rowLabel: row.titleRu,
        rowKind: row.lineType,
        workFamily: testCase.workFamily,
        normId: row.normId,
        normPackId: row.normFamilyId,
        normSourceId: row.normSourceId,
      })));

      expect(validation.wrong_unit_rows_count).toBe(0);
      expect(validation.unknown_unit_rows_count).toBe(0);
      expect(validation.material_rows_forced_to_m2_count).toBe(0);
      expect(validation.blocking_reasons).toEqual([]);
    }
  });
});
