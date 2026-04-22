import type { Subcontract } from "../../src/screens/subcontracts/subcontracts.shared";
import { EMPTY_FORM } from "../../src/screens/foreman/hooks/foreman.subcontractController.model";
import {
  planSelectedSubcontractHydration,
  planSubcontractDraftReset,
  planSubcontractTotalPriceSync,
} from "../../src/screens/foreman/hooks/foreman.subcontractController.effects";

const approvedSubcontract: Subcontract = {
  id: "sub-1",
  created_at: "2026-04-01T10:00:00.000Z",
  status: "approved",
  foreman_name: "Foreman One",
  contractor_org: "Acme Build",
  contractor_inn: null,
  contractor_rep: null,
  contractor_phone: "+996700000001",
  contract_number: "CNT-1",
  contract_date: "2026-04-01",
  object_name: "Object A",
  work_zone: "Level 1",
  work_type: "Ventilation",
  qty_planned: 12,
  uom: "m2",
  date_start: "2026-04-05",
  date_end: "2026-04-30",
  work_mode: "mixed",
  price_per_unit: 100,
  total_price: 1200,
  price_type: "by_volume",
  foreman_comment: null,
  director_comment: null,
};

describe("foreman subcontract controller effect planners", () => {
  it("plans deterministic total-price synchronization without redundant updates", () => {
    expect(
      planSubcontractTotalPriceSync({
        qtyPlanned: "2",
        pricePerUnit: "3",
        totalPrice: "",
      }),
    ).toEqual({
      nextTotalPrice: "6",
      shouldUpdate: true,
    });

    expect(
      planSubcontractTotalPriceSync({
        qtyPlanned: "2",
        pricePerUnit: "3",
        totalPrice: "6",
      }),
    ).toEqual({
      nextTotalPrice: "6",
      shouldUpdate: false,
    });
  });

  it("plans reset semantics without mutating live controller state", () => {
    expect(planSubcontractDraftReset()).toEqual({
      requestId: "",
      displayNo: "",
      draftItems: [],
      activeDraftScopeKey: "",
      nextForm: null,
    });

    expect(planSubcontractDraftReset({ clearForm: true })).toEqual({
      requestId: "",
      displayNo: "",
      draftItems: [],
      activeDraftScopeKey: "",
      nextForm: EMPTY_FORM,
    });
  });

  it("hydrates selected subcontract into deterministic form and scope key", () => {
    const plan = planSelectedSubcontractHydration({
      currentForm: {
        ...EMPTY_FORM,
        objectCode: "OLD",
        levelCode: "OLD-LVL",
        systemCode: "OLD-SYS",
        zoneText: "Zone A",
      },
      item: approvedSubcontract,
      dicts: {
        objOptions: [{ code: "OBJ", name: "Object A" }],
        lvlOptions: [{ code: "L1", name: "Level 1" }],
        sysOptions: [{ code: "SYS", name: "Ventilation" }],
      },
    });

    expect(plan.nextForm).toMatchObject({
      objectCode: "OBJ",
      levelCode: "L1",
      systemCode: "SYS",
      zoneText: "Zone A",
    });
    expect(plan.nextScopeKey).toBe("sub-1|OBJ|L1|SYS|Zone A||");
  });
});
