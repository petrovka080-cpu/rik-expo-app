import type { ReqItemRow } from "../../src/lib/catalog_api";
import type { RequestDraftSyncLineInput } from "../../src/screens/foreman/foreman.draftSync.repository";
import type { Subcontract } from "../../src/screens/subcontracts/subcontracts.shared";
import {
  EMPTY_FORM,
  appendLineInputsToDraftItems,
  deriveSubcontractControllerModel,
  filterActiveDraftItems,
  type FormState,
} from "../../src/screens/foreman/hooks/foreman.subcontractController.model";

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
  work_zone: "L1",
  work_type: "SYS",
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

const form: FormState = {
  ...EMPTY_FORM,
  objectCode: "OBJ",
  levelCode: "L1",
  systemCode: "SYS",
  zoneText: "A-12",
  contractorOrg: "Fallback Org",
  contractorPhone: "+996500000000",
  qtyPlanned: "7",
  uom: "pcs",
};

describe("foreman subcontract controller model", () => {
  it("derives approved history, visibility flags, and request meta deterministically", () => {
    const result = deriveSubcontractControllerModel({
      history: [
        approvedSubcontract,
        { ...approvedSubcontract, id: "sub-2", status: "draft" },
      ],
      selectedTemplateId: "sub-1",
      dicts: {
        objOptions: [{ code: "OBJ", name: "Object A" }],
        lvlOptions: [{ code: "L1", name: "Level 1" }],
        sysOptions: [{ code: "SYS", name: "Ventilation" }],
      },
      form,
      subcontractFlowOpen: true,
      subcontractFlowScreen: "details",
      foremanName: "Foreman One",
    });

    expect(result.templateContract?.id).toBe("sub-1");
    expect(result.approvedContracts.map((item) => item.id)).toEqual(["sub-1"]);
    expect(result.subcontractDetailsVisible).toBe(true);
    expect(result.catalogVisible).toBe(false);
    expect(result.requestMetaFromTemplate.subcontract_id).toBe("sub-1");
    expect(result.requestMetaPersistPatch.object_type_code).toBe("OBJ");
    expect(result.contractorName).toBe("Acme Build");
    expect(result.phoneName).toBe("+996700000001");
    expect(result.volumeText).toContain("12");
    expect(result.scopeNote).toContain("Object A");
    expect(result.scopeNote).toContain("A-12");
  });

  it("merges appended draft lines by rik/uom and preserves request ownership", () => {
    const currentItems: ReqItemRow[] = [
      {
        id: "remote-1",
        request_id: "req-1",
        rik_code: "R-1",
        name_human: "Cable",
        qty: 2,
        uom: "m",
        status: "draft",
        supplier_hint: null,
        app_code: null,
        note: "old",
        line_no: 1,
      },
    ];

    const newLines: RequestDraftSyncLineInput[] = [
      {
        rik_code: "R-1",
        qty: 3,
        uom: "m",
        name_human: "Cable",
        note: "merged",
        app_code: null,
      },
      {
        rik_code: "R-2",
        qty: 1,
        uom: "pcs",
        name_human: "Clip",
        note: null,
        app_code: null,
      },
    ];

    const result = appendLineInputsToDraftItems(currentItems, newLines, "req-1");

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      request_id: "req-1",
      rik_code: "R-1",
      qty: 5,
      note: "merged",
      line_no: 1,
    });
    expect(result[1]).toMatchObject({
      request_id: "req-1",
      rik_code: "R-2",
      qty: 1,
      uom: "pcs",
      line_no: 2,
    });
  });

  it("filters cancelled and canceled draft items without touching active rows", () => {
    const rows: ReqItemRow[] = [
      {
        id: "1",
        request_id: "req-1",
        rik_code: "R-1",
        name_human: "Active",
        qty: 1,
        uom: "pcs",
        status: "draft",
        supplier_hint: null,
        app_code: null,
        note: null,
        line_no: 1,
      },
      {
        id: "2",
        request_id: "req-1",
        rik_code: "R-2",
        name_human: "Cancelled",
        qty: 1,
        uom: "pcs",
        status: "cancelled",
        supplier_hint: null,
        app_code: null,
        note: null,
        line_no: 2,
      },
      {
        id: "3",
        request_id: "req-1",
        rik_code: "R-3",
        name_human: "Canceled",
        qty: 1,
        uom: "pcs",
        status: "canceled",
        supplier_hint: null,
        app_code: null,
        note: null,
        line_no: 3,
      },
    ];

    expect(filterActiveDraftItems(rows).map((item) => item.id)).toEqual(["1"]);
  });
});
