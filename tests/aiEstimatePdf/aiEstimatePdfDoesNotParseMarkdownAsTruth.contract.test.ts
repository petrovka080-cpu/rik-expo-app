import { assertNoMarkdownEstimatePdfSource } from "../../src/lib/ai/estimatePdf";

describe("AI estimate PDF does not parse markdown as truth contract", () => {
  it("rejects visible markdown as a PDF source of truth", () => {
    expect(() => assertNoMarkdownEstimatePdfSource("| item | total |\n|---|---:|")).toThrow(
      "Visible markdown is not a valid PDF source of truth.",
    );
  });
});
