import { blockedGateFor, expectBlockedWith } from "./estimateQualityGateTestHelpers";

describe("KG/KZ USD quality guard", () => {
  it("blocks USD final total in KG and KZ estimates", () => {
    expectBlockedWith(blockedGateFor("kg_usd_total"), "USD_FOR_KG_OR_KZ");
    expectBlockedWith(blockedGateFor("kz_usd_total"), "USD_FOR_KG_OR_KZ");
  });
});
