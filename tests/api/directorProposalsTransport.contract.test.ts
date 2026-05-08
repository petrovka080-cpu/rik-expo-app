import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("director proposals transport boundary", () => {
  it("keeps pending proposal RPC calls behind the transport boundary", () => {
    const repoSource = read("src/screens/director/director.proposals.repo.ts");
    const transportSource = read("src/screens/director/director.proposals.transport.ts");

    expect(repoSource).toContain('from "./director.proposals.transport"');
    expect(repoSource).toContain("callDirectorPendingProposalsScopeRpc(args.supabase, rpcArgs)");
    expect(repoSource).not.toContain('args.supabase.rpc("director_pending_proposals_scope_v1"');
    expect(repoSource).toContain("validateRpcResponse");
    expect(repoSource).toContain("adaptDirectorProposalScopeEnvelope");
    expect(repoSource).toContain("beginPlatformObservability");

    expect(transportSource).toContain('supabase.rpc("director_pending_proposals_scope_v1"');
    expect(transportSource).toContain("callDirectorPendingProposalsScopeRpc");
    expect(transportSource).toContain("DirectorPendingProposalsScopeV1Args");
    expect(transportSource).not.toContain("validateRpcResponse");
    expect(transportSource).not.toContain("beginPlatformObservability");
  });
});
