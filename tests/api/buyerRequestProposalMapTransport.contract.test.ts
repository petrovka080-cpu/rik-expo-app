import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("buyer request proposal map transport boundary", () => {
  it("keeps resolve_req_pr_map behind the transport boundary", () => {
    const serviceSource = read("src/screens/buyer/hooks/useBuyerRequestProposalMap.ts");
    const transportSource = read("src/screens/buyer/hooks/useBuyerRequestProposalMap.transport.ts");

    expect(serviceSource).toContain('from "./useBuyerRequestProposalMap.transport"');
    expect(serviceSource).toContain("callBuyerRequestProposalMapRpc");
    expect(serviceSource).not.toContain("../../../lib/supabaseClient");
    expect(serviceSource).not.toContain('supabase.rpc("resolve_req_pr_map"');
    expect(serviceSource).toContain("validateRpcResponse");
    expect(serviceSource).toContain("isBuyerRequestProposalMapRpcResponse");
    expect(serviceSource).toContain('rpcName: "resolve_req_pr_map"');

    expect(transportSource).toContain("../../../lib/supabaseClient");
    expect(transportSource).toContain('supabase.rpc("resolve_req_pr_map"');
    expect(transportSource).toContain("BuyerRequestProposalMapRpcArgs");
    expect(transportSource).not.toContain("validateRpcResponse");
    expect(transportSource).not.toContain("isBuyerRequestProposalMapRpcResponse");
  });
});
