import { createReadyScanFixture } from "./photoMaterialExistingRowTestHelpers";

describe("photo material confirmation boundary", () => {
  it("does not create a revision before user confirmation", () => {
    const fixture = createReadyScanFixture();

    expect(fixture.recognition.status).toBe("NEEDS_CONFIRMATION");
    expect(fixture.record.revision_state.revisions).toHaveLength(1);
    expect(fixture.recognition.automatic_price_application).toBe(0);
    expect(fixture.recognition.automatic_catalog_mutations).toBe(0);
  });
});
