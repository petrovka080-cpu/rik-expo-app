import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("current profile identity auth transport boundary", () => {
  it("keeps current profile identity session lookup behind the transport boundary", () => {
    const identitySource = read("src/features/profile/currentProfileIdentity.ts");
    const transportSource = read("src/features/profile/currentProfileIdentity.auth.transport.ts");

    expect(identitySource).toContain('from "./currentProfileIdentity.auth.transport"');
    expect(identitySource).not.toContain("supabase.auth.getSession");
    expect(identitySource).not.toContain("../../lib/supabaseClient");
    expect(transportSource).toContain("supabase.auth.getSession");
    expect(transportSource).toContain("loadCurrentProfileIdentityAuthUser");
  });
});
