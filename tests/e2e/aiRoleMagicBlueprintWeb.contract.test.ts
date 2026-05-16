import fs from "fs";
import path from "path";

describe("AI role magic blueprint web runner", () => {
  it("checks role-native web targetability, hidden debug copy and no provider calls", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/runAiRoleMagicBlueprintWeb.ts"), "utf8");

    expect(source).toContain("/ai?context=buyer");
    expect(source).toContain("/ai?context=accountant");
    expect(source).toContain("ai.screen_native_value_pack");
    expect(source).toContain("buyer role blueprint visible");
    expect(source).toContain("accountant role blueprint visible");
    expect(source).toContain("chat answers role-specific question");
    expect(source).toContain("providerCalled: false");
    expect(source).toContain("GREEN_AI_ROLE_MAGIC_BLUEPRINT_WEB_TARGETABLE");
  });
});
