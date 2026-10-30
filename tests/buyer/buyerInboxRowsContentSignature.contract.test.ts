import {
  buildBuyerInboxRowsContentSignature,
} from "../../src/screens/buyer/hooks/useBuyerLoadingController";
import type { BuyerInboxRow } from "../../src/lib/api/types";

const baseRow: BuyerInboxRow = {
  request_id: "req-1",
  request_item_id: "item-1",
  rik_code: "RIK-1",
  name_human: "Material",
  qty: 1,
  uom: "pcs",
  object_name: null,
  status: "approved",
};

describe("buyer inbox rows content signature", () => {
  it("changes when request context changes without changing row count", () => {
    const staleRows = [{ ...baseRow }];
    const enrichedRows = [
      {
        ...baseRow,
        request_no: "REQ-0660/2026",
        object_name: "Administrative building",
        level_code: "LVL-01",
        system_code: "SYS-EL",
        zone_code: "ZONE-101",
        request_note: "Foreman context persisted",
      },
    ];

    expect(staleRows).toHaveLength(enrichedRows.length);
    expect(buildBuyerInboxRowsContentSignature(staleRows)).not.toBe(
      buildBuyerInboxRowsContentSignature(enrichedRows),
    );
  });
});
