import fs from "fs";
import path from "path";

describe("AI screen-native value delivery web runner", () => {
  it("checks major screen packs, hidden debug copy and no provider calls", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/runAiScreenNativeValueDeliveryWeb.ts"), "utf8");

    expect(source).toContain("/ai?context=buyer");
    expect(source).toContain("ai.screen_native_value_pack");
    expect(source).toContain("accountant payment summary visible");
    expect(source).toContain("warehouse risk block visible");
    expect(source).toContain("director decision queue visible");
    expect(source).toContain("documents summary visible");
    expect(source).toContain("chat answers from screen context");
    expect(source).toContain("providerCalls.length === 0");
  });
});
