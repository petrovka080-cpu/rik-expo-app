import { buildMultiDomainReferenceSelectedWorkBinding } from
  "../../src/features/consumerRepair/requestEstimateScreenActions";

describe("explicit strip-foundation formwork search routing", () => {
  test("does not widen a named formwork operation to the whole foundation", () => {
    expect(buildMultiDomainReferenceSelectedWorkBinding(
      "устройство опалубки ленточного фундамента во влажной зоне",
    )).toBeNull();
  });
});
