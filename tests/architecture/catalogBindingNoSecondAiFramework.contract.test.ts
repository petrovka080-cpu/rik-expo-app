import { listProjectFiles, readProjectFile } from "./catalogBindingArchitectureTestHelpers";

describe("catalog binding no second AI framework", () => {
  it("does not add AI framework entrypoints for catalog binding", () => {
    const offenders = listProjectFiles("src")
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) =>
        file.includes("/catalog/") ||
        file.includes("/catalogBinding/") ||
        file.includes("/consumerRepair/") ||
        file.includes("/consumerRequests/"),
      )
      .filter((file) => /new\s+AiFramework|createAiFramework|SecondAi|LangChain|CrewAI/i.test(readProjectFile(file)));
    expect(offenders).toEqual([]);
  });
});
