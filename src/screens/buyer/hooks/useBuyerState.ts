import { useState } from "react";
import type { BuyerInboxRow } from "../../../lib/catalog_api";
import type { BuyerProposalBucketRow } from "../buyer.fetchers";

export function useBuyerState() {
  const [rows, setRows] = useState<BuyerInboxRow[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [loadingInboxMore, setLoadingInboxMore] = useState(false);
  const [inboxHasMore, setInboxHasMore] = useState(false);
  const [inboxTotalCount, setInboxTotalCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const [pending, setPending] = useState<BuyerProposalBucketRow[]>([]);
  const [approved, setApproved] = useState<BuyerProposalBucketRow[]>([]);
  const [rejected, setRejected] = useState<BuyerProposalBucketRow[]>([]);

  const [loadingBuckets, setLoadingBuckets] = useState(false);
  const [subcontractCount, setSubcontractCount] = useState(0);

  return {
    rows,
    setRows,
    loadingInbox,
    setLoadingInbox,
    loadingInboxMore,
    setLoadingInboxMore,
    inboxHasMore,
    setInboxHasMore,
    inboxTotalCount,
    setInboxTotalCount,
    refreshing,
    setRefreshing,
    pending,
    setPending,
    approved,
    setApproved,
    rejected,
    setRejected,
    loadingBuckets,
    setLoadingBuckets,
    subcontractCount,
    setSubcontractCount,
  };
}
