import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("S_AUDIT_BATTLE_103_DIRECTOR_RETURN_TRANSPORT_BOUNDARY", () => {
  it("keeps director return validation in service while routing the RPC through transport", () => {
    const service = read("src/lib/api/director.ts");
    const transport = read("src/lib/api/director.return.transport.ts");

    expect(service).toContain('from "./director.return.transport"');
    expect(service).toContain("callDirectorReturnMinAutoRpc(args)");
    expect(service).toContain("validateRpcResponse");
    expect(service).toContain("isRpcVoidResponse");
    expect(service).not.toContain("../supabaseClient");
    expect(service).not.toContain('supabase.rpc("director_return_min_auto"');

    expect(transport).toContain('supabase.rpc("director_return_min_auto"');
    expect(transport).toContain("callDirectorReturnMinAutoRpc");
  });
});
