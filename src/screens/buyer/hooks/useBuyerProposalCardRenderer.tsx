import { useCallback } from "react";

import type { BuyerProposalBucketRow } from "../buyer.fetchers";
import type { StylesBag } from "../components/component.types";
import { BuyerProposalCard } from "../buyer.components";
import { selectBuyerProposalCardViewModel } from "../buyer.proposal.presentation";

export function useBuyerProposalCardRenderer(params: {
  s: StylesBag;
  titleByPid: Record<string, string>;
  propAttByPid: Record<string, unknown[]>;
  openProposalPdf: (proposalId: string) => Promise<void> | void;
  openAccountingModal: (proposalId: string | number) => void;
  openRework: (proposalId: string) => Promise<void> | void;
  openProposalDetailsLines: (proposalId: string, head: BuyerProposalBucketRow) => Promise<void> | void;
  openProposalDetailsAttachments: (proposalId: string, head: BuyerProposalBucketRow) => Promise<void> | void;
}) {
  const {
    s,
    titleByPid,
    propAttByPid,
    openProposalDetailsLines,
  } = params;

  const renderProposalCard = useCallback(
    (item: BuyerProposalBucketRow) => {
      const { title, attCount } = selectBuyerProposalCardViewModel(item, titleByPid, propAttByPid);

      return (
        <BuyerProposalCard
          s={s}
          head={item}
          title={title}
          attCount={attCount}
          onOpenDetails={(pid2) => openProposalDetailsLines(pid2, item)}
        />
      );
    },
    [
      s,
      titleByPid,
      propAttByPid,
      openProposalDetailsLines,
    ]
  );

  return { renderProposalCard };
}
