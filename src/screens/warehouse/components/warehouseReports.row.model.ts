// src/screens/warehouse/components/warehouseReports.row.model.ts
//
// Pure row-shaping for WarehouseReportsTab document rows.
// Extracts buildWarehousePdfBusyKey + derived docId/docNo out of renderItem.

import { buildWarehousePdfBusyKey } from "../warehouse.pdf.boundary";
import type { WarehouseReportRow } from "../warehouse.types";

type ReportDocRow = WarehouseReportRow & {
  incoming_id?: string | number | null;
  id?: string | number | null;
  issue_id?: string | number | null;
  display_no?: string | null;
  issue_no?: string | null;
  who?: string | null;
  obj_name?: string | null;
};

export type ReportDocRowShape = {
  /** Stable document identifier, null if unknown */
  docId: string | number | null;
  /** Human-readable document number */
  docNo: string;
  /** Whether the per-document PDF generation is in progress */
  pdfBusy: boolean;
  /** Recipient / responsible person text */
  who: string | null;
  /** Object / work site name */
  objName: string | null;
};

/**
 * Shape a single report document row.
 * Calls buildWarehousePdfBusyKey ONCE per row here, not inside renderItem.
 */
export function selectReportDocRowShape(
  item: ReportDocRow,
  isIncoming: boolean,
  activeDay: string,
  isPdfBusy: (key: string) => boolean,
): ReportDocRowShape {
  const docId = isIncoming
    ? (item.incoming_id ?? item.id ?? null)
    : (item.issue_id ?? null);

  const docNo = isIncoming
    ? (item.display_no || `PR-${String(docId ?? "").slice(0, 8)}`)
    : (item.issue_no || (Number.isFinite(docId) ? `ISSUE-${docId}` : "ISSUE-—"));

  const pdfBusy =
    docId != null &&
    isPdfBusy(
      buildWarehousePdfBusyKey({
        kind: "document",
        reportsMode: isIncoming ? "incoming" : "issue",
        docId,
      }),
    );

  return {
    docId: docId ?? null,
    docNo,
    pdfBusy: !!pdfBusy,
    who: item.who != null ? String(item.who) : null,
    objName: item.obj_name != null ? String(item.obj_name) : null,
  };
}

/**
 * Stable key extractor for the active-day document FlashList.
 */
export function selectReportDocRowKey(
  item: ReportDocRow,
  index: number,
  activeDay: string,
): string {
  const docId = item.incoming_id ?? item.id ?? item.issue_id ?? null;
  return `${activeDay}_${String(docId ?? "")}_${index}`;
}
