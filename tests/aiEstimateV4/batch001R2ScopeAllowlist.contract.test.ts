import { buildDrywallCeilingBulkheadProfessionalPackagePartsV3 as buildBatch001DrywallBulkheadExactPackagePartsV3 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadProfessionalV3";
import { INTERIOR_FINISHES_DOMAIN_INVENTORY } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/inventory";
import { allBatch001ContractParts } from "./batch001R2ContractSupport";

describe("BATCH001 R2 exact scope allowlist", () => {
  test("admits the exact sixteen and rejects every other interior record", () => {
    expect(allBatch001ContractParts()).toHaveLength(16);
    const outsider = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((item) => item.catalog_id === "drywall_ceiling_interior_bulkhead_clad_repair") ??
      INTERIOR_FINISHES_DOMAIN_INVENTORY.find((item) => !item.catalog_id.includes("drywall_ceiling_interior_bulkhead_"));
    expect(outsider).toBeDefined();
    expect(buildBatch001DrywallBulkheadExactPackagePartsV3(outsider!)).toBeNull();
  });
});
