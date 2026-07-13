import {
  countInternalKeysVisible,
  professionalSnapshots,
} from "./professionalEstimateTestHelpers";

describe("professional estimate no internal keys visible", () => {
  it("does not expose internal keys in visible rows", () => {
    const count = professionalSnapshots().reduce((sum, snapshot) => sum + countInternalKeysVisible(snapshot.visible_rows), 0);
    expect(count).toBe(0);
  });
});
