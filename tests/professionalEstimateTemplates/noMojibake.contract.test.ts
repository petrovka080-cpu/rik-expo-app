import {
  countMojibakeVisible,
  professionalSnapshots,
} from "./professionalEstimateTestHelpers";

describe("professional estimate no mojibake", () => {
  it("does not expose mojibake in visible rows", () => {
    const count = professionalSnapshots().reduce((sum, snapshot) => sum + countMojibakeVisible(snapshot.visible_rows), 0);
    expect(count).toBe(0);
  });
});
