import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("S_AUDIT_BATTLE_107_INTEGRITY_GUARDS_TRANSPORT_BOUNDARY", () => {
  it("keeps proposal request-item guard validation in service while routing the RPC through transport", () => {
    const service = read("src/lib/api/integrity.guards.ts");
    const transport = read("src/lib/api/integrity.guards.transport.ts");

    expect(service).toContain('from "./integrity.guards.transport"');
    expect(service).toContain("callProposalRequestItemIntegrityRpc(");
    expect(service).toContain("validateRpcResponse(result.data, isProposalRequestItemIntegrityRpcResponse");
    expect(service).toContain('rpcName: "proposal_request_item_integrity_v1"');
    expect(service).not.toContain('supabaseClient.rpc("proposal_request_item_integrity_v1"');

    expect(transport).toContain('from "@supabase/supabase-js"');
    expect(transport).toContain('supabaseClient.rpc("proposal_request_item_integrity_v1"');
    expect(transport).toContain("p_proposal_id: proposalId");
  });
});
