import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("live layout architecture avoids floating sheet actions", () => {
  it("does not keep duplicate floating send-director action behind the foreman draft sheet", () => {
    const editor = read("src/screens/foreman/ForemanEditorSection.tsx");
    const modal = read("src/screens/foreman/ForemanDraftModal.tsx");

    expect(editor).not.toMatch(/testID:\s*["']foreman-materials-sticky-send["']/);
    expect(editor).not.toContain("onSendDraft ? p.onSendDraft()");
    expect(modal).toContain("AppSheetFooter");
    expect(modal).toContain("foreman-draft-send");
  });

  it("does not expose contractor photo or video controls from the collapsed list screen", () => {
    const screen = read("src/screens/contractor/ContractorScreenView.tsx");
    const styles = read("src/screens/contractor/contractor.styles.ts");
    const modalSection = read("src/screens/contractor/components/WorkModalOverviewSection.tsx");
    const expandableCard = read("src/components/layout/AppContractorExpandableWorkCard.tsx");

    expect(screen).not.toContain("LiveRouteMediaEntrypointPanel");
    expect(screen).not.toContain("contractorMediaEntry");
    expect(styles).not.toContain("contractorMediaEntry");
    expect(modalSection).toContain("AppContractorExpandableWorkCard");
    expect(expandableCard).toContain("contractor.work.expanded.media");
  });
});
