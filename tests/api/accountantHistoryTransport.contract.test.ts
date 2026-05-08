import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("accountant history transport boundary", () => {
  it("keeps accountant history RPC calls behind the transport boundary", () => {
    const serviceSource = read("src/screens/accountant/accountant.history.service.ts");
    const transportSource = read("src/screens/accountant/accountant.history.transport.ts");

    expect(serviceSource).toContain('from "./accountant.history.transport"');
    expect(serviceSource).not.toContain('supabase.rpc("list_accountant_payments_history_v2"');
    expect(serviceSource).not.toContain('supabase.rpc("accountant_history_scope_v1"');
    expect(serviceSource).toContain("filterPaymentRowsByExistingPaymentProposalLinks");
    expect(serviceSource).toContain("validateRpcResponse");

    expect(transportSource).toContain('supabase.rpc("list_accountant_payments_history_v2"');
    expect(transportSource).toContain('supabase.rpc("accountant_history_scope_v1"');
    expect(transportSource).toContain("callListAccountantPaymentsHistoryRpc");
    expect(transportSource).toContain("callAccountantHistoryScopeRpc");
  });
});
