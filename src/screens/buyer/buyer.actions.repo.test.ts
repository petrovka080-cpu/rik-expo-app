import { publishRfq } from "./buyer.actions.repo";

describe("buyer.actions.repo", () => {
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

    expect(rpc).toHaveBeenCalledWith("buyer_rfq_create_and_publish_v1", payload);
    expect(result).toEqual({ data: "tender-1", error: null });
  });
});
