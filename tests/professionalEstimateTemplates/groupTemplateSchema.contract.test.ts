import {
  PROFESSIONAL_GROUP_DISTRIBUTION_1500,
  PROFESSIONAL_WORK_GROUP_TEMPLATE_CATALOG,
} from "./professionalEstimateTestHelpers";

describe("professional estimate group template schema", () => {
  it("defines all required group templates with snapshot fields and row kinds", () => {
    expect(PROFESSIONAL_WORK_GROUP_TEMPLATE_CATALOG).toHaveLength(21);
    expect(Object.values(PROFESSIONAL_GROUP_DISTRIBUTION_1500).reduce((sum, value) => sum + value, 0)).toBe(1500);
    for (const template of PROFESSIONAL_WORK_GROUP_TEMPLATE_CATALOG) {
      expect(template.group_key).toBeTruthy();
      expect(template.default_units.length).toBeGreaterThan(0);
      expect(template.common_parameter_schema.length).toBeGreaterThan(0);
      expect(template.common_row_kinds).toEqual(expect.arrayContaining(["material", "labor", "equipment", "delivery", "overhead"]));
      expect(template.required_snapshot_fields).toEqual(expect.arrayContaining([
        "snapshot_id",
        "selected_work_key",
        "ui_payload_hash",
        "pdf_payload_hash",
        "request_payload_hash",
        "history_payload_hash",
      ]));
    }
  });
});
