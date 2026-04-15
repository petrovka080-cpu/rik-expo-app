import { normalizeRuText } from "../../lib/text/encoding";

export const isApprovedForOtherStatus = (status: string): boolean => {
  const s = normalizeRuText(String(status || "")).toLowerCase();
  return (
    !s ||
    s.includes("ready") ||
    s.includes("approved") ||
    s.includes("waiting_stock") ||
    s.includes("stock") ||
    s.includes("утвержд") ||
    s.includes("готов")
  );
};

export const isRejectedOrCancelledRequestStatus = (status: string | null | undefined): boolean => {
  const s = normalizeRuText(String(status || "")).toLowerCase();
  if (!s) return false;
  return (
    s.includes("reject") ||
    s.includes("declin") ||
    s.includes("cancel") ||
    s.includes("denied") ||
    s.includes("отклон") ||
    s.includes("отмен") ||
    s.includes("аннули")
  );
};
