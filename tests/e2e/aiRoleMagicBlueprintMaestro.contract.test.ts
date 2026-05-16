import fs from "fs";
import path from "path";

describe("AI role magic blueprint Maestro runner", () => {
  it("checks Android targetability for role-native output and approval boundaries", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/runAiRoleMagicBlueprintMaestro.ts"), "utf8");

    expect(source).toContain("AI assistant opens on key roles");
    expect(source).toContain("approval-required buttons do not execute directly");
    expect(source).toContain("forbidden buttons show reason");
    expect(source).toContain("debug hidden");
    expect(source).toContain("providerCalled: false");
    expect(source).toContain("GREEN_AI_ROLE_MAGIC_BLUEPRINT_MAESTRO_TARGETABLE");
  });
});
