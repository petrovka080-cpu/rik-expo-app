import { DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { postAuditWorks } from "./batch001PostAuditR2TestSupport";
test("post-audit остается exact-bound к 16 работам", () => {
  expect(postAuditWorks().map(({ result }) => result.inventory.catalog_id)).toEqual(DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3);
});
