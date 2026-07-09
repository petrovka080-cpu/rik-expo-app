import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("foreman AI estimate legacy picker guard", () => {
  it("keeps materials and subcontracts wired to ProfessionalEstimateComposer instead of old pickers", () => {
    const materialsSections = read("src/screens/foreman/ForemanMaterialsContent.sections.tsx");
    const materialsEditor = read("src/screens/foreman/ForemanEditorSection.tsx");
    const subcontractSections = read("src/screens/foreman/ForemanSubcontractTab.sections.tsx");
    const subcontractDraft = read("src/screens/foreman/ForemanSubcontractDraftSections.tsx");

    expect(materialsSections).toContain("ProfessionalEstimateComposer");
    expect(subcontractSections).toContain("ProfessionalEstimateComposer");
    expect(materialsEditor).toContain("FOREMAN_MATERIALS_AI_ESTIMATE_ENTRY.estimateButtonTestId");
    expect(subcontractSections).toContain("FOREMAN_SUBCONTRACTS_AI_ESTIMATE_ENTRY.estimateButtonTestId");
    expect(subcontractDraft).toContain("FOREMAN_SUBCONTRACTS_AI_ESTIMATE_ENTRY.estimateButtonTestId");
    for (const source of [materialsSections, materialsEditor, subcontractSections, subcontractDraft]) {
      expect(source).not.toContain("WorkTypePicker");
      expect(source).not.toContain("CalcModal");
      expect(source).not.toContain("genericDraft");
      expect(source).not.toContain("markdown");
    }
  });
});
