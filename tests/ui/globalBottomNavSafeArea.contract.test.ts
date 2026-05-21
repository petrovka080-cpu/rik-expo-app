import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("global bottom nav safe area", () => {
  it("defines one shared layout contract for bottom nav, sticky actions, scroll padding and FAB offset", () => {
    const layout = read("src/components/layout/appLayout.ts");
    const css = read("app/global.css");
    const tabsLayout = read("app/(tabs)/_layout.tsx");
    const roleLayout = read("src/components/layout/RoleScreenLayout.tsx");
    const assistantFab = read("src/features/ai/AssistantFab.tsx");

    expect(layout).toContain("bottomNavHeightPx: 72");
    expect(layout).toContain("stickyActionGapPx: 12");
    expect(layout).toContain("floatingAiButtonOffsetPx: 96");
    expect(layout).toContain("floatingAiButtonWithStickyActionOffsetPx: 160");
    expect(layout).toContain("scrollBottomPaddingPx: 160");
    expect(layout).toContain("BottomNavCollisionCheck");

    expect(css).toContain("--app-bottom-nav-height: 72px");
    expect(css).toContain("--app-sticky-action-bottom");
    expect(css).toContain("--app-scroll-bottom-padding");

    expect(tabsLayout).toContain("APP_LAYOUT.bottomNavHeightPx");
    expect(tabsLayout).toContain("APP_LAYOUT.floatingAiButtonWithStickyActionOffsetPx");
    expect(roleLayout).toContain("APP_LAYOUT.pageBottomExtraPaddingPx");
    expect(assistantFab).toContain("bottomOffset");
  });
});
