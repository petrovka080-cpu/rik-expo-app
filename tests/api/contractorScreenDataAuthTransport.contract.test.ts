import fs from "fs";
import path from "path";
import { hasCurrentContractorSessionUser } from "../../src/screens/contractor/contractor.screenData.auth.transport";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("contractor screen data auth transport boundary", () => {
  it("keeps contractor screen session checks behind the transport boundary", () => {
    const hookSource = read("src/screens/contractor/hooks/useContractorScreenData.ts");
    const refreshLifecycleSource = read("src/screens/contractor/hooks/useContractorRefreshLifecycle.ts");
    const transportSource = read("src/screens/contractor/contractor.screenData.auth.transport.ts");

    expect(hookSource).toContain('from "../contractor.screenData.auth.transport"');
    expect(hookSource).not.toContain("auth.getSession");
    expect(refreshLifecycleSource).toContain('from "../contractor.screenData.auth.transport"');
    expect(refreshLifecycleSource).not.toContain("auth.getSession");
    expect(transportSource).toContain("auth.getSession");
    expect(transportSource).toContain("hasCurrentContractorSessionUser");
  });

  it("preserves session user presence semantics", async () => {
    await expect(
      hasCurrentContractorSessionUser({
        supabaseClient: {
          auth: {
            getSession: async () => ({ data: { session: { user: { id: "user-1" } } } }),
          },
        },
      }),
    ).resolves.toBe(true);

    await expect(
      hasCurrentContractorSessionUser({
        supabaseClient: {
          auth: {
            getSession: async () => ({ data: { session: null } }),
          },
        },
      }),
    ).resolves.toBe(false);
  });
});
