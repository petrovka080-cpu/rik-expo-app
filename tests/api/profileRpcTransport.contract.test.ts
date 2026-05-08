import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("profile RPC transport boundary", () => {
  it("keeps profile RPC calls behind the transport boundary", () => {
    const serviceSource = read("src/lib/api/profile.ts");
    const transportSource = read("src/lib/api/profile.transport.ts");

    expect(serviceSource).toContain('from "./profile.transport"');
    expect(serviceSource).not.toContain("../supabaseClient");
    expect(serviceSource).not.toContain("supabase.rpc");
    expect(serviceSource).toContain("validateRpcResponse");
    expect(serviceSource).toContain("isEnsureMyProfileRpcResponse");
    expect(serviceSource).toContain("isGetMyRoleRpcResponse");

    expect(transportSource).toContain('supabase.rpc("ensure_my_profile")');
    expect(transportSource).toContain('supabase.rpc("get_my_role")');
    expect(transportSource).toContain("callEnsureMyProfileRpc");
    expect(transportSource).toContain("callGetMyRoleRpc");
  });
});
