import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("floating AI button safe area", () => {
  it("uses the shared bottom nav offset instead of a screen-local hardcoded position", () => {
    const tabsLayout = read("app/(tabs)/_layout.tsx");
    const assistantFab = read("src/features/ai/AssistantFab.tsx");

    expect(tabsLayout).toContain("floatingAiButtonWithStickyActionOffsetPx");
    expect(tabsLayout).toContain("assistantBottomOffset");
    expect(assistantFab).toContain("testID=\"ai.assistant.open\"");
    expect(assistantFab).toContain("bottomOffset");
    expect(assistantFab).not.toContain("bottom: 0");
  });
});
