import { useState } from "react";
import type { BuyerInboxRow } from "../../../lib/catalog_api";
import type { BuyerProposalBucketRow } from "../buyer.fetchers";

export function useBuyerState() {
  const [rows, setRows] = useState<BuyerInboxRow[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
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

