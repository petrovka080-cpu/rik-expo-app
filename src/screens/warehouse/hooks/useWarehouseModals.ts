import { useState } from "react";

export type WarehouseReportsMode = "choice" | "issue" | "incoming";

export function useWarehouseModals() {
  const [isRecipientModalVisible, setIsRecipientModalVisible] = useState(false);
  const [reportsMode, setReportsMode] = useState<WarehouseReportsMode>("choice");
  const [issueDetailsId, setIssueDetailsId] = useState<number | null>(null);
  const [incomingDetailsId, setIncomingDetailsId] = useState<string | null>(null);
  const [repPeriodOpen, setRepPeriodOpen] = useState(false);

  return {
    isRecipientModalVisible,
    setIsRecipientModalVisible,
    reportsMode,
    setReportsMode,
    issueDetailsId,
    setIssueDetailsId,
    incomingDetailsId,
    setIncomingDetailsId,
    repPeriodOpen,
    setRepPeriodOpen,
  };
}
