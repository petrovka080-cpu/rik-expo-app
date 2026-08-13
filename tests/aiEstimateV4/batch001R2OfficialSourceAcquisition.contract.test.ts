import { constructionNormativeRegistryV1 } from "../../src/lib/estimate/v4/domainFactory";

describe("BATCH001 R2 official source acquisition", () => {
  test("registers the official active KG edition and exact KRER table route", () => {
    const sp = constructionNormativeRegistryV1.get("KG_SP_KR_65_101_2025");
    const krer = constructionNormativeRegistryV1.get("KG_KRER_10_05_011");
    expect(sp).toMatchObject({ jurisdiction: "KG", status: "active", document_code: "СП КР 65-101:2025" });
    expect(krer).toMatchObject({ jurisdiction: "KG", status: "active", document_code: "КРЕР 10-05-011" });
    expect(sp?.official_reference).toMatch(/^https:\/\/minstroy\.gov\.kg\//u);
    expect(krer?.official_reference).toMatch(/^https:\/\/minstroy\.gov\.kg\//u);
    expect(sp?.content_digest).toMatch(/^eh_[0-9a-f]{16}$/u);
    expect(krer?.clause_table_rate_code).toContain("Е10-05-011-02");
  });
});
