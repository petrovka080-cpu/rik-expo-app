import fs from "node:fs";
import path from "node:path";

describe("PDF tabular regression no estimate calculation in PDF layer", () => {
  it("keeps calculation APIs out of the AI PDF renderer and view model", () => {
    const renderer = fs.readFileSync(path.resolve(process.cwd(), "src/lib/aiEstimatePdf/renderAiEstimatePdfDocument.ts"), "utf8");
    const viewModel = fs.readFileSync(path.resolve(process.cwd(), "src/lib/aiEstimatePdf/buildAiEstimatePdfViewModel.ts"), "utf8");
    expect(`${renderer}\n${viewModel}`).not.toMatch(/calculateGlobalConstructionEstimate|resolveGlobalWorkType|getGlobalRate|taxRuleService/i);
    expect(viewModel).toContain("outputContract?.format");
  });
});
