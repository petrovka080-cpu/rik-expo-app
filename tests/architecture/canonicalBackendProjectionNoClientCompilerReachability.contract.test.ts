import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("canonical backend projection has no client compiler reachability", () => {
  it("keeps the canonical revision PDF projection on a compiler-free adapter", () => {
    const canonicalAdapter = readRepoFile(
      "src/lib/estimate/backendPlatform/canonicalEstimateForemanAdapter.ts",
    );
    const sharedBinding = readRepoFile(
      "src/lib/estimateStructuredPipeline/structuredEstimateForemanBinding.ts",
    );
    const pdfAdapter = readRepoFile(
      "src/lib/ai/estimatePdf/estimatePdfGlobalResultAdapter.ts",
    );

    expect(canonicalAdapter).toContain("buildStructuredEstimateForemanBinding");
    expect(sharedBinding).toContain("estimatePdfGlobalResultAdapter");
    expect(sharedBinding).not.toContain("estimatePdfSourceResolver");
    expect(pdfAdapter).not.toMatch(
      /globalEstimateCalculator|expandedEstimateCompiler|productionExpandedWorkCatalog10000|compileProductionExpandedEstimate10000/u,
    );
  });
});
