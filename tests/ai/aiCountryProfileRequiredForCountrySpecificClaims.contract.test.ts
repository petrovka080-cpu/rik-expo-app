import {
  resolveConstructionCountryProfile,
  resolveConstructionNorms,
} from "../../src/lib/ai/constructionKnowledgeCore";
import { constructionSources } from "./aiConstructionKnowledgeCore.fixtures";

describe("AI country profile source requirement", () => {
  it("requires country profile before country-specific construction claims", () => {
    const withoutProfile = constructionSources.filter((source) => source.type !== "country_profile");
    expect(resolveConstructionCountryProfile({ countryCode: "KG", sources: withoutProfile }).blockedReason)
      .toBe("BLOCKED_COUNTRY_PROFILE_NOT_CONFIGURED");
    expect(resolveConstructionNorms({ countryCode: "KG", sources: withoutProfile }).allowedToMakeCountrySpecificClaim)
      .toBe(false);

    expect(resolveConstructionCountryProfile({ countryCode: "KG", sources: constructionSources }).profile?.sourceRef)
      .toBe("source:country:kg");
    expect(resolveConstructionNorms({ countryCode: "KG", sources: constructionSources }).allowedToMakeCountrySpecificClaim)
      .toBe(true);
  });
});
