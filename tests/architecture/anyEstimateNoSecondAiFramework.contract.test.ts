import { listRepoFiles, readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("any estimate no second AI framework", () => {
  it("does not introduce LangChain/LlamaIndex style dependencies in estimate code", () => {
    const files = listRepoFiles("src/lib/ai/estimateRouting", (file) => file.endsWith(".ts"))
      .concat(listRepoFiles("src/lib/ai/globalEstimate/externalSources", (file) => file.endsWith(".ts")));
    const combined = files.map(readRepoFile).join("\n");

    expect(combined).not.toMatch(/langchain|llamaindex|semantic-kernel|autogen/i);
  });
});
