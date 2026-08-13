import {
  DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
  buildDrywallFlatCeilingProfessionalPackagePartsV6,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { allTechnologyWaveR2Parts } from "./technologyWaveR2TestSupport";

const REQUIRED = ["material", "labor", "equipment", "transport", "waste", "testing", "documentation"];

describe("technology-domain wave R2 trace and completeness", () => {
  test("has total dimensional FormulaGraphV6 traces and one price owner per row", () => {
    for (const parts of allTechnologyWaveR2Parts()) {
      const parameters = new Set(parts.schema.parameters.map((parameter) => parameter.parameter_id));
      const rows = parts.child_assemblies.flatMap((child) => child.rows);
      expect(new Set(rows.map((row) => row.row_id)).size).toBe(rows.length);
      expect(new Set(rows.map((row) => row.cost_owner_id)).size).toBe(rows.length);
      for (const row of rows) {
        expect(row.formula.input_parameter_ids.every((id) => parameters.has(id))).toBe(true);
        expect(row.formula.output_unit_id).toBeTruthy();
        expect(row.normative_trace_v3).toHaveLength(4);
        expect(row.price_route_v3).toBeDefined();
        expect(row.cost_owner_id).toContain(parts.contract.catalog_id);
        expect(`${row.row_id} ${row.title_ru}`).not.toMatch(/padding|placeholder|прочие материалы|комплект оборудования/iu);
      }
      const categories = new Set(rows.map((row) => row.category));
      for (const category of REQUIRED) expect(categories.has(category as never)).toBe(true);
      expect(parts.schema.parameters.every((parameter) => parameter.formula_consumers.length > 0)).toBe(true);
    }
  });

  test("does not capture an identity outside the exact 36-member allowlist", () => {
    const selected = new Set(DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6);
    expect(INTERIOR_FINISHES_DOMAIN_INVENTORY.filter((row) => !selected.has(row.catalog_id))
      .every((row) => buildDrywallFlatCeilingProfessionalPackagePartsV6(row) === null)).toBe(true);
  });
});
