import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("SecurityScreen MFA auth transport boundary", () => {
  it("keeps Supabase MFA calls in a transport-owned boundary", () => {
    const screenSource = read("src/screens/security/SecurityScreen.tsx");
    const transportSource = read("src/screens/security/SecurityScreen.auth.transport.ts");

    expect(screenSource).toContain("SecurityScreen.auth.transport");
    expect(screenSource).not.toContain("../../lib/supabaseClient");
    expect(screenSource).not.toContain("supabase.auth.mfa");

    expect(transportSource).toContain("../../lib/supabaseClient");
    expect(transportSource).toContain("supabase.auth.mfa.enroll");
    expect(transportSource).toContain("supabase.auth.mfa.challenge");
    expect(transportSource).toContain("supabase.auth.mfa.verify");
    expect(transportSource).toContain("supabase.auth.mfa.unenroll");
    expect(transportSource).toContain('factorType: "totp"');
  });
});
