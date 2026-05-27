import { world50000Source } from "./world50000ArchitectureTestHelpers";

describe("world 50000 architecture - no useEffect rewrite", () => {
  it("does not implement the proof as a React useEffect answer rewrite", () => {
    expect(world50000Source()).not.toMatch(/useEffect\s*\(/);
  });
});
