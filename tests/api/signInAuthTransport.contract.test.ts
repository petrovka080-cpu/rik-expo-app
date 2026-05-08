import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("sign-in auth transport boundary", () => {
  it("keeps signInWithPassword behind the auth transport boundary", () => {
    const signInSafeSource = read("src/lib/auth/signInSafe.ts");
    const transportSource = read("src/lib/auth/signIn.transport.ts");

    expect(signInSafeSource).toContain("./signIn.transport");
    expect(signInSafeSource).toContain("signInWithEmailPassword");
    expect(signInSafeSource).not.toContain("supabase.auth.signInWithPassword");
    expect(transportSource).toContain("supabase.auth.signInWithPassword");
    expect(transportSource).toContain("SignInWithEmailPasswordParams");
  });

  it("preserves sign-in safe ownership of normalization and degraded errors", () => {
    const signInSafeSource = read("src/lib/auth/signInSafe.ts");

    expect(signInSafeSource).toContain("const normalizedEmail");
    expect(signInSafeSource).toContain("LOGIN_NETWORK_DEGRADED_MESSAGE");
    expect(signInSafeSource).toContain("login_submit_degraded_timeout");
    expect(signInSafeSource).toContain("catch (error)");
    expect(signInSafeSource).toContain("isTimeoutLikeError(error)");
  });
});
