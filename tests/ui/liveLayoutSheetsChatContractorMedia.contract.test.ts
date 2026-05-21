import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("live layout sheets, chat composer, and contractor media blocker fix", () => {
  it("keeps foreman send action inside the draft sheet footer and preserves AI request", () => {
    const editor = read("src/screens/foreman/ForemanEditorSection.tsx");
    const modal = read("src/screens/foreman/ForemanDraftModal.tsx");

    expect(editor).not.toContain("foreman-materials-sticky-send");
    expect(editor).not.toContain("AppStickyActionBar");
    expect(editor).toContain("foreman-ai-quick-open");

    expect(modal).toContain("AppSheetFooter");
    expect(modal).toContain("inside_sheet_above_bottom_nav");
    expect(modal).toContain("foreman-draft-footer-pdf");
    expect(modal).toContain("foreman-draft-footer-excel");
    expect(modal).toContain("foreman-draft-send");
  });

  it("renders contractor media only inside the expanded work modal", () => {
    const screen = read("src/screens/contractor/ContractorScreenView.tsx");
    const modalSection = read("src/screens/contractor/components/WorkModalOverviewSection.tsx");
    const expandableCard = read("src/components/layout/AppContractorExpandableWorkCard.tsx");

    expect(screen).not.toContain("LiveRouteMediaEntrypointPanel");
    expect(screen).not.toContain("contractorMediaEntry");
    expect(modalSection).toContain("AppContractorExpandableWorkCard");
    expect(modalSection).toContain("LiveRouteMediaEntrypointPanel");
    expect(modalSection).toContain("attachTarget=\"contractor_work\"");
    expect(expandableCard).toContain("mediaControlsVisibleOnlyWhenExpanded: true");
    expect(expandableCard).toContain("if (!expanded) return null");
  });

  it("keeps the AI chat composer above the bottom navigation with global layout padding", () => {
    const screen = read("src/features/ai/AIAssistantScreen.tsx");
    const styles = read("src/features/ai/AIAssistantScreen.styles.ts");
    const composer = read("src/components/layout/AppChatComposerBar.tsx");

    expect(screen).toContain("AppChatComposerBar");
    expect(screen).toContain("safeAboveBottomNav");
    expect(styles).toContain("APP_LAYOUT.bottomNavHeightPx + 128");
    expect(composer).toContain("testID=\"app.chat-composer-bar\"");
    expect(composer).toContain("bottom: APP_LAYOUT.bottomNavHeightPx");
  });
});
