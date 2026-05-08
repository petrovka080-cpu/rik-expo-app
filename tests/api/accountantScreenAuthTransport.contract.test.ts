import fs from "fs";
import path from "path";
import {
  hasCurrentAccountantSessionUser,
  readCurrentAccountantAuthSession,
} from "../../src/screens/accountant/accountant.screen.auth.transport";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("accountant screen auth transport boundary", () => {
  it("keeps accountant screen session checks behind the transport boundary", () => {
    const controllerSource = read("src/screens/accountant/useAccountantScreenController.ts");
    const helpersSource = read("src/screens/accountant/helpers.tsx");
    const transportSource = read("src/screens/accountant/accountant.screen.auth.transport.ts");

    expect(controllerSource).toContain('from "./accountant.screen.auth.transport"');
    expect(controllerSource).not.toContain("supabase.auth.getSession");
    expect(helpersSource).toContain('from "./accountant.screen.auth.transport"');
    expect(helpersSource).not.toContain("supabase.auth.getSession");
    expect(helpersSource).not.toContain("catch {");
    expect(transportSource).toContain("supabase.auth.getSession");
    expect(transportSource).toContain("hasCurrentAccountantSessionUser");
    expect(transportSource).toContain("readCurrentAccountantAuthSession");
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

  it("preserves access token session reads for helper auth headers", async () => {
    const session = { access_token: "token-1", user: { id: "user-1" } };

    await expect(
      readCurrentAccountantAuthSession({
        readSession: async () => ({ data: { session } }),
      }),
    ).resolves.toBe(session);
  });
});
