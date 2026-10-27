// src/screens/warehouse/components/warehouseReports.row.model.test.ts
import {
  selectReportDocRowShape,
  selectReportDocRowKey,
} from "./warehouseReports.row.model";

type Item = {
  incoming_id?: string | number | null;
  id?: string | number | null;
  issue_id?: string | number | null;
  display_no?: string | null;
  issue_no?: string | null;
  who?: string | null;
  obj_name?: string | null;
};

function makePdfBusy(busyKeys: string[] = []) {
  return (key: string) => busyKeys.includes(key);
}

describe("selectReportDocRowShape — incoming mode", () => {
  const isIncoming = true;

  it("resolves docId from incoming_id", () => {
    const item: Item = { incoming_id: "inc-42" };
    const shape = selectReportDocRowShape(item, isIncoming, "2024-01-15", makePdfBusy());
    expect(shape.docId).toBe("inc-42");
  });

  it("falls back to id when incoming_id is null", () => {
    const item: Item = { incoming_id: null, id: "gen-1" };
    const shape = selectReportDocRowShape(item, isIncoming, "2024-01-15", makePdfBusy());
    expect(shape.docId).toBe("gen-1");
  });

  it("generates display_no from display_no field", () => {
    const item: Item = { incoming_id: "inc-1", display_no: "PO-2024-001" };
    const shape = selectReportDocRowShape(item, isIncoming, "2024-01-15", makePdfBusy());
    expect(shape.docNo).toBe("PO-2024-001");
  });

  it("generates PR- prefix docNo when display_no is missing", () => {
    const item: Item = { incoming_id: "inc-abcdef12", display_no: null };
    const shape = selectReportDocRowShape(item, isIncoming, "2024-01-15", makePdfBusy());
    expect(shape.docNo).toMatch(/^PR-/);
  });

  it("pdfBusy is false when key not in busy set", () => {
    const item: Item = { incoming_id: "inc-1" };
    const shape = selectReportDocRowShape(item, isIncoming, "2024-01-15", makePdfBusy());
    expect(shape.pdfBusy).toBe(false);
  });

  it("pdfBusy is true when matching key is in busy set", () => {
    const item: Item = { incoming_id: "inc-1" };
    // Use the actual key format produced by buildWarehousePdfBusyKey
    const isPdfBusy = (key: string) => key.includes("inc-1");
    const shape = selectReportDocRowShape(item, isIncoming, "2024-01-15", isPdfBusy);
    expect(shape.pdfBusy).toBe(true);
  });

  it("docId is null when both incoming_id and id are null", () => {
    const item: Item = { incoming_id: null, id: null };
    const shape = selectReportDocRowShape(item, isIncoming, "2024-01-15", makePdfBusy());
    expect(shape.docId).toBeNull();
  });

  it("maps who and obj_name fields", () => {
    const item: Item = { incoming_id: "inc-1", who: "Иванов", obj_name: "Объект-7" };
    const shape = selectReportDocRowShape(item, isIncoming, "2024-01-15", makePdfBusy());
    expect(shape.who).toBe("Иванов");
    expect(shape.objName).toBe("Объект-7");
  });

  it("who and objName are null when fields absent", () => {
    const item: Item = { incoming_id: "inc-1" };
    const shape = selectReportDocRowShape(item, isIncoming, "2024-01-15", makePdfBusy());
    expect(shape.who).toBeNull();
    expect(shape.objName).toBeNull();
  });
});

describe("selectReportDocRowShape — issue mode", () => {
  const isIncoming = false;

  it("resolves docId from issue_id", () => {
    const item: Item = { issue_id: 77 };
    const shape = selectReportDocRowShape(item, isIncoming, "2024-02-20", makePdfBusy());
    expect(shape.docId).toBe(77);
  });

  it("generates ISSUE- prefix docNo from numeric issue_id", () => {
    const item: Item = { issue_id: 42, issue_no: null };
    const shape = selectReportDocRowShape(item, isIncoming, "2024-02-20", makePdfBusy());
    expect(shape.docNo).toBe("ISSUE-42");
  });

  it("uses issue_no when provided", () => {
    const item: Item = { issue_id: 42, issue_no: "ВЫД-2024-042" };
    const shape = selectReportDocRowShape(item, isIncoming, "2024-02-20", makePdfBusy());
    expect(shape.docNo).toBe("ВЫД-2024-042");
  });

  it("shows ISSUE-— when issue_id is null", () => {
    const item: Item = { issue_id: null, issue_no: null };
    const shape = selectReportDocRowShape(item, isIncoming, "2024-02-20", makePdfBusy());
    expect(shape.docId).toBeNull();
    expect(shape.docNo).toBe("ISSUE-—");
  });
});

describe("selectReportDocRowKey", () => {
  it("includes day, docId, and index", () => {
    const item: Item = { incoming_id: "inc-5" };
    const key = selectReportDocRowKey(item, 2, "2024-01-15");
    expect(key).toBe("2024-01-15_inc-5_2");
  });

  it("falls back to empty string when no docId fields", () => {
    const item: Item = {};
    const key = selectReportDocRowKey(item, 0, "2024-01-15");
    expect(key).toBe("2024-01-15__0");
  });
});
