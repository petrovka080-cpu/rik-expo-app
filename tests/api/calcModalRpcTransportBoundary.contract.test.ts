import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("S_AUDIT_BATTLE_98_CALC_MODAL_RPC_TRANSPORT_BOUNDARY", () => {
  it("keeps CalcModal UI/redaction ownership while routing calculation RPC through transport", () => {
    const modal = read("src/components/foreman/CalcModal.tsx");
    const controller = read("src/components/foreman/useCalcModalController.ts");
    const transport = read("src/components/foreman/calcModal.rpc.transport.ts");

    expect(modal).toContain("useCalcModalController");
    expect(modal).not.toContain("supabase.rpc(");
    expect(controller).toContain("runCalcWorkKitRpc");
    expect(controller).toContain("summarizeCalcModalPayloadForLog(payload)");
    expect(controller).toContain("redactSensitiveValue(error)");
    expect(controller).not.toContain("supabase.rpc(");

    expect(transport).toContain("export async function runCalcWorkKitRpc");
    expect(transport).toContain("supabase.rpc(\"rpc_calc_work_kit\"");
  });
});
