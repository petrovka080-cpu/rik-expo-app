import fs from "fs";
import path from "path";
import {
  hasCurrentContractorSessionUser,
  listenForContractorAuthStateChanges,
  type ContractorAuthStateChangeCallback,
} from "../../src/screens/contractor/contractor.screenData.auth.transport";

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
    expect(refreshLifecycleSource).toContain("listenForContractorAuthStateChanges({");
    expect(refreshLifecycleSource).not.toContain("auth.onAuthStateChange");
    expect(transportSource).toContain("auth.getSession");
    expect(transportSource).toContain("auth.onAuthStateChange");
    expect(transportSource).toContain("hasCurrentContractorSessionUser");
    expect(transportSource).toContain("listenForContractorAuthStateChanges");
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

  it("preserves auth state listener subscription semantics", () => {
    const callbacks: ContractorAuthStateChangeCallback[] = [];
    const unsubscribe = jest.fn();
    const observed: string[] = [];

    const result = listenForContractorAuthStateChanges({
      supabaseClient: {
        auth: {
          onAuthStateChange: (callback) => {
            callbacks.push(callback);
            return {
              data: {
                subscription: {
                  unsubscribe,
                },
              },
            };
          },
        },
      },
      onChange: (event, session) => {
        observed.push(`${event}:${Boolean(session?.user)}`);
      },
    });

    expect(callbacks).toHaveLength(1);
    callbacks[0]?.("SIGNED_IN", { user: { id: "user-1" } });
    callbacks[0]?.("SIGNED_OUT", null);
    expect(observed).toEqual(["SIGNED_IN:true", "SIGNED_OUT:false"]);
    expect(result.data.subscription.unsubscribe).toBe(unsubscribe);
  });
});
