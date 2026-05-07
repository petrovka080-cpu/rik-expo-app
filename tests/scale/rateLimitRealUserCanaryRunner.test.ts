import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("production real-user rate limit canary runner", () => {
  it("uses the shared server-auth resolver and category-only BFF error diagnostics", () => {
    const source = readProjectFile("scripts/rate_limit_real_user_canary.ts");

    expect(source).toContain("resolveProductionBusinessReadonlyCanaryServerAuthSecret");
    expect(source).toContain("classifyProductionBusinessReadonlyCanaryErrorCode");
    expect(source).toContain("readBffErrorCategory");
    expect(source).toContain("auth_resolution_status");
    expect(source).toContain("synthetic_private_smoke_error_category");
    expect(source).not.toContain("redacted_error_code_present");
    expect(source).not.toMatch(/console\.(log|warn|error|info)\([^)]*serverAuth/);
    expect(source).not.toMatch(/console\.(log|warn|error|info)\([^)]*response\.text/);
  });
});
