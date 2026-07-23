import { deterministicNormalizedSourceHash, mayUseEstimateSourceInProduct, PROFESSIONAL_WORK_READINESS_STATES } from "../../src/lib/estimate/v4/professionalOntologyContracts";
import sources from "../../data/estimate-ontology/source-acquisition-ledger.json";

describe("professional ontology source foundation", () => {
  test("separates technical placeholders from professional readiness", () => {
    expect(PROFESSIONAL_WORK_READINESS_STATES).toContain("LEGACY_TECHNICAL_TEMPLATE");
    expect(PROFESSIONAL_WORK_READINESS_STATES).toContain("PRODUCT_PROVEN");
    expect(PROFESSIONAL_WORK_READINESS_STATES.indexOf("PRODUCT_PROVEN"))
      .toBeGreaterThan(PROFESSIONAL_WORK_READINESS_STATES.indexOf("PROFESSIONAL_WORK_DEFINED"));
  });
  test("blocks pending or restricted sources from product use", () => {
    expect(mayUseEstimateSourceInProduct({licenseMode:"LICENSE_REVIEW_REQUIRED",storagePolicy:"METADATA_ONLY",verificationStatus:"IDENTIFIED"})).toBe(false);
    expect(mayUseEstimateSourceInProduct({licenseMode:"OPEN_GOVERNMENT_USE_CONFIRMED",storagePolicy:"PUBLIC_SOURCE_METADATA",verificationStatus:"VERIFIED"})).toBe(true);
  });
  test("normalization hash is deterministic and order-sensitive", () => {
    expect(deterministicNormalizedSourceHash([{id:1},{id:2}])).toBe(deterministicNormalizedSourceHash([{id:1},{id:2}]));
    expect(deterministicNormalizedSourceHash([{id:1},{id:2}])).not.toBe(deterministicNormalizedSourceHash([{id:2},{id:1}]));
  });
  test("uses only public sources without payment, registration or owner contact", () => {
    expect(sources).toMatchObject({
      closedSources: 0,
      paidSources: 0,
      registrationRequiredSources: 0,
      ownerRequestRequiredSources: 0,
      fake_green_claimed: false,
    });
    expect(sources.entries.every((entry) => /^https:\/\//.test(entry.url))).toBe(true);
  });
});
