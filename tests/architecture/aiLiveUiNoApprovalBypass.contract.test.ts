import { readLiveUiSource } from "./aiLiveUiArchitectureTestUtils";

describe("live AI UI architecture: no approval bypass", () => {
  it("does not execute direct approve or reject paths", () => {
    const source = readLiveUiSource();
    expect(source).not.toMatch(/approve[A-Za-z]*\s*\(|reject[A-Za-z]*\s*\(|bypassApproval\s*\(|autoApprove\s*\(/);
  });
});
