import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(__dirname, "../..");

function readProjectFile(relativePath: string) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("entry/bootstrap contract", () => {
  it("routes every post-auth entry through the profile access hub", () => {
    const rootLayout = readProjectFile("app/_layout.tsx");
    const indexScreen = readProjectFile("app/index.tsx");
    const loginScreen = readProjectFile("app/auth/login.tsx");
    const registerScreen = readProjectFile("app/auth/register.tsx");

    expect(rootLayout).toContain("POST_AUTH_ENTRY_ROUTE");
    expect(rootLayout).not.toContain('router.replace("/")');

    expect(indexScreen).toContain("POST_AUTH_ENTRY_ROUTE");
    expect(indexScreen).not.toContain("resolveCurrentSessionRole");
    expect(indexScreen).not.toContain("postAuthPathForRole");

    expect(loginScreen).toContain("POST_AUTH_ENTRY_ROUTE");
    expect(loginScreen).not.toContain("resolveCurrentSessionRole");
    expect(loginScreen).not.toContain("postAuthPathForRole");

    expect(registerScreen).toContain("POST_AUTH_ENTRY_ROUTE");
    expect(registerScreen).not.toContain("resolveCurrentSessionRole");
    expect(registerScreen).not.toContain("postAuthPathForRole");
  });
});
