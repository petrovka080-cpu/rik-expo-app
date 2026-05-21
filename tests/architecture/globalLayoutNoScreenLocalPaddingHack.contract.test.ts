import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("global layout safe-area architecture", () => {
  it("uses shared safe-area primitives for affected primary actions", () => {
    const foremanStyles = read("src/screens/foreman/foreman.styles.ts");
    const profileStyles = read("src/screens/profile/profile.styles.ts");
    const contractorStyles = read("src/screens/contractor/contractor.styles.ts");
    const foremanEditor = read("src/screens/foreman/ForemanEditorSection.tsx");
    const listingModal = read("src/screens/profile/components/ListingModal.tsx");

    expect(foremanStyles).toContain("APP_LAYOUT.scrollBottomPaddingPx");
    expect(profileStyles).toContain("APP_LAYOUT.scrollBottomPaddingPx");
    expect(contractorStyles).toContain("APP_LAYOUT.scrollBottomPaddingPx");
    expect(foremanEditor).toContain("ForemanDraftSummaryCard");
    expect(foremanEditor).not.toContain("position: \"absolute\"");
    expect(foremanEditor).not.toContain("bottom:");
    expect(listingModal).toContain("AppStickyActionBar");
  });
});
