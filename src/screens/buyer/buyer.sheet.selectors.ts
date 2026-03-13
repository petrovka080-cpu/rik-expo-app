import { formatProposalBaseNo } from "../../lib/format";
import type { BuyerGroup, BuyerSheetKind } from "./buyer.types";

export type SheetHdrRow = { __kind: "attachments" };

export function selectBuyerSheetData(sheetKind: BuyerSheetKind, sheetGroup: BuyerGroup | null) {
  if (!(sheetKind === "inbox" && sheetGroup)) return [];
  return [{ __kind: "attachments" } as SheetHdrRow, ...(sheetGroup.items || [])];
}

export function selectBuyerSheetTitle(params: {
  sheetKind: BuyerSheetKind;
  sheetGroup: BuyerGroup | null;
  acctProposalId: string | number | null;
  rwPid: string | null;
  propViewId: string | null;
  proposalNoByPid: Record<string, string>;
  prettyLabel: (requestId: string | number | null | undefined, requestIdOld?: number | null) => string;
}) {
  const {
    sheetKind,
    sheetGroup,
    acctProposalId,
    rwPid,
    propViewId,
    proposalNoByPid,
    prettyLabel,
  } = params;

  if (sheetKind === "inbox" && sheetGroup) {
    return prettyLabel(sheetGroup.request_id, sheetGroup.request_id_old ?? null);
  }
  if (sheetKind === "accounting" && acctProposalId != null) {
    return formatProposalBaseNo(null, String(acctProposalId));
  }
  if (sheetKind === "rework" && rwPid) {
    return formatProposalBaseNo(null, String(rwPid));
  }
  if (sheetKind === "prop_details" && propViewId) {
    return formatProposalBaseNo(proposalNoByPid[String(propViewId)] || null, String(propViewId));
  }
  if (sheetKind === "rfq") {
    return "Торги (RFQ)";
  }
  return "—";
}
