import fs from "fs";
import path from "path";

const readAiFile = (fileName: string): string =>
  fs.readFileSync(path.join(__dirname, fileName), "utf8");

describe("AIAssistantScreen decomposition", () => {
  it("keeps static styles in a sibling boundary without prompt or network drift", () => {
    const screenSource = readAiFile("AIAssistantScreen.tsx");
    const stylesSource = readAiFile("AIAssistantScreen.styles.ts");

    expect(screenSource).toContain('import { aiAssistantScreenStyles as styles } from "./AIAssistantScreen.styles";');
    expect(screenSource).not.toContain("StyleSheet.create");
    expect(screenSource).not.toContain('StyleSheet,');
    expect(screenSource.split("\n").length).toBeLessThanOrEqual(732 - 200);

    expect(stylesSource).toContain("export const aiAssistantScreenStyles = StyleSheet.create");
    expect(stylesSource).toContain("messageBubble");
    expect(stylesSource).toContain("voiceStatusError");
    expect(stylesSource).not.toContain("sendAssistantMessage");
    expect(stylesSource).not.toContain("tryRunAssistantAction");
    expect(stylesSource).not.toContain("loadAssistantScopedFacts");

    expect(screenSource).toContain("sendAssistantMessage");
    expect(screenSource).toContain("tryRunAssistantAction");
    expect(screenSource).toContain("loadAssistantScopedFacts");
  });
});
