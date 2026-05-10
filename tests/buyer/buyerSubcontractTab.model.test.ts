import {
  buildBuyerSubcontractPatch,
  buyerSubcontractToFormState,
} from "../../src/screens/buyer/BuyerSubcontractTab.model";
import type { BuyerSubcontractFormState } from "../../src/screens/buyer/buyerSubcontractForm.model";
import type { Subcontract } from "../../src/screens/subcontracts/subcontracts.shared";

describe("BuyerSubcontractTab model", () => {
  it("builds a normalized patch without widening subcontract semantics", () => {
    const form: BuyerSubcontractFormState = {
      contractorOrg: "  ООО Ремонт  ",
      contractorInn: "123-456",
      contractorRep: "  Иван  ",
      contractorPhone: "0555 111 222",
      foremanName: "",
      contractNumber: " A-1 ",
      contractDate: "2026-05-11",
      objectName: "Башня",
      workZone: "2 этаж",
      workType: "Монтаж",
      qtyPlanned: "2,5",
      uom: "м2",
      dateStart: "2026-05-12",
      dateEnd: "2026-05-13",
      workMode: "turnkey",
      pricePerUnit: "100",
      totalPrice: "250",
      priceType: "by_volume",
      foremanComment: "  срочно  ",
    };

    expect(buildBuyerSubcontractPatch(form, "Buyer FIO")).toMatchObject({
      foreman_name: "Buyer FIO",
      contractor_org: "ООО Ремонт",
      contractor_inn: "123456",
      contractor_rep: "Иван",
      contractor_phone: "996555111222",
      contract_number: "A-1",
      qty_planned: 2.5,
      price_per_unit: 100,
      total_price: 250,
      work_mode: "turnkey",
      price_type: "by_volume",
      foreman_comment: "срочно",
    });
  });

  it("maps editable subcontract rows back into form state", () => {
    const row: Subcontract = {
      id: "sub-1",
      created_at: "2026-05-11T00:00:00Z",
      status: "draft",
      foreman_name: "Foreman",
      contractor_org: "Org",
      contractor_inn: "123",
      contractor_rep: "Rep",
      contractor_phone: "996555111222",
      contract_number: "N-1",
      contract_date: "2026-05-11",
      object_name: "Object",
      work_zone: "Zone",
      work_type: "Work",
      qty_planned: 7,
      uom: "m2",
      date_start: "2026-05-12",
      date_end: "2026-05-13",
      work_mode: "mixed",
      price_per_unit: 10,
      total_price: 70,
      price_type: "by_hour",
      foreman_comment: "Comment",
      director_comment: null,
    };

    expect(buyerSubcontractToFormState(row)).toMatchObject({
      contractorOrg: "Org",
      qtyPlanned: "7",
      pricePerUnit: "10",
      totalPrice: "70",
      workMode: "mixed",
      priceType: "by_hour",
    });
  });
});
