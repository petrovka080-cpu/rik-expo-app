import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("AI assistant loading-state stable surface", () => {
  const assistantSource = read("src/features/ai/AIAssistantScreen.tsx");

  it("exposes the real loading bubble through a stable testID", () => {
    const loadingIndex = assistantSource.indexOf("loading ? (");
    const loadingBubbleIndex = assistantSource.indexOf("styles.loadingBubble", loadingIndex);
    const loadingTestIdIndex = assistantSource.indexOf('testID="ai.assistant.loading"', loadingIndex);
    const loadingLabelIndex = assistantSource.indexOf(
      'accessibilityLabel="AI assistant loading"',
      loadingIndex,
    );

    expect(loadingIndex).toBeGreaterThan(-1);
    expect(loadingBubbleIndex).toBeGreaterThan(loadingIndex);
    expect(loadingTestIdIndex).toBeGreaterThan(loadingIndex);
    expect(loadingLabelIndex).toBeGreaterThan(loadingIndex);
    expect(assistantSource.slice(loadingIndex, loadingIndex + 500)).toContain("<ActivityIndicator");
    expect(assistantSource.slice(loadingIndex, loadingIndex + 500)).toContain("loadingInlineText");
  });

  it("does not add a fake or test-only AI response path", () => {
    expect(assistantSource).not.toMatch(/fake AI answer|hardcoded AI response|__TEST__|testOnly/i);
    expect(assistantSource).toContain("sendAssistantMessage({");
    expect(assistantSource).toContain('"ai.assistant.response"');
  });
});
