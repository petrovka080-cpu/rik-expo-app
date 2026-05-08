import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("S_AUDIT_BATTLE_96_CORE_RPC_COMPAT_TRANSPORT_BOUNDARY", () => {
  it("keeps rpcCompat fallback logic in core while routing Supabase RPC execution through transport", () => {
    const core = read("src/lib/api/_core.ts");
    const transport = read("src/lib/api/_core.transport.ts");

    expect(core).toContain("runRpcCompatTransportVariant");
    expect(core).toContain("classifyRpcCompatError");
    expect(core).not.toContain("supabase.rpc(");
    expect(transport).toContain("export async function runRpcCompatTransportVariant");
    expect(transport).toContain("supabase.rpc(variant.fn");
    expect(transport).toContain("RpcCompatTransportResult");
  });
});
