import { useState } from "react";
import type { WarehouseReportRow } from "../warehouse.types";

export function useWarehouseReportState() {
  const [issueLinesById, setIssueLinesById] = useState<Record<string, WarehouseReportRow[]>>({});
  const [issueLinesLoadingId, setIssueLinesLoadingId] = useState<number | null>(null);

  const [incomingLinesById, setIncomingLinesById] = useState<Record<string, WarehouseReportRow[]>>({});
  const [incomingLinesLoadingId, setIncomingLinesLoadingId] = useState<string | null>(null);

  const [periodFrom, setPeriodFrom] = useState<string>("");
  const [periodTo, setPeriodTo] = useState<string>("");

  return {
    issueLinesById,
    setIssueLinesById,
    issueLinesLoadingId,
    setIssueLinesLoadingId,
    incomingLinesById,
    setIncomingLinesById,
    incomingLinesLoadingId,
    setIncomingLinesLoadingId,
    periodFrom,
    setPeriodFrom,
    periodTo,
    setPeriodTo,
  };
}

