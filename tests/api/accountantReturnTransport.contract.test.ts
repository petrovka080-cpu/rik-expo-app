import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("accountant return transport boundary", () => {
  it("keeps fallback return RPC calls behind the transport boundary", () => {
    const serviceSource = read("src/screens/accountant/accountant.return.service.ts");
    const transportSource = read("src/screens/accountant/accountant.return.transport.ts");

    expect(serviceSource).toContain('from "./accountant.return.transport"');
    expect(serviceSource).not.toContain("../../lib/supabaseClient");
    expect(serviceSource).not.toContain("supabase.rpc");
    expect(serviceSource).toContain("validateRpcResponse");
    expect(serviceSource).toContain("isRpcVoidResponse");

    expect(transportSource).toContain('supabase.rpc("acc_return_min_auto"');
    expect(transportSource).toContain('supabase.rpc("proposal_return_to_buyer_min"');
    expect(transportSource).toContain("callAccReturnMinAutoRpc");
    expect(transportSource).toContain("callProposalReturnToBuyerMinRpc");
  });
});
