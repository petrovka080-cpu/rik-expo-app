import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("AI layout primitives architecture", () => {
  it("keeps Wave 03 primitives hook-free, bounded, and stable for runtime automation", () => {
    const files = [
      "src/components/ai/runtime/AiScreenRuntimePanel.tsx",
      "src/components/ai/runtime/AiSafeKeyboardShell.tsx",
      "src/components/ai/runtime/AiBoundedFlatList.tsx",
      "src/components/ai/runtime/AiScreenScrollShell.tsx",
      "src/components/ai/runtime/AiComposerBar.tsx",
    ];
    const source = files.map(read).join("\n");

    expect(source).toContain("AI_BOUNDED_FLATLIST_INITIAL_NUM_TO_RENDER = 8");
    expect(source).toContain("AI_BOUNDED_FLATLIST_MAX_TO_RENDER_PER_BATCH = 8");
    expect(source).toContain("AI_BOUNDED_FLATLIST_WINDOW_SIZE = 5");
    expect(source).toContain("AI_BOUNDED_FLATLIST_MAX_ITEMS = 20");
    expect(source).toContain("data.slice(0, AI_BOUNDED_FLATLIST_MAX_ITEMS)");
    expect(source).toContain('keyboardShouldPersistTaps="handled"');
    expect(source).toContain('testID="ai.screen.composer.input"');
    expect(source).toContain('testID="ai.screen.composer.send"');
    expect(source).toContain('testID="ai.screen.composer.loading"');
    expect(source).toContain('testID="ai.screen.composer.target"');
    expect(source).toContain('testID = "ai.screen.runtime.panel"');
    expect(source).toContain('testID="ai.screen.scroll"');

    expect(source).not.toMatch(/\buse[A-Z][A-Za-z0-9_]*\s*\(/);
    expect(source).not.toMatch(/\bReact\.use[A-Z][A-Za-z0-9_]*\s*\(/);
    expect(source).not.toMatch(/\btemporary\b|\bshim\b/i);
    expect(source).not.toMatch(/\bfetch\s*\(|axios|XMLHttpRequest/i);
    expect(source).not.toMatch(/from\s+["'][^"']*supabase/i);
    expect(source).not.toMatch(/\bservice_role\b|\blistUsers\b|\bauth\.admin\b/i);
    expect(source).not.toMatch(/\b(openai|gpt-|gemini|LegacyGeminiModelProvider)\b/i);
  });
});
