import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("layout ViewStyle typecheck hotfix", () => {
  it("keeps canonical fixed web positioning without suppression or behavior rewrite", () => {
    const chatComposer = read("src/components/layout/AppChatComposerBar.tsx");
    const stickyActionBar = read("src/components/layout/AppStickyActionBar.tsx");
    const combined = `${chatComposer}\n${stickyActionBar}`;

    expect(chatComposer).toContain("Platform.select");
    expect(chatComposer).toContain('position: "fixed"');
    expect(chatComposer).toContain("} as ViewStyle");
    expect(chatComposer).toContain('position: "absolute"');
    expect(stickyActionBar).toContain("Platform.select");
    expect(stickyActionBar).toContain('position: "fixed"');
    expect(stickyActionBar).toContain("} as ViewStyle");
    expect(stickyActionBar).toContain('position: "absolute"');
    expect(combined).not.toContain("as any");
    expect(combined).not.toContain("@ts-ignore");
    expect(combined).not.toContain("eslint-disable");
    expect(combined).toContain("testID=\"app.chat-composer-bar\"");
    expect(combined).toContain("testID=\"app.sticky-action-bar\"");
  });
});
