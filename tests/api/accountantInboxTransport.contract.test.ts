import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("accountant inbox transport boundary", () => {
  it("keeps accountant inbox RPC calls behind the transport boundary", () => {
    const serviceSource = read("src/screens/accountant/accountant.inbox.service.ts");
    const transportSource = read("src/screens/accountant/accountant.inbox.transport.ts");

    expect(serviceSource).toContain('from "./accountant.inbox.transport"');
    expect(serviceSource).toContain("callAccountantInboxScopeRpc");
    expect(serviceSource).not.toContain('supabase.rpc("accountant_inbox_scope_v1"');
    expect(serviceSource).toContain("validateRpcResponse");
    expect(serviceSource).toContain("filterProposalLinkedRowsByExistingProposalLinks");
    expect(serviceSource).toContain("trackRpcLatency");

    expect(transportSource).toContain('supabase.rpc("accountant_inbox_scope_v1"');
    expect(transportSource).toContain("callAccountantInboxScopeRpc");
    expect(transportSource).toContain("AccountantInboxScopeRpcArgs");
    expect(transportSource).not.toContain("validateRpcResponse");
    expect(transportSource).not.toContain("filterProposalLinkedRowsByExistingProposalLinks");
  });
});
