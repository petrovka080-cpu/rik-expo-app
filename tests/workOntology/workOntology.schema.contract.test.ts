import { CONSTRUCTION_WORK_ONTOLOGY, WORK_ONTOLOGY_TARGET_CATEGORY_COUNTS } from "./workOntologyTestHelpers";

describe("work ontology schema", () => {
  it("has exactly 1000 supported non-generic canonical work entries across required categories", () => {
    const keys = new Set(CONSTRUCTION_WORK_ONTOLOGY.map((entry) => entry.canonical_work_key));
    expect(CONSTRUCTION_WORK_ONTOLOGY).toHaveLength(1000);
    expect(keys.size).toBe(1000);
    expect([...keys].sort()).not.toContain("other_construction_work");
    expect([...keys].sort()).not.toContain("generic_repair");

    const categories = new Set(CONSTRUCTION_WORK_ONTOLOGY.map((entry) => entry.category));
    expect([...categories].sort()).toEqual(Object.keys(WORK_ONTOLOGY_TARGET_CATEGORY_COUNTS).sort());
    for (const entry of CONSTRUCTION_WORK_ONTOLOGY) {
      expect(entry.support_status).toBe("SUPPORTED");
      expect(entry.supported).toBe(true);
      expect(entry.visible_name_ru.trim()).toBeTruthy();
      expect(entry.default_unit).toBeTruthy();
      expect(entry.expected_units).toContain(entry.default_unit);
      expect(entry.recipe_scope).toBeTruthy();
      expect(entry.material_recipe_scope).toBeTruthy();
      expect(entry.pricebook_scope).toBeTruthy();
    }
  });
});
