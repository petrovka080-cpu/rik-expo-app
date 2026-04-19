import { applyWarehouseReceive } from "../../src/screens/warehouse/hooks/useWarehouseReceiveApply";

describe("applyWarehouseReceive", () => {
  it("passes a stable client mutation id to the warehouse receive RPC", async () => {
    const rpc = jest.fn(async () => ({
      data: { ok: 1, fail: 0, left_after: 0 },
      error: null,
    }));

    const result = await applyWarehouseReceive({
      supabase: { rpc } as never,
      incomingId: "incoming-1",
      items: [{ purchase_item_id: "purchase-item-1", qty: 2 }],
      warehousemanFio: "  Warehouse Tester  ",
      clientMutationId: "wrq-stable-1",
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ ok: 1, fail: 0, left_after: 0 });
    expect(rpc).toHaveBeenCalledWith("wh_receive_apply_ui", {
      p_incoming_id: "incoming-1",
      p_items: [{ purchase_item_id: "purchase-item-1", qty: 2 }],
      p_client_mutation_id: "wrq-stable-1",
      p_warehouseman_fio: "Warehouse Tester",
      p_note: null,
    });
  });
});
