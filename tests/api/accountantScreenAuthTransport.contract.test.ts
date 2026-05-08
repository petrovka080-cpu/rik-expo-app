import fs from "fs";
import path from "path";
import {
  type AccountantAuthStateChangeCallback,
  type AccountantAuthStateSubscription,
  hasCurrentAccountantSessionUser,
  readCurrentAccountantAuthSession,
  subscribeAccountantAuthStateChange,
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
    expect(controllerSource).not.toContain("supabase.auth.onAuthStateChange");
    expect(controllerSource).not.toContain('from "../../lib/supabaseClient"');
    expect(controllerSource).toContain("subscribeAccountantAuthStateChange");
    expect(helpersSource).toContain('from "./accountant.screen.auth.transport"');
    expect(helpersSource).not.toContain("supabase.auth.getSession");
    expect(helpersSource).not.toContain("catch {");
    expect(transportSource).toContain("supabase.auth.getSession");
    expect(transportSource).toContain("supabase.auth.onAuthStateChange");
    expect(transportSource).toContain("hasCurrentAccountantSessionUser");
    expect(transportSource).toContain("readCurrentAccountantAuthSession");
    expect(transportSource).toContain("subscribeAccountantAuthStateChange");
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

  it("preserves auth state callback and unsubscribe ownership", () => {
    const unsubscribe = jest.fn();
    const subscription: AccountantAuthStateSubscription = {
      data: {
        subscription: {
          unsubscribe,
        },
      },
    };
    const observed: { callback?: AccountantAuthStateChangeCallback } = {};
    let observedHasUser = false;

    const result = subscribeAccountantAuthStateChange({
      onChange: (_event, session) => {
        observedHasUser = Boolean(session?.user);
      },
      subscribe: (callback) => {
        observed.callback = callback;
        return subscription;
      },
    });

    expect(result).toBe(subscription);
    if (!observed.callback) throw new Error("Missing accountant auth state callback");
    observed.callback("SIGNED_IN", { user: { id: "user-1" } });
    expect(observedHasUser).toBe(true);
    result.data.subscription.unsubscribe();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
