import { PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG } from "./professionalEstimateTestHelpers";

describe("professional estimate labor equipment delivery rows", () => {
  it("includes labor, equipment, delivery, and overhead rows for every supported work", () => {
    for (const template of PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG) {
      expect(template.labor_rows.length).toBeGreaterThan(0);
      expect(template.equipment_rows.length).toBeGreaterThan(0);
      expect(template.delivery_rows.length).toBeGreaterThan(0);
      expect(template.overhead_rows.length).toBeGreaterThan(0);
    }
  });
});
