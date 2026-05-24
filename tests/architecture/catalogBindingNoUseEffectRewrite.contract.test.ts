import { listProjectFiles, readProjectFile } from "./catalogBindingArchitectureTestHelpers";

describe("catalog binding no useEffect rewrite", () => {
  it("does not add useEffect answer rewrites for catalog binding", () => {
    const offenders = listProjectFiles("src")
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) => /useEffect\s*\(\s*\(\)\s*=>\s*setAnswer|setMessages\s*\(\s*prev\s*=>\s*rewrite/.test(readProjectFile(file)));
    expect(offenders).toEqual([]);
  });
});
