import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("sign-up auth transport boundary", () => {
  it("keeps signUp behind the auth transport boundary", () => {
    const routeSource = read("app/auth/register.tsx");
    const transportSource = read("src/lib/auth/signUp.transport.ts");

    expect(routeSource).toContain("../../src/lib/auth/signUp.transport");
    expect(routeSource).toContain("signUpWithEmailPassword");
    expect(routeSource).not.toContain("supabase.auth.signUp");
    expect(transportSource).toContain("supabase.auth.signUp");
    expect(transportSource).toContain("SignUpWithEmailPasswordParams");
  });

  it("preserves register route success and confirmation ownership", () => {
    const routeSource = read("app/auth/register.tsx");

    expect(routeSource).toContain("if (signError) throw signError");
    expect(routeSource).toContain("if (data.session)");
    expect(routeSource).toContain("router.replace(POST_AUTH_ENTRY_ROUTE)");
    expect(routeSource).toContain("setMessage(UI_COPY.confirmEmail)");
    expect(routeSource).toContain("catch (error: unknown)");
  });
});
