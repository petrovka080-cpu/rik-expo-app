import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");

describe("R568 flat public BOQ UI", () => {
  it("keeps section metadata internal, restores compact category filters, and renders one flat row list", () => {
    const editor = read("src/features/consumerRepair/RequestEstimateItemsEditor.tsx");
    expect(editor).toContain('testID="request-estimate-flat-row-list"');
    for (const id of ["all", "materials", "labor", "machinery", "services", "delivery"]) {
      expect(editor).toContain('testID={`request-estimate-category-filter-${filter.id}`}');
      expect(editor).toContain(`{ id: "${id}", label:`);
    }
    expect(editor).toContain("collapsedCategoryIds");
    expect(editor).toContain("requestEstimateCategoryFilterForItem");
    expect(editor).not.toContain("styles.sectionTitle");
    expect(editor).not.toContain("match.sectionTitle");
  });

  it("does not render section summaries in either professional BOQ surface", () => {
    const main = read("src/features/requests/components/ProfessionalBoqGroupedMainView.tsx");
    const drawer = read("src/features/requests/components/ProfessionalBoqFullDetailDrawer.tsx");
    expect(main).not.toContain("ProfessionalBoqSectionSummary");
    expect(drawer).not.toContain("renderSectionHeader");
    expect(drawer).not.toContain("professionalBoqSectionSummaryText");
  });
});
