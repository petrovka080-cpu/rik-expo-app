import { validateConstructionUnitSemantics } from "../../src/lib/ai/constructionFormulas";
import { validateEstimateBoqDepth } from "../../src/lib/ai/globalEstimate";
import { stripFoundationEstimate } from "./boqDepthTestHelpers";

describe("professional WBS documentation package", () => {
  it("models exact as-built records as governed labor without fake procurement materials", () => {
    const estimate = stripFoundationEstimate();
    const rows = estimate.sections.flatMap((section) =>
      section.rows.map((row) => ({ sectionType: section.type, row })),
    );
    const documentationRows = rows.filter(({ row }) => [
      "strip_foundation_as_built_photo_register",
      "strip_foundation_as_built_scheme",
    ].includes(row.code));

    expect(documentationRows).toHaveLength(2);
    expect(documentationRows.every(({ sectionType, row }) =>
      sectionType === "labor" &&
      row.unit === "set" &&
      row.quantity === 1 &&
      row.quantityFormula === "1" &&
      row.includedInProcurement === false &&
      Boolean(row.calculationTrace) &&
      row.sourceEvidence.length > 0
    )).toBe(true);
    expect(documentationRows.map(({ row }) => row.name)).toEqual(expect.arrayContaining([
      "Исполнительная фотофиксация скрытых работ фундамента",
      "Исполнительная схема фундамента с отметками и выпусками",
    ]));
    expect(
      rows.filter(({ sectionType, row }) =>
        sectionType === "materials" && /as_built|documentation_package/iu.test(row.code),
      ),
    ).toEqual([]);
    expect(validateConstructionUnitSemantics(estimate).failures).toEqual([]);
    expect(validateEstimateBoqDepth(estimate).passed).toBe(true);
  });
});
