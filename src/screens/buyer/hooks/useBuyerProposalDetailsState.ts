import { useState } from "react";

import type { ProposalHeadLite, ProposalViewLine } from "../buyer.types";

export function useBuyerProposalDetailsState() {
  const [propViewId, setPropViewId] = useState<string | null>(null);
  const [propViewBusy, setPropViewBusy] = useState(false);
  const [propViewLines, setPropViewLines] = useState<ProposalViewLine[]>([]);
  const [propViewHead, setPropViewHead] = useState<ProposalHeadLite | null>(null);

  return {
    propViewId,
    setPropViewId,
    propViewBusy,
    setPropViewBusy,
    propViewLines,
    setPropViewLines,
    propViewHead,
    setPropViewHead,
  };
}

export type BuyerProposalDetailsState = ReturnType<typeof useBuyerProposalDetailsState>;
