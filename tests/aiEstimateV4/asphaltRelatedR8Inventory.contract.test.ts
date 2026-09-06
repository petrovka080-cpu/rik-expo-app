import { buildAsphaltRelatedR8Inventory } from "../../scripts/estimate/buildAsphaltRelatedR8Inventory";

describe("Asphalt-related global domain R8/R9 deterministic inventory", () => {
  test("seals N/R/M/A/E with exact typed identities and no ownership gaps", () => {
    const inventory = buildAsphaltRelatedR8Inventory();
    expect(inventory.selection_method).toBe("EXACT_TYPED_IDENTIFIERS_NO_REGEX");
    expect(inventory.summary).toMatchObject({
      previous_records: 35,
      inventory_candidates_N: 66,
      asphalt_related_R: 63,
      unique_technologies_M: 44,
      aliases_A: 19,
      exclusions_E: 3,
      blocked: 0,
      orphan: 0,
      ambiguous: 0,
      duplicate_candidate_id: 0,
      unclassified: 0,
      old_35_bound: 35,
    });
    expect(inventory.invariants).toEqual({
      "N=R+E": true,
      "R=M+A": true,
      "blocked=orphan=ambiguous=duplicate=unclassified=0": true,
      "old35=35/35": true,
    });
  });

  test("names every additional record, technology, alias and exclusion", () => {
    const inventory = buildAsphaltRelatedR8Inventory();
    const related = inventory.records.filter((entry) => entry.canonical_technology_id !== null);
    const additional = related.filter((entry) => !entry.previous_35);
    const aliases = related.filter((entry) => entry.classification === "ALIAS");
    const exclusions = inventory.records.filter((entry) => entry.exclusion_type !== null);
    expect(additional).toHaveLength(28);
    expect(inventory.technologies).toHaveLength(44);
    expect(aliases).toHaveLength(19);
    expect(exclusions.map((entry) => entry.work_key).sort()).toEqual([
      "asphalt_paver_service",
      "asphalt_supplier_search",
      "rental_equipment_search",
    ]);
    expect(inventory.records.every((entry) => entry.catalog_id && entry.work_key && entry.name_ru)).toBe(true);
    expect(related.every((entry) => entry.passport_id && entry.parameter_schema_id && entry.formula_graph_id)).toBe(true);
  });

  test("records all mandated source scans without emitting duplicate candidates", () => {
    const inventory = buildAsphaltRelatedR8Inventory();
    expect(inventory.source_scans.map((entry) => entry.source_id)).toEqual(expect.arrayContaining([
      "base_work_catalog_10000",
      "readiness_manifest_10000",
      "expanded_templates_1610",
      "expanded_work_families",
      "expanded_readiness",
      "built_in_ai_1000",
      "built_in_ai_10000",
      "global_150",
      "aliases",
      "roadworks_wave_a",
      "ui_catalog_work_keys",
      "runtime_bindings",
      "revision_compatibility",
      "pdf_procurement_mappings",
    ]));
    expect(inventory.source_scans.reduce((sum, entry) => sum + entry.new_inventory_candidates, 0)).toBe(66);
  });
});
