import { useMemo } from "react";

import type { BuyerInboxRow } from "../../../lib/catalog_api";
import type { BuyerProposalBucketRow } from "../buyer.fetchers";
import { selectBuyerTabCounts } from "../buyer.screen.selectors";
import type { BuyerSheetKind, DraftAttachmentMap, LineMeta } from "../buyer.types";
import {
  selectGroups,
  selectRfqPickedPreview,
  selectSupplierGroups,
  selectRequiredSuppliers,
  selectMissingAttachSuppliers,
  selectAttachStats,
  selectNeedAttachWarn,
  selectSheetData,
  selectListData,
} from "../buyer.selectors";

type UseBuyerDerivedParams = {
  rows: BuyerInboxRow[];
  inboxTotalCount?: number;
  pickedIds: string[];
  meta: Record<string, LineMeta>;
  attachments: DraftAttachmentMap;
  sheetKind: BuyerSheetKind;
  selectedRequestId?: string | null;
  tab: "inbox" | "pending" | "approved" | "rejected" | "subcontracts";
  pending: BuyerProposalBucketRow[];
  approved: BuyerProposalBucketRow[];
  rejected: BuyerProposalBucketRow[];
  searchQuery?: string;
  titleByPid?: Record<string, string>;
};

function useBuyerAttachmentState(
  pickedIds: string[],
  meta: Record<string, LineMeta>,
  attachments: DraftAttachmentMap
) {
  const supplierGroups = useMemo(
    () => selectSupplierGroups(pickedIds, meta),
    [pickedIds, meta]
  );

  const requiredSuppliers = useMemo(
    () => selectRequiredSuppliers(supplierGroups),
    [supplierGroups]
  );

  const missingAttachSuppliers = useMemo(
    () => selectMissingAttachSuppliers(requiredSuppliers, attachments),
    [requiredSuppliers, attachments]
  );

  const { attachSlotsTotal, attachMissingCount, attachFilledCount } = useMemo(
    () => selectAttachStats(requiredSuppliers, missingAttachSuppliers),
    [requiredSuppliers, missingAttachSuppliers]
  );

  const needAttachWarn = useMemo(
    () => selectNeedAttachWarn(pickedIds.length, attachSlotsTotal, attachMissingCount),
    [pickedIds.length, attachSlotsTotal, attachMissingCount]
  );

  return {
    supplierGroups,
    requiredSuppliers,
    missingAttachSuppliers,
    attachSlotsTotal,
    attachMissingCount,
    attachFilledCount,
    needAttachWarn,
  };
}

export function useBuyerDerived({
  rows,
  inboxTotalCount,
  pickedIds,
  meta,
  attachments,
  sheetKind,
  selectedRequestId,
  tab,
  pending,
  approved,
  rejected,
  searchQuery,
  titleByPid,
}: UseBuyerDerivedParams) {
  const groups = useMemo(() => selectGroups(rows), [rows]);

  const sheetGroup = useMemo(() => {
    if (sheetKind !== "inbox") return null;
    const requestId = String(selectedRequestId ?? "").trim();
    if (!requestId) return null;
    return groups.find((group) => String(group?.request_id ?? "").trim() === requestId) ?? null;
  }, [groups, selectedRequestId, sheetKind]);

  const rfqPickedPreview = useMemo(
    () => selectRfqPickedPreview(rows, pickedIds),
    [rows, pickedIds]
  );

  const {
    supplierGroups,
    requiredSuppliers,
    missingAttachSuppliers,
    attachSlotsTotal,
    attachMissingCount,
    attachFilledCount,
    needAttachWarn,
  } = useBuyerAttachmentState(pickedIds, meta, attachments);

  const sheetData = useMemo(
    () => selectSheetData(sheetKind, sheetGroup),
    [sheetKind, sheetGroup]
  );

  const listData = useMemo(
    () => selectListData(tab, groups, pending, approved, rejected, searchQuery, titleByPid),
    [tab, groups, pending, approved, rejected, searchQuery, titleByPid]
  );

  const tabCounts = useMemo(
    () =>
      selectBuyerTabCounts({
        inboxTotalCount,
        pending,
        approved,
        rejected,
      }),
    [inboxTotalCount, pending, approved, rejected]
  );

  return {
    groups,
    sheetGroup,
    rfqPickedPreview,
    supplierGroups,
    requiredSuppliers,
    missingAttachSuppliers,
    attachSlotsTotal,
    attachMissingCount,
    attachFilledCount,
    needAttachWarn,
    sheetData,
    listData,
    tabCounts,
  };
}
