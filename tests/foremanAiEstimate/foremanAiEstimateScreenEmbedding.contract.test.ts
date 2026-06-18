import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

const readTree = (dir: string): string =>
  readdirSync(join(root, dir))
    .flatMap((entry) => {
      const full = join(root, dir, entry);
      const rel = join(dir, entry);
      if (statSync(full).isDirectory()) return readTree(rel);
      if (!/\.(ts|tsx)$/.test(entry)) return [];
      return readFileSync(full, "utf8");
    })
    .join("\n");

describe("foreman AI estimate screen embedding", () => {
  it("replaces old materials picker stack with the professional composer only in foreman materials", () => {
    const sections = read("src/screens/foreman/ForemanMaterialsContent.sections.tsx");
    const navigation = read("src/screens/foreman/hooks/useForemanNavigationFlow.ts");
    const composer = read("src/components/estimate/ProfessionalEstimateComposer.tsx");

    expect(sections).toContain("ProfessionalEstimateComposer");
    expect(sections).not.toContain("components/foreman/WorkTypePicker");
    expect(sections).not.toContain("components/foreman/CalcModal");
    expect(navigation).toContain("openAiEstimateComposer");
    expect(navigation).not.toContain("openWorkTypePicker");
    expect(composer).toContain('testID="foreman-ai-estimate-row-qty"');
    expect(composer).toContain('testID="foreman-ai-estimate-row-price"');
    expect(composer).toContain('testID="foreman-ai-estimate-catalog-search"');
    expect(composer).toContain('testID="foreman-ai-estimate-open-draft"');
    expect(composer).toContain('testID="foreman-ai-estimate-work-suggestions"');
    expect(composer).toContain('testID="foreman-ai-estimate-catalog-hint"');
    expect(composer).toContain("searchGlobalWorkSmartSuggestions");
    expect(composer).toContain("explicitWorkKey");
    expect(composer).toContain("transparent={false}");
  });

  it("keeps consumer repair request flow separate from foreman AI estimate composer", () => {
    const consumerRepairSource = readTree("src/features/consumerRepair");
    expect(consumerRepairSource).not.toContain("foremanAiEstimate");
    expect(consumerRepairSource).not.toContain("ProfessionalEstimateComposer");
  });

  it("keeps director request sheet free from internal foreman AI JSON notes", () => {
    const sheet = read("src/screens/director/DirectorRequestSheet.tsx");
    const modal = read("src/screens/director/DirectorSheetModal.tsx");
    const data = read("src/screens/director/director.data.ts");
    const approvedMapper = read("src/lib/foremanAiEstimate/mapApprovedForemanDraftToBuyerRows.ts");

    expect(sheet).toContain("isInternalAiEstimateNote");
    expect(sheet).toContain("buildRequestContextLines");
    expect(modal).toContain("requestMeta={");
    expect(data).toContain("preloadRequestMeta(ids)");
    expect(approvedMapper).toContain("buildForemanAiEstimateVisibleContextNote(row.context)");
    expect(approvedMapper).not.toContain("note: row.note");
  });
});
