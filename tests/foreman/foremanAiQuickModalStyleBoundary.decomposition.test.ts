import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const read = (relativePath: string) =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("S_NIGHT_UI_14 ForemanAiQuickModal style boundary", () => {
  const modalSource = read("src/screens/foreman/ForemanAiQuickModal.tsx");
  const stylesSource = read("src/screens/foreman/ForemanAiQuickModal.styles.ts");

  it("keeps ForemanAiQuickModal as a composition shell with extracted styles", () => {
    expect(modalSource).toContain('import { styles } from "./ForemanAiQuickModal.styles";');
    expect(modalSource).not.toContain("StyleSheet.create");
    expect(stylesSource).toContain('import { StyleSheet } from "react-native";');
    expect(stylesSource).toContain("export const styles = StyleSheet.create({");
    expect(modalSource).toContain("const cardStyle = styles.card;");
    expect(modalSource.split(/\r?\n/).length).toBeLessThanOrEqual(560);
  });

  it("keeps the existing hook and provider boundary unchanged", () => {
    const hookCalls = Array.from(
      modalSource.matchAll(/\b(use[A-Z][A-Za-z0-9_]*)\s*\(/g),
    ).map((match) => String(match[1]));

    expect(hookCalls).toEqual(["useSafeAreaInsets", "useForemanVoiceInput"]);
    expect(modalSource).not.toContain("supabase");
    expect(modalSource).not.toContain("fetch(");
    expect(modalSource).not.toContain("cache");
    expect(modalSource).not.toContain("rateLimit");
  });

  it("preserves the external AI selector contract", () => {
    for (const selector of [
      'testID="foreman-ai-input"',
      'accessibilityLabel="foreman-ai-input"',
      'testID="foreman-ai-mic"',
      'testID="foreman-ai-parse"',
      'accessibilityLabel="foreman-ai-parse"',
      "foreman-ai-option-${toSelectorToken(group.groupId)}",
      'testID="foreman-ai-back"',
      'accessibilityLabel="foreman-ai-back"',
      'testID="foreman-ai-apply"',
      'accessibilityLabel="foreman-ai-apply"',
    ]) {
      expect(modalSource).toContain(selector);
    }
  });
});
