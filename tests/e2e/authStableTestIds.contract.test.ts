import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const read = (relativePath: string) =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("auth stable e2e test IDs", () => {
  const loginSource = read("app/auth/login.tsx");

  it("exposes stable IDs on the real login screen elements", () => {
    expect(loginSource).toContain('export default function LoginScreen()');
    expect(loginSource).toContain('testID="auth.login.screen"');
    expect(loginSource).toContain('testID="auth.login.email"');
    expect(loginSource).toContain('testID="auth.login.password"');
    expect(loginSource).toContain('testID="auth.login.submit"');
    expect(loginSource).toContain('testID="auth.login.error"');
    expect(loginSource).toContain('testID="auth.login.loading"');
    expect(loginSource).toContain("collapsable={false}");
  });

  it("keeps the existing auth behavior and does not add an e2e bypass", () => {
    expect(loginSource).toContain("signInSafe({");
    expect(loginSource).toContain("router.replace(POST_AUTH_ENTRY_ROUTE)");
    expect(loginSource).not.toContain("auth.admin");
    expect(loginSource).not.toContain("listUsers");
    expect(loginSource).not.toContain("service_role");
    expect(loginSource).not.toContain("E2E_");
    expect(loginSource).not.toContain("autoLogin");
    expect(loginSource).not.toContain("developer bypass");
  });

  it("does not introduce fake login source files", () => {
    const authFiles = fs.readdirSync(path.join(ROOT, "app", "auth"));
    expect(authFiles.filter((file) => /fake|mock|e2e|bypass/i.test(file))).toEqual([]);
  });
});
