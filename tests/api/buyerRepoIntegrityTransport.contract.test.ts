import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("buyer repo proposal integrity transport boundary", () => {
  it("routes proposal request-item integrity RPC through the shared typed transport", () => {
    const repoSource = read("src/screens/buyer/buyer.repo.ts");
    const transportSource = read("src/lib/api/integrity.guards.transport.ts");

    expect(repoSource).toContain('from "../../lib/api/integrity.guards.transport"');
    expect(repoSource).toContain("callProposalRequestItemIntegrityRpc(supabase, pid)");
    expect(repoSource).not.toContain('supabase.rpc("proposal_request_item_integrity_v1"');

    expect(repoSource).toContain(
      "validateRpcResponse(rpc.data, isProposalRequestItemIntegrityRpcResponse",
    );
    expect(repoSource).toContain('rpcName: "proposal_request_item_integrity_v1"');
    expect(repoSource).toContain(
      'caller: "src/screens/buyer/buyer.repo.repoGetProposalRequestItemIntegrity"',
    );

    expect(transportSource).toContain(
      'supabaseClient.rpc("proposal_request_item_integrity_v1"',
    );
    expect(transportSource).toContain("p_proposal_id: proposalId");
    expect(transportSource).not.toContain("validateRpcResponse");
  });
});
