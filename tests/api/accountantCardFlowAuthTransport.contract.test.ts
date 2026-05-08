import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("accountant card flow auth transport boundary", () => {
  it("keeps accountant card auth FIO lookup behind the transport boundary", () => {
    const hookSource = read("src/screens/accountant/useAccountantCardFlow.ts");
    const transportSource = read("src/screens/accountant/useAccountantCardFlow.auth.transport.ts");

    expect(hookSource).toContain('from "./useAccountantCardFlow.auth.transport"');
    expect(hookSource).not.toContain("supabase.auth.getUser");
    expect(hookSource).not.toMatch(/\bsupabase\s*\.\s*from\s*\(/);
    expect(transportSource).toContain("supabase.auth.getUser");
    expect(transportSource).toContain("loadAccountantCardFlowAuthFio");
  });
});
