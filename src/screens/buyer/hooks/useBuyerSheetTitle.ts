import { useMemo } from "react";

import { selectBuyerSheetTitle } from "../buyer.sheet.selectors";
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

  return useMemo(
    () =>
      selectBuyerSheetTitle({
        sheetKind,
        sheetGroup,
        acctProposalId,
        rwPid,
        propViewId,
        proposalNoByPid,
        prettyLabel,
      }),
    [sheetKind, sheetGroup, acctProposalId, rwPid, propViewId, proposalNoByPid, prettyLabel]
  );
}
