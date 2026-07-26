import { validateConstructionUnitSemantics } from "../../src/lib/ai/constructionFormulas";
import { validateEstimateBoqDepth } from "../../src/lib/ai/globalEstimate";
import { estimateForWorkKey } from "./boqDepthTestHelpers";

describe("professional WBS documentation package", () => {
  it("models as-built documentation as governed labor without a fake procurement material", () => {
    const estimate = estimateForWorkKey("brick_masonry", 74, "sq_m");
    const rows = estimate.sections.flatMap((section) =>
      section.rows.map((row) => ({ sectionType: section.type, row })),
    );
    const documentationRows = rows.filter(({ row }) =>
      row.code.endsWith("_as_built_1_documentation_package"),
    );

    expect(documentationRows).toHaveLength(1);
    expect(documentationRows[0]).toMatchObject({
      sectionType: "labor",
      row: {
        unit: "set",
        quantity: 1,
        quantityFormula: "1",
        includedInProcurement: false,
      },
    });
    expect(documentationRows[0].row.calculationTrace).toContain("quantity=1; unit=set");
    expect(
      rows.filter(({ sectionType, row }) =>
        sectionType === "materials" && row.code.includes("_as_built_1_"),
      ),
    ).toEqual([]);
    expect(validateConstructionUnitSemantics(estimate).failures).toEqual([]);
    expect(validateEstimateBoqDepth(estimate).passed).toBe(true);
  });
});
