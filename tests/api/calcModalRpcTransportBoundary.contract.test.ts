import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("S_AUDIT_BATTLE_98_CALC_MODAL_RPC_TRANSPORT_BOUNDARY", () => {
  it("keeps CalcModal UI/redaction ownership while routing calculation RPC through transport", () => {
    const modal = read("src/components/foreman/CalcModal.tsx");
    const transport = read("src/components/foreman/calcModal.rpc.transport.ts");

    expect(modal).toContain("runCalcWorkKitRpc");
    expect(modal).toContain("summarizeCalcModalPayloadForLog(payload)");
    expect(modal).toContain("redactSensitiveValue(error)");
    expect(modal).not.toContain("supabase.rpc(");

    expect(transport).toContain("export async function runCalcWorkKitRpc");
    expect(transport).toContain("supabase.rpc(\"rpc_calc_work_kit\"");
  });
});
