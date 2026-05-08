import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("S_AUDIT_BATTLE_106_PROPOSALS_TRANSPORT_BOUNDARY", () => {
  it("keeps proposal item validation and fallback in service while routing the direct RPC through transport", () => {
    const service = read("src/lib/api/proposals.ts");
    const transport = read("src/lib/api/proposals.transport.ts");

    expect(service).toContain('from "./proposals.transport"');
    expect(service).toContain("callProposalItemsForWebRpc(proposalId)");
    expect(service).toContain("validateRpcResponse(result.data, isProposalItemsForWebRpcResponse");
    expect(service).toContain('rpcName: "proposal_items_for_web"');
    expect(service).toContain('"rpc:proposal_items_for_web"');
    expect(service).not.toContain("../supabaseClient");
    expect(service).not.toMatch(/\bsupabase\s*\./);

    expect(transport).toContain('from "../supabaseClient"');
    expect(transport).toContain('supabase.rpc("proposal_items_for_web"');
    expect(transport).toContain("p_id: proposalId");
  });
});
