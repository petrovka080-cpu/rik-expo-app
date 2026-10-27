import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import type { RequestDetails } from "../../lib/catalog_api";
import { loadForemanRequestDetails } from "./foreman.draftBoundary.helpers";

type SetDisplayNoByReq = Dispatch<SetStateAction<Record<string, string>>>;

export type ForemanDraftBoundaryRequestDetailsDeps = {
  requestDetailsLoadSeqRef: MutableRefObject<number>;
  requestId: string;
  setRequestDetails: Dispatch<SetStateAction<RequestDetails | null>>;
  setDisplayNoByReq: SetDisplayNoByReq;
  syncHeaderFromDetails: (details: RequestDetails) => void;
};

export const invalidateForemanDraftBoundaryRequestDetailsLoads = (
  requestDetailsLoadSeqRef: MutableRefObject<number>,
) => {
  requestDetailsLoadSeqRef.current += 1;
};

export const loadForemanDraftBoundaryRequestDetails = async (
  deps: ForemanDraftBoundaryRequestDetailsDeps,
  rid?: string | number | null,
) => {
  const requestSeq = ++deps.requestDetailsLoadSeqRef.current;
  return await loadForemanRequestDetails({
    requestId: rid,
    activeRequestId: deps.requestId,
    setRequestDetails: deps.setRequestDetails,
    setDisplayNoByReq: deps.setDisplayNoByReq,
    syncHeaderFromDetails: deps.syncHeaderFromDetails,
    shouldApply: () => requestSeq === deps.requestDetailsLoadSeqRef.current,
  });
};
