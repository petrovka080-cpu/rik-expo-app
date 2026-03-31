import {
  renderDirectorFinancePdfHtml,
  renderDirectorManagementReportPdfHtml,
  renderDirectorProductionReportPdfHtml,
  renderDirectorSubcontractReportPdfHtml,
  renderDirectorSupplierSummaryPdfHtml,
} from "./pdf.director.templates";
import {
  buildWarehouseIncomingFormHtml,
  buildWarehouseIncomingMaterialsReportHtml,
  buildWarehouseIssueFormHtml,
  buildWarehouseMaterialsReportHtml,
  buildWarehouseObjectWorkReportHtml,
} from "./pdf.warehouse";

describe("pdf layer decomposition public contracts", () => {
  it("keeps warehouse issue/incoming builders rendering html shells", () => {
    const issueHtml = buildWarehouseIssueFormHtml({
      head: {
        issue_id: "issue-1",
        issue_no: "ISS-001",
        event_dt: "2026-03-31T10:00:00.000Z",
        kind: "REQ",
        who: "Warehouse User",
        display_no: "REQ-001",
      },
      lines: [
        {
          issue_id: "issue-1",
          rik_code: "MAT-001",
          item_name_ru: "Cement",
          qty_total: 3,
          qty_in_req: 3,
          qty_over: 0,
          uom: "kg",
        },
      ],
      orgName: "RIK",
      warehouseName: "Main Warehouse",
    });

    const incomingHtml = buildWarehouseIncomingFormHtml({
      incoming: {
        incoming_id: "incoming-1",
        display_no: "INC-001",
        event_dt: "2026-03-31T10:00:00.000Z",
        who: "Warehouse User",
        note: "Delivery note",
      },
      lines: [
        {
          purchase_item_id: "purchase-item-1",
          material_name: "Pipe",
          qty_received: 5,
          uom: "pcs",
        },
      ],
      orgName: "RIK",
      warehouseName: "Main Warehouse",
    });

    expect(issueHtml).toContain("<!doctype html>");
    expect(issueHtml).toContain("ISS-001");
    expect(issueHtml).toContain("Cement");
    expect(incomingHtml).toContain("<!doctype html>");
    expect(incomingHtml).toContain("INC-001");
    expect(incomingHtml).toContain("Pipe");
  });

  it("keeps warehouse analytics families rendering their data rows", () => {
    const materialsHtml = buildWarehouseMaterialsReportHtml({
      periodFrom: "2026-03-01",
      periodTo: "2026-03-31",
      orgName: "RIK",
      warehouseName: "Main Warehouse",
      rows: [
        {
          material_code: "MAT-001",
          material_name: "Concrete",
          uom: "m3",
          sum_in_req: 7,
          sum_free: 1,
          sum_over: 0,
          sum_total: 8,
          docs_cnt: 2,
          lines_cnt: 3,
        },
      ],
      docsTotal: 2,
      docsByReq: 2,
      docsWithoutReq: 0,
    });

    const objectWorkHtml = buildWarehouseObjectWorkReportHtml({
      periodFrom: "2026-03-01",
      periodTo: "2026-03-31",
      orgName: "RIK",
      warehouseName: "Main Warehouse",
      rows: [
        {
          object_id: "object-1",
          object_name: "Object A",
          work_name: "Foundation",
          docs_cnt: 2,
          req_cnt: 2,
          active_days: 3,
          uniq_materials: 4,
          recipients_text: "Foreman A",
          top3_materials: "Concrete",
        },
      ],
      docsTotal: 2,
    });

    const incomingMaterialsHtml = buildWarehouseIncomingMaterialsReportHtml({
      periodFrom: "2026-03-01",
      periodTo: "2026-03-31",
      orgName: "RIK",
      warehouseName: "Main Warehouse",
      rows: [
        {
          material_code: "MAT-002",
          material_name: "Steel",
          uom: "kg",
          sum_total: 11,
        },
      ],
      docsTotal: 3,
    });

    expect(materialsHtml).toContain("Concrete");
    expect(objectWorkHtml).toContain("Object A");
    expect(objectWorkHtml).toContain("Foundation");
    expect(incomingMaterialsHtml).toContain("Steel");
  });

  it("keeps director finance and management families rendering stable html", () => {
    const financeHtml = renderDirectorFinancePdfHtml({
      rowsJson: JSON.stringify([{ supplier: "Supplier A", amount: 1000 }], null, 2),
    });

    const managementHtml = renderDirectorManagementReportPdfHtml({
      topN: 5,
      periodText: "01.03.2026 → 31.03.2026",
      totalApproved: 1000,
      totalPaid: 500,
      totalDebt: 500,
      overdueSum: 200,
      criticalSum: 100,
      totalOverpay: 0,
      top3Text: "Supplier A",
      unpaidCount: 1,
      partialCount: 0,
      paidCount: 0,
      debtSupplierRows: [
        {
          supplier: "Supplier A",
          debt: 500,
          overdue: 200,
          critical: 100,
          invoices: 1,
          riskLabel: "Critical",
          riskClassName: "tag crit",
          showRisk: true,
        },
      ],
      kindRows: [{ kind: "Materials", approved: 1000, paid: 500, overpay: 0 }],
      spendSupplierRows: [{ supplier: "Supplier A", approved: 1000, paid: 500, rest: 500 }],
      problemRows: [
        {
          supplier: "Supplier A",
          title: "Invoice 1",
          amount: 1000,
          paid: 500,
          rest: 500,
          riskLabel: "Critical",
          riskClassName: "tag crit",
          datesText: "approved 01.03.2026",
        },
      ],
    });

    expect(financeHtml).toContain("<!doctype html>");
    expect(financeHtml).toContain("Supplier A");
    expect(managementHtml).toContain("<!doctype html>");
    expect(managementHtml).toContain("Supplier A");
    expect(managementHtml).toContain("Invoice 1");
  });

  it("keeps director supplier, production, and subcontract families rendering stable html", () => {
    const supplierHtml = renderDirectorSupplierSummaryPdfHtml({
      supplier: "Supplier A",
      periodText: "01.03.2026 → 31.03.2026",
      kindFilter: null,
      totalApproved: 1000,
      totalPaid: 500,
      totalRest: 500,
      countAll: 1,
      countUnpaid: 1,
      countPartial: 0,
      countPaid: 0,
      kindRows: [{ kind: "Materials", approved: 1000, paid: 500, overpay: 0 }],
      detailRows: [
        {
          title: "Invoice 1",
          amount: 1000,
          paid: 500,
          rest: 500,
          status: "Unpaid",
          statusClassName: "tag bad",
          overpay: 0,
          datesText: "approved 01.03.2026",
        },
      ],
    });

    const productionHtml = renderDirectorProductionReportPdfHtml({
      companyName: "RIK",
      generatedBy: "Director",
      periodText: "01.03.2026 → 31.03.2026",
      objectName: "Object A",
      generatedAt: "31.03.2026 10:00",
      worksRows: [
        {
          workTypeName: "Foundation",
          totalPositions: 5,
          reqPositions: 4,
          freePositions: 1,
          totalDocs: 2,
          isWithoutWork: false,
        },
      ],
      rowsLimitedNote: "",
      objectRows: [{ obj: "Object A", docs: 2, positions: 5, noReq: 1, noWork: 0 }],
      materialRows: [
        {
          title: "Concrete",
          qtyTotal: 8,
          uom: "m3",
          docsCount: 2,
          qtyWithoutRequest: 1,
        },
      ],
      issuesTotal: 2,
      itemsTotal: 5,
      itemsNoRequest: 1,
      withoutWork: 0,
      issuesNoObject: 0,
      issueCost: 1000,
      purchaseCost: 1200,
      ratioPct: 83,
      problemRows: [{ problem: "No request", count: 1, comment: "Review request links" }],
    });

    const subcontractHtml = renderDirectorSubcontractReportPdfHtml({
      companyName: "RIK",
      generatedBy: "Director",
      periodText: "01.03.2026 → 31.03.2026",
      objectText: "Object A",
      generatedAt: "31.03.2026 10:00",
      totalRows: 2,
      approvedCount: 1,
      contractorCount: 1,
      objectCount: 1,
      sumApproved: 1500,
      noAmount: 0,
      noWork: 0,
      noObject: 0,
      noContractor: 0,
      contractorRows: [{ contractor: "Contractor A", count: 1, amount: 1500, objects: 1, works: 1 }],
      objectRows: [{ objectName: "Object A", count: 1, amount: 1500, contractors: 1, works: 1 }],
      approvedRows: [
        {
          displayNo: "SC-001",
          contractor: "Contractor A",
          objectName: "Object A",
          workType: "Foundation",
          status: "approved",
          totalPrice: 1500,
          approvedAt: "31.03.2026",
        },
      ],
      workRows: [{ workType: "Foundation", count: 1, amount: 1500, contractors: 1 }],
      pendingCount: 0,
      rejectedCount: 0,
    });

    expect(supplierHtml).toContain("Supplier A");
    expect(supplierHtml).toContain("<!doctype html>");
    expect(productionHtml).toContain("Object A");
    expect(productionHtml).toContain("Concrete");
    expect(subcontractHtml).toContain("Contractor A");
    expect(subcontractHtml).toContain("SC-001");
  });
});
