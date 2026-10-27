import { normalizeWarehousePdfRequest } from "./warehousePdf.shared";

describe("warehousePdf.shared", () => {
  it("normalizes an issue form request", () => {
    expect(
      normalizeWarehousePdfRequest({
        version: "v1",
        role: "warehouse",
        documentType: "warehouse_document",
        documentKind: "issue_form",
        issueId: "77",
        generatedBy: "Складовщик",
        companyName: "GOX",
        warehouseName: "Main Warehouse",
      }),
    ).toEqual({
      version: "v1",
      role: "warehouse",
      documentType: "warehouse_document",
      documentKind: "issue_form",
      issueId: 77,
      generatedBy: "Складовщик",
      companyName: "GOX",
      warehouseName: "Main Warehouse",
    });
  });

  it("requires dayLabel for day register requests", () => {
    expect(() =>
      normalizeWarehousePdfRequest({
        version: "v1",
        role: "warehouse",
        documentType: "warehouse_register",
        documentKind: "issue_day_register",
      }),
    ).toThrow("warehouse pdf payload missing dayLabel");
  });

  it("rejects invalid document combinations", () => {
    expect(() =>
      normalizeWarehousePdfRequest({
        version: "v1",
        role: "warehouse",
        documentType: "warehouse_register",
        documentKind: "issue_form",
      }),
    ).toThrow("warehouse pdf payload invalid documentType/documentKind combination");
  });
});
