import { createReadyScanFixture } from "./photoMaterialExistingRowTestHelpers";

describe("photo material recognition side effects", () => {
  it("does not mutate estimates or create revisions", () => {
    const fixture = createReadyScanFixture();

    expect(fixture.recognition.automatic_estimate_mutations).toBe(0);
    expect(fixture.recognition.automatic_revision_creation).toBe(0);
    expect(fixture.record.revision_state.revisions).toHaveLength(1);
    expect(fixture.record.revision_state.current_revision_id).toBe(fixture.current.revision_id);
  });
});
