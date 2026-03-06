import { useMemo } from "react";

import type { BuyerInboxRow } from "../../../lib/catalog_api";
import type { BuyerProposalBucketRow } from "../buyer.fetchers";
import type { BuyerGroup, BuyerSheetKind, DraftAttachmentMap, LineMeta } from "../buyer.types";
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
  pickedIds: string[];
  meta: Record<string, LineMeta>;
  attachments: DraftAttachmentMap;
  sheetKind: BuyerSheetKind;
  sheetGroup: BuyerGroup | null;
  tab: "inbox" | "pending" | "approved" | "rejected" | "subcontracts";
  pending: BuyerProposalBucketRow[];
  approved: BuyerProposalBucketRow[];
  rejected: BuyerProposalBucketRow[];
};

export function useBuyerDerived({
  rows,
  pickedIds,
  meta,
  attachments,
  sheetKind,
  sheetGroup,
  tab,
  pending,
  approved,
  rejected,
}: UseBuyerDerivedParams) {
  const groups = useMemo(() => selectGroups(rows), [rows]);

  const rfqPickedPreview = useMemo(
    () => selectRfqPickedPreview(rows, pickedIds),
    [rows, pickedIds]
  );

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

  const sheetData = useMemo(
    () => selectSheetData(sheetKind, sheetGroup),
    [sheetKind, sheetGroup]
  );

  const listData = useMemo(
    () => selectListData(tab, groups, pending, approved, rejected),
    [tab, groups, pending, approved, rejected]
  );

  return {
    groups,
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
  };
}
