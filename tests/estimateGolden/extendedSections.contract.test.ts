import { extended100CertificationSummary } from "./extended100TestHelpers";

describe("extended professional estimate sections", () => {
  it("keeps material, labor, equipment, service, logistics, waste and trace sections present", () => {
    const summary = extended100CertificationSummary();

    expect(summary.extended_estimate_sections_exist).toBe(true);
    expect(summary.materials_labor_equipment_services_covered).toBe(true);
    expect(summary.logistics_and_waste_covered).toBe(true);
    expect(summary.materials_and_works_separated).toBe(true);
    expect(summary.labor_rows_separated).toBe(true);
    expect(summary.equipment_rows_separated).toBe(true);
    expect(summary.service_rows_separated).toBe(true);
  });
});
