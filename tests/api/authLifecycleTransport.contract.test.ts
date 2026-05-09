import fs from "fs";
import path from "path";

const repoRoot = path.resolve(__dirname, "..", "..");
const lifecyclePath = path.join(repoRoot, "src", "lib", "auth", "useAuthLifecycle.ts");
const transportPath = path.join(
  repoRoot,
  "src",
  "lib",
  "auth",
  "useAuthLifecycle.auth.transport.ts",
);

describe("auth lifecycle transport boundary", () => {
  const lifecycleSource = fs.readFileSync(lifecyclePath, "utf8");
  const transportSource = fs.readFileSync(transportPath, "utf8");

  it("moves the concrete auth provider subscription into transport", () => {
    expect(lifecycleSource).toContain("./useAuthLifecycle.auth.transport");
    expect(lifecycleSource).toContain("subscribeAuthLifecycleStateChange(");
    expect(lifecycleSource).toContain("hasAuthLifecycleClient()");
    expect(lifecycleSource).not.toMatch(/\bsupabase\.auth\.onAuthStateChange\b/);
    expect(lifecycleSource).not.toContain("import { getSessionSafe, supabase }");

    expect(transportSource).toContain('import { supabase } from "../supabaseClient";');
    expect(transportSource).toContain("supabase.auth.onAuthStateChange(callback)");
  });

  it("keeps lifecycle behavior, observability, and cleanup in the service hook", () => {
    expect(lifecycleSource).toContain("recordPlatformObservability");
    expect(lifecycleSource).toContain("resetSessionBoundary");
    expect(lifecycleSource).toContain("setAuthSessionState");
    expect(lifecycleSource).toContain("listener?.subscription?.unsubscribe()");

    expect(transportSource).not.toContain("recordPlatformObservability");
    expect(transportSource).not.toContain("resetSessionBoundary");
    expect(transportSource).not.toContain("setAuthSessionState");
  });
});
