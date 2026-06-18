import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("foreman AI estimate code desync and bloat guard", () => {
  it("keeps one mapper from AI estimate to foreman and one mapper from approved rows to buyer", () => {
    const composer = read("src/components/estimate/ProfessionalEstimateComposer.tsx");
    const sections = read("src/screens/foreman/ForemanMaterialsContent.sections.tsx");
    const mapToDraft = read("src/lib/foremanAiEstimate/mapAiEstimateToForemanDraft.ts");
    const mapToBuyer = read("src/lib/foremanAiEstimate/mapApprovedForemanDraftToBuyerRows.ts");

    expect(composer).toContain("mapAiEstimateToForemanDraft");
    expect(sections).toContain("ProfessionalEstimateComposer");
    expect(sections).not.toContain("WorkTypePicker");
    expect(mapToDraft).toContain("FOREMAN_AI_ESTIMATE_SOURCE");
    expect(mapToBuyer).toContain("mapApprovedForemanDraftToBuyerRows");
  });

  it("does not hide internal source identifiers in visible note strings", () => {
    const visibleNote = read("src/lib/foremanAiEstimate/foremanAiEstimateVisibleNote.ts");

    expect(visibleNote).not.toContain("estimateRevisionId");
    expect(visibleNote).not.toContain("rowId");
    expect(visibleNote).not.toContain("payloadFingerprint");
  });
});
