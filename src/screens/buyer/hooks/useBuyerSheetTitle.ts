import { useMemo } from "react";

import { formatProposalBaseNo } from "../../../lib/format";
import type { BuyerGroup, BuyerSheetKind } from "../buyer.types";

export function useBuyerSheetTitle(params: {
  sheetKind: BuyerSheetKind;
  sheetGroup: BuyerGroup | null;
  acctProposalId: string | number | null;
  rwPid: string | null;
  propViewId: string | null;
  proposalNoByPid: Record<string, string>;
  prettyLabel: (requestId: string | number | null | undefined, requestIdOld?: number | null) => string;
}) {
  const { sheetKind, sheetGroup, acctProposalId, rwPid, propViewId, proposalNoByPid, prettyLabel } = params;

  return useMemo(() => {
    if (sheetKind === "inbox" && sheetGroup) {
      return prettyLabel(sheetGroup.request_id, sheetGroup.request_id_old ?? null);
    }
    if (sheetKind === "accounting" && acctProposalId != null) {
      return `В бухгалтерию • ${formatProposalBaseNo(null, String(acctProposalId))}`;
    }
    if (sheetKind === "rework" && rwPid) {
      return `Доработка • ${formatProposalBaseNo(null, String(rwPid))}`;
    }
    if (sheetKind === "prop_details" && propViewId) {
      return `Предложение • ${formatProposalBaseNo(
        proposalNoByPid[String(propViewId)] || null,
        String(propViewId)
      )}`;
    }
    if (sheetKind === "rfq") {
      return "Торги (RFQ)";
    }
    return "—";
  }, [sheetKind, sheetGroup, acctProposalId, rwPid, propViewId, proposalNoByPid, prettyLabel]);
}

