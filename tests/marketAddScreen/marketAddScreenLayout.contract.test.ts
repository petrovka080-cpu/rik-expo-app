import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market add screen layout contract", () => {
  it("keeps the full-screen add form scrollable with sticky CTA above bottom nav", () => {
    const modal = read("src/screens/profile/components/ListingModal.tsx");
    const styles = read("src/screens/profile/profile.styles.ts");
    const stickyBar = read("src/components/layout/AppStickyActionBar.tsx");

    expect(modal).toContain("listingFullscreenHost");
    expect(modal).toContain("KeyboardAvoidingView");
    expect(modal).toContain("keyboardShouldPersistTaps=\"handled\"");
    expect(modal).toContain("AppStickyActionBar");
    expect(modal).toContain('placement="above_bottom_nav"');
    expect(styles).toContain("paddingBottom: APP_LAYOUT.scrollBottomPaddingPx");
    expect(stickyBar).toContain("APP_LAYOUT.bottomNavHeightPx + APP_LAYOUT.stickyActionGapPx");
    expect(stickyBar).toContain("testID=\"app.sticky-action-bar\"");
  });
});
