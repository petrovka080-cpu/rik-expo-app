import { readFileSync } from "node:fs";
import path from "node:path";

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(process.cwd(), relativePath), "utf8")) as T;
}

describe("material service equipment catalog summaries", () => {
  it("publishes material, service, equipment, and buyer handoff catalog counts", () => {
    const materials = readJson<{ material_catalog_rows_count: number; buyer_material_handoff_rows_count: number }>(
      "data/estimate-catalog/material-items/material-catalog-summary.json",
    );
    const services = readJson<{ service_catalog_rows_count: number }>(
      "data/estimate-catalog/service-items/service-catalog-summary.json",
    );
    const equipment = readJson<{ equipment_catalog_rows_count: number }>(
      "data/estimate-catalog/equipment-items/equipment-catalog-summary.json",
    );

    expect(materials.material_catalog_rows_count).toBe(130000);
    expect(materials.buyer_material_handoff_rows_count).toBe(130000);
    expect(services.service_catalog_rows_count).toBe(60000);
    expect(equipment.equipment_catalog_rows_count).toBe(30000);
  });
});
