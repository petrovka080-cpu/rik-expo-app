import { bindEstimateRowsToCatalogItems } from "../../src/lib/ai/globalEstimate/catalogBinding/bindEstimateRowsToCatalogItems";
import { candidateFor, estimateFor, FOUNDATION_PROMPT } from "./catalogBindingTestHelpers";

describe("catalog binding multiple candidates", () => {
  it("keeps multiple candidates for user selection instead of auto-choosing silently", async () => {
    const estimate = estimateFor(FOUNDATION_PROMPT);
    const binding = await bindEstimateRowsToCatalogItems({
      estimate,
      searchProvider: async (_query, row) => [
        candidateFor(row),
        { ...candidateFor(row), catalogItemId: `alternate_${row.rateKey || row.code}`, name: `${row.name} alternate` },
      ],
    });
    const materialRows = binding.rows.filter((row) => row.bindingStatus !== "not_material_row");
    expect(materialRows.length).toBeGreaterThan(0);
    expect(materialRows.every((row) => row.bindingStatus === "multiple_candidates")).toBe(true);
  });
});
