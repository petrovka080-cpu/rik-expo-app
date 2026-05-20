import { readLiveUiSource } from "./aiLiveUiArchitectureTestUtils";

describe("live AI UI architecture: no hooks", () => {
  it("keeps the live route layer pure and hook-free", () => {
    const source = readLiveUiSource();
    expect(source).not.toMatch(/from "react"|from 'react'|\buse[A-Z][A-Za-z]+\(/);
  });
});
