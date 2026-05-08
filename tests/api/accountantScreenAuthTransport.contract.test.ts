import fs from "fs";
import path from "path";
import { hasCurrentAccountantSessionUser } from "../../src/screens/accountant/accountant.screen.auth.transport";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("accountant screen auth transport boundary", () => {
  it("keeps accountant screen session checks behind the transport boundary", () => {
    const controllerSource = read("src/screens/accountant/useAccountantScreenController.ts");
    const transportSource = read("src/screens/accountant/accountant.screen.auth.transport.ts");

    expect(controllerSource).toContain('from "./accountant.screen.auth.transport"');
    expect(controllerSource).not.toContain("supabase.auth.getSession");
    expect(transportSource).toContain("supabase.auth.getSession");
    expect(transportSource).toContain("hasCurrentAccountantSessionUser");
  });

  it("preserves session user presence semantics", async () => {
    await expect(
      hasCurrentAccountantSessionUser({
        readSession: async () => ({ data: { session: { user: { id: "user-1" } } } }),
      }),
    ).resolves.toBe(true);

    await expect(
      hasCurrentAccountantSessionUser({
        readSession: async () => ({ data: { session: null } }),
      }),
    ).resolves.toBe(false);
  });
});
