import { useState } from "react";
import type { ReqHeadRow } from "../warehouse.types";

export type WarehouseReportsMode = "choice" | "issue" | "incoming";

export function useWarehouseModals() {
  const [isRecipientModalVisible, setIsRecipientModalVisible] = useState(false);
  const [reportsMode, setReportsMode] = useState<WarehouseReportsMode>("choice");
  const [reqModal, setReqModal] = useState<ReqHeadRow | null>(null);
  const [issueDetailsId, setIssueDetailsId] = useState<number | null>(null);
  const [incomingDetailsId, setIncomingDetailsId] = useState<string | null>(null);
  const [repPeriodOpen, setRepPeriodOpen] = useState(false);

  return {
    isRecipientModalVisible,
    setIsRecipientModalVisible,
    reportsMode,
    setReportsMode,
    reqModal,
    setReqModal,
    issueDetailsId,
    setIssueDetailsId,
    incomingDetailsId,
    setIncomingDetailsId,
    repPeriodOpen,
    setRepPeriodOpen,
  };
}

