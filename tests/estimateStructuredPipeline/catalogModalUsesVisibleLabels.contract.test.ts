import { buildStructuredEstimateCatalogBinding } from "../../src/lib/estimateStructuredPipeline";
import { allPayloads, expectNoForbiddenVisibleText } from "./structuredPipelineTestHelpers";

describe("catalog modal structured estimate binding", () => {
  it("uses visible material labels for catalog search and buttons", () => {
    for (const payload of allPayloads()) {
      const binding = buildStructuredEstimateCatalogBinding(payload);
      expect(binding.rows.length).toBeGreaterThan(0);
      const visibleText = binding.rows.flatMap((row) => [row.visibleName, row.searchQuery, row.buttonLabel]).join("\n");
      expectNoForbiddenVisibleText(visibleText);
    }
  });
});
