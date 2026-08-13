import { DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3 as BATCH001_DRYWALL_BULKHEAD_CATALOG_IDS_V3 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadProfessionalV3";
import { allBatch001ContractParts } from "./batch001R2ContractSupport";

describe("BATCH001 R2 exact member admission", () => {
  test("keeps catalog ID, work key and title as one immutable identity tuple", () => {
    const contracts = allBatch001ContractParts().map((item) => item.contract);
    expect(contracts.map((item) => item.catalog_id)).toEqual(BATCH001_DRYWALL_BULKHEAD_CATALOG_IDS_V3);
    expect(contracts.every((item) => item.work_key.length > 0 && item.title_ru.length > 0)).toBe(true);
    expect(new Set(contracts.map((item) => `${item.catalog_id}|${item.work_key}`)).size).toBe(16);
  });
});
