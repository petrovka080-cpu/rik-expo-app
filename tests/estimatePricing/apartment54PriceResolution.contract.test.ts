import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";

const PROMPT = "Капитальный ремонт квартиры 54 кв метра";

function byCode(rows: NonNullable<ReturnType<typeof buildConsumerRepairAiDraft>["structuredEstimatePayload"]>["rows"], code: string) {
  return rows.find((row) => row.rowId.includes(code));
}

describe("apartment 54 price resolution contract", () => {
  it("prices core material rows from traceable sources and leaves no zero missing amount", () => {
    const payload = buildConsumerRepairAiDraft(PROMPT).structuredEstimatePayload;
    expect(payload).toBeTruthy();
    const rows = payload!.rows;

    for (const code of [
      "apartment_screed_dry_mix",
      "apartment_wall_plaster_mix",
      "apartment_base_putty",
      "apartment_finish_putty",
      "apartment_wall_primer",
      "apartment_wall_paint",
      "apartment_ceramic_tile_wet_zones",
      "apartment_tile_adhesive",
      "apartment_floor_baseboard",
      "apartment_socket_boxes",
      "apartment_sockets_switches",
      "apartment_material_delivery",
    ]) {
      const row = byCode(rows, code);
      expect(row?.priceTrace?.price_status).toBe("priced");
      expect(row?.priceTrace?.price_source_id).toBeTruthy();
      expect(row?.total).toBe(row?.priceTrace?.selected_amount);
    }

    expect(rows.filter((row) => row.priceTrace?.price_status === "missing").every((row) => row.total !== 0)).toBe(true);
    expect(payload!.boq.totals.missingPriceRowsCount).toBe(0);
    expect(payload!.boq.totals.allPricedRowsHaveSource).toBe(true);
  });
});
