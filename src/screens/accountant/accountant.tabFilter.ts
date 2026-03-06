import { TABS, type Tab } from "./types";
import { normalizePaymentStatusKind } from "./accountant.status";

export function filterRowsByTab<T extends { payment_status?: string | null }>(rows: T[], tab: Tab): T[] {
  return (rows || []).filter((r) => {
    const kind = normalizePaymentStatusKind(r.payment_status);
    switch (tab) {
      case TABS[0]:
        return kind === "K_PAY";
      case TABS[1]:
        return kind === "PART";
      case TABS[2]:
        return kind === "PAID";
      case TABS[3]:
        return kind === "REWORK";
      default:
        return true;
    }
  });
}

export function sortRowsByTab<T extends { last_paid_at?: number | null }>(rows: T[], tab: Tab): T[] {
  if (tab === TABS[1] || tab === TABS[2]) {
    return [...rows].sort((a, b) => Number(b.last_paid_at ?? 0) - Number(a.last_paid_at ?? 0));
  }
  return rows;
}
