import { readFileSync } from "node:fs";
import path from "node:path";

import type { Estimate10000ProfessionalInventory } from "../../scripts/estimate/buildEstimate10000ProfessionalInventory";
import { getTruthAuditInventory } from "./estimateTruthAuditTestHelpers";

describe("professional inventory 10000 truth audit", () => {
  it("classifies every template with real professional readiness fields", () => {
    const inventory = getTruthAuditInventory();

    expect(inventory.schema).toBe("estimate-10000-professional-inventory-v1");
    expect(inventory.manifest_total_templates).toBe(10000);
    expect(inventory.ready_professional_count).toBe(0);
    expect(inventory.not_ready_count).toBe(10000);
    expect(inventory.generic_fallback_count).toBe(0);
    expect(inventory.synthetic_family_default_count).toBe(0);
    expect(inventory.templates_only_generic_norms_count).toBe(10000);
    expect(inventory.templates_with_real_norm_sources_count).toBe(0);
    expect(inventory.fake_green_claimed).toBe(false);
    expect(inventory.full_10000_green_claimed).toBe(false);
    expect(inventory.product_green_revoked).toBe(true);
    expect(inventory.blockers).toHaveLength(10000);
  });

  it("keeps the persisted inventory aligned with the current fail-closed classification", () => {
    const persisted = JSON.parse(readFileSync(
      path.join(process.cwd(), "data/estimate-catalog/estimate-10000-professional-inventory.json"),
      "utf8",
    )) as Estimate10000ProfessionalInventory;

    expect(persisted).toMatchObject({
      manifest_total_templates: 10000,
      ready_professional_count: 0,
      not_ready_count: 10000,
      templates_only_generic_norms_count: 10000,
      templates_with_real_norm_sources_count: 0,
      full_10000_green_claimed: false,
      fake_green_claimed: false,
    });
    expect(persisted.templates).toHaveLength(10000);
    expect(persisted.templates.every((template) =>
      template.readiness_status === "NOT_READY_MISSING_NORM_SOURCE" &&
      template.norm_source_type === "unverified_source" &&
      template.source_backed_row_count === 0 &&
      template.unverified_norm_row_count === template.row_count
    )).toBe(true);
  });
});
