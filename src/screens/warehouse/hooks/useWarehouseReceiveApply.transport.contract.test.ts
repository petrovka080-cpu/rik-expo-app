import { readFileSync } from "fs";
import { join } from "path";

import { scanDirectSupabaseBypasses } from "../../../../scripts/architecture_anti_regression_suite";
import { callWarehouseReceiveApplyRpc } from "./useWarehouseReceiveApply.transport";

const root = join(__dirname, "..", "..", "..", "..");
const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("warehouse receive apply transport boundary", () => {
  it("keeps receive apply service orchestration and validation out of provider ownership", () => {
    const service = read("src/screens/warehouse/hooks/useWarehouseReceiveApply.ts");

    expect(service).toContain("callWarehouseReceiveApplyRpc(supabase, {");
    expect(service).toContain("p_warehouseman_fio: warehousemanFio.trim()");
    expect(service).toContain('rpcName: "wh_receive_apply_ui"');
    expect(service).toContain("validateRpcResponse(data, isWarehouseReceiveApplyResult");
    expect(service).not.toContain('supabase.rpc("wh_receive_apply_ui"');
  });

  it("keeps the concrete receive apply RPC name and payload in transport", async () => {
    const rpcResult = {
      data: { ok: 1, fail: 0, left_after: 0 },
      error: null,
    };
    const rpc = jest.fn(async () => rpcResult);
    const supabase = { rpc } as never;
    const payload = {
      p_incoming_id: "incoming-1",
      p_items: [{ purchase_item_id: "purchase-item-1", qty: 2 }],
      p_client_mutation_id: "wrq-stable-1",
      p_warehouseman_fio: "Warehouse Tester",
      p_note: null,
    };

    const result = await callWarehouseReceiveApplyRpc(supabase, payload);

    expect(result).toBe(rpcResult);
    expect(rpc).toHaveBeenCalledWith("wh_receive_apply_ui", payload);
  });

  it("moves the scanner-owned RPC finding from service bypass to transport-controlled", () => {
    const findings = scanDirectSupabaseBypasses(root);
    const serviceFindings = findings.filter(
      (finding) => finding.file === "src/screens/warehouse/hooks/useWarehouseReceiveApply.ts",
    );
    const transportFindings = findings.filter(
      (finding) => finding.file === "src/screens/warehouse/hooks/useWarehouseReceiveApply.transport.ts",
    );

    expect(serviceFindings).toEqual([]);
    expect(transportFindings).toEqual([
      expect.objectContaining({
        classification: "transport_controlled",
        operation: "rpc",
        callTarget: "rpc:wh_receive_apply_ui",
      }),
    ]);
  });
});
