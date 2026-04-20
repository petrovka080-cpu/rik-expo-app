import {
  publishRfq,
  setRequestItemsDirectorStatus,
  setRequestItemsDirectorStatusFallback,
} from "./buyer.actions.repo";

describe("buyer.actions.repo", () => {
  it("sets director status through the server-owned RPC contract", async () => {
    const rpc = jest.fn(async () => ({ data: null, error: null }));
    const supabase = { rpc } as never;

    const result = await setRequestItemsDirectorStatus(supabase, [
      "ri-1",
      "ri-2",
    ]);

    expect(rpc).toHaveBeenCalledWith("request_items_set_status", {
      p_request_item_ids: ["ri-1", "ri-2"],
      p_status: "У директора",
    });
    expect(result).toEqual({ data: null, error: null });
  });

  it("blocks the legacy direct request_items status fallback", async () => {
    const inMock = jest.fn(async () => ({ data: null, error: null }));
    const update = jest.fn(() => ({ in: inMock }));
    const from = jest.fn(() => ({ update }));
    const supabase = { from } as never;

    await expect(
      setRequestItemsDirectorStatusFallback(supabase, ["ri-1"]),
    ).rejects.toThrow("request_items_set_status RPC is required");

    expect(from).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(inMock).not.toHaveBeenCalled();
  });

  it("publishes RFQ through the current-schema RPC contract", async () => {
    const rpc = jest.fn(async () => ({ data: "tender-1", error: null }));
    const supabase = { rpc } as never;

    const payload = {
      p_request_item_ids: ["ri-1"],
      p_deadline_at: "2026-04-05T10:00:00.000Z",
      p_contact_phone: "+996555000111",
      p_contact_email: "buyer@example.com",
      p_contact_whatsapp: null,
      p_delivery_days: 2,
      p_radius_km: null,
      p_visibility: "open" as const,
      p_city: "Bishkek",
      p_lat: null,
      p_lng: null,
      p_address_text: "Main street",
      p_address_place_id: null,
      p_note: "note",
    };

    const result = await publishRfq(supabase, payload);

    expect(rpc).toHaveBeenCalledWith(
      "buyer_rfq_create_and_publish_v1",
      payload,
    );
    expect(result).toEqual({ data: "tender-1", error: null });
  });
});
