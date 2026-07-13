import { readSource } from "../aiPlatform/universalProfessionalEstimateEngineTestHelpers";

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

describe("universal estimate engine AI framework guard", () => {
  it("does not add a second AI framework dependency", () => {
    const pkg = JSON.parse(readSource("package.json")) as PackageJson;
    const dependencyNames = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ];
    expect(dependencyNames).not.toContain("openai");
    expect(dependencyNames).not.toContain("ai");
    expect(dependencyNames).not.toContain("langchain");
    expect(dependencyNames).not.toContain("@langchain/core");
  });
});
