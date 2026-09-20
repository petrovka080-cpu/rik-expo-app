import {
  buildMultiDomainReferenceSelectedWorkBinding,
  consumerRepairCanonicalWorkSearchQuery,
} from
  "../../src/features/consumerRepair/requestEstimateScreenActions";

describe("explicit atomic strip-foundation search routing", () => {
  test("does not widen a named formwork operation to the whole foundation", () => {
    expect(buildMultiDomainReferenceSelectedWorkBinding(
      "устройство опалубки ленточного фундамента во влажной зоне",
    )).toBeNull();
  });

  test("does not widen a named concrete-placement operation to the whole foundation", () => {
    const prompt = "Бетонирование ленточного фундамента, объём бетона 24 м³, бетон B25 W6 F150 П4, подача бетононасосом";

    expect(buildMultiDomainReferenceSelectedWorkBinding(prompt)).toBeNull();
    expect(consumerRepairCanonicalWorkSearchQuery(prompt)).toContain("Бетонирование ленточного фундамента");
    expect(consumerRepairCanonicalWorkSearchQuery(prompt)).not.toBe(
      "Устройство монолитного железобетонного ленточного фундамента",
    );
  });
});
