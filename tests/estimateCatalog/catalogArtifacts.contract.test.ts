import { readFileSync } from "node:fs";
import path from "node:path";
import type { WorkFamilyCoveragePlan } from "../../scripts/estimate/buildWorkFamilyCoveragePlan";

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(process.cwd(), relativePath), "utf8")) as T;
}

describe("professional catalog artifacts", () => {
  it("persists work, material, service, equipment, unit, norm, and price policy artifacts", () => {
    const plan = readJson<WorkFamilyCoveragePlan>("data/estimate-templates/work-family-coverage-plan.json");
    const workCatalog = readJson<{ work_catalog_items_count: number; items: unknown[] }>(
      "data/estimate-catalog/work-items/work-catalog-10000.json",
    );
    const materialCatalog = readJson<{ material_catalog_rows_count: number; buyer_material_handoff_rows_count: number }>(
      "data/estimate-catalog/material-items/material-catalog-summary.json",
    );
    const serviceCatalog = readJson<{ service_catalog_rows_count: number }>(
      "data/estimate-catalog/service-items/service-catalog-summary.json",
    );
    const equipmentCatalog = readJson<{ equipment_catalog_rows_count: number }>(
      "data/estimate-catalog/equipment-items/equipment-catalog-summary.json",
    );
    const unitPolicies = readJson<{ unit_policy_count: number }>("data/estimate-catalog/unit-policies/unit-policies.json");
    const normPacks = readJson<{ norm_pack_count: number }>(
      "data/estimate-catalog/professional-norm-packs/professional-norm-packs.json",
    );
    const pricePolicy = readJson<{ policy: string; price_policy_missing_price_state_count: number }>(
      "data/estimate-catalog/price-ratebooks/missing-price-policy.json",
    );

    expect(plan.blockers).toEqual([]);
    expect(workCatalog.work_catalog_items_count).toBe(10000);
    expect(workCatalog.items).toHaveLength(10000);
    expect(materialCatalog.material_catalog_rows_count).toBe(plan.material_catalog_rows_count);
    expect(materialCatalog.buyer_material_handoff_rows_count).toBeGreaterThan(0);
    expect(serviceCatalog.service_catalog_rows_count).toBe(plan.service_catalog_rows_count);
    expect(equipmentCatalog.equipment_catalog_rows_count).toBe(plan.equipment_catalog_rows_count);
    expect(unitPolicies.unit_policy_count).toBeGreaterThan(0);
    expect(normPacks.norm_pack_count).toBe(plan.norm_pack_count);
    expect(pricePolicy.policy).toBe("MISSING_PRICE_STATE_UNTIL_VERIFIED_RATEBOOK_BOUND");
    expect(pricePolicy.price_policy_missing_price_state_count).toBe(plan.price_policy_missing_price_state_count);
  });
});
