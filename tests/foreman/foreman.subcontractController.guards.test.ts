import type { ReqItemRow } from "../../src/lib/catalog_api";
import type { Subcontract } from "../../src/screens/subcontracts/subcontracts.shared";
import {
  guardDraftUser,
  guardPdfRequest,
  guardSendToDirector,
  guardTemplateContract,
  isSubcontractControllerGuardFailure,
} from "../../src/screens/foreman/hooks/foreman.subcontractController.guards";

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

const draftItems: ReqItemRow[] = [
  {
    id: "item-1",
    request_id: "req-1",
    rik_code: "R-1",
    name_human: "Cable",
    qty: 2,
    uom: "m",
    status: "draft",
    supplier_hint: null,
    app_code: null,
    note: null,
    line_no: 1,
  },
];

describe("foreman subcontract controller guards", () => {
  it("guards missing and unapproved template contracts deterministically", () => {
    const missing = guardTemplateContract(null);
    const unapproved = guardTemplateContract({ ...approvedSubcontract, status: "draft" });
    const approved = guardTemplateContract(approvedSubcontract);

    expect(isSubcontractControllerGuardFailure(missing)).toBe(true);
    expect(isSubcontractControllerGuardFailure(unapproved)).toBe(true);
    expect(missing).toMatchObject({ ok: false, reason: "missing_template" });
    expect(unapproved).toMatchObject({ ok: false, reason: "template_not_approved" });
    expect(approved).toEqual({ ok: true, subcontractId: "sub-1" });
  });

  it("guards missing user/request/draft inputs before controller side effects", () => {
    expect(guardDraftUser("")).toMatchObject({ ok: false, reason: "missing_user" });
    expect(guardPdfRequest("")).toMatchObject({ ok: false, reason: "missing_request" });
    expect(
      guardSendToDirector({
        templateContract: approvedSubcontract,
        requestId: "",
        draftItems,
      }),
    ).toMatchObject({ ok: false, reason: "missing_request" });
    expect(
      guardSendToDirector({
        templateContract: approvedSubcontract,
        requestId: "req-1",
        draftItems: [],
      }),
    ).toMatchObject({ ok: false, reason: "empty_draft" });
  });

  it("allows send/pdf flows only when required preconditions are satisfied", () => {
    expect(guardDraftUser("user-1")).toEqual({ ok: true });
    expect(guardPdfRequest("req-1")).toEqual({ ok: true, requestId: "req-1" });
    expect(
      guardSendToDirector({
        templateContract: approvedSubcontract,
        requestId: "req-1",
        draftItems,
      }),
    ).toEqual({ ok: true, subcontractId: "sub-1", requestId: "req-1" });
  });
});
