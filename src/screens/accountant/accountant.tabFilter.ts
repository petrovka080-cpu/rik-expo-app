import { TABS, type Tab } from "./types";

export function filterRowsByTab<T extends { payment_status?: string | null }>(rows: T[], tab: Tab): T[] {
  return (rows || []).filter((r) => {
    const ps = String(r.payment_status ?? "").trim().toLowerCase();
    switch (tab) {
      case TABS[0]:
        return ps.startsWith("к оплате") || ps === "k_pay" || ps === "to_pay";
      case TABS[1]:
        return ps.startsWith("частично") || ps === "part" || ps.startsWith("partial");
      case TABS[2]:
        return ps.startsWith("оплачено") || ps === "paid";
      case TABS[3]:
        return ps.startsWith("на доработке") || ps.startsWith("возврат") || ps === "rework" || ps === "returned";
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
