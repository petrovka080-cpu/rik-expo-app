import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("StickyActionBar", () => {
  it("renders primary actions above the bottom navigation from a shared component", () => {
    const source = read("src/components/layout/StickyActionBar.tsx");
    const canonicalSource = read("src/components/layout/AppStickyActionBar.tsx");
    const foremanEditor = read("src/screens/foreman/ForemanEditorSection.tsx");
    const foremanDraftSummary = read("src/screens/foreman/ForemanDraftSummaryCard.tsx");
    const foremanDraftModal = read("src/screens/foreman/ForemanDraftModal.tsx");
    const listingModal = read("src/screens/profile/components/ListingModal.tsx");

    expect(source).toContain("StickyActionBarProps");
    expect(source).toContain("safeAboveBottomNav: true");
    expect(source).toContain("AppStickyActionBar");
    expect(canonicalSource).toContain("testID=\"app.sticky-action-bar\"");
    expect(canonicalSource).toContain("APP_LAYOUT.bottomNavHeightPx + APP_LAYOUT.stickyActionGapPx");
    expect(canonicalSource).toContain("position: \"fixed\"");
    expect(canonicalSource).toContain("position: \"absolute\"");

    expect(foremanEditor).not.toContain("foreman-materials-sticky-send");
    expect(foremanDraftSummary).toContain("foreman-draft-open");
    expect(foremanDraftModal).toContain("AppSheetFooter");
    expect(foremanDraftModal).toContain("foreman-draft-send");

    expect(listingModal).toContain("AppStickyActionBar");
    expect(listingModal).toContain("add-listing-flow-publish");
    expect(listingModal).toContain("add-listing-flow-close");
  });
});
