import { normalizeRuText } from "../../lib/text/encoding";

export type PaymentStatusKind = "K_PAY" | "PART" | "PAID" | "REWORK" | "UNKNOWN";

const toNorm = (value: unknown): string =>
  normalizeRuText(String(value ?? "")).trim().toLowerCase();

export function normalizePaymentStatusKind(raw: unknown): PaymentStatusKind {
  const s = toNorm(raw);
  if (!s) return "UNKNOWN";

  if (
    s.startsWith("на доработке") ||
    s.startsWith("возврат") ||
    s === "rework" ||
    s === "returned"
  ) {
    return "REWORK";
  }

  if (s.startsWith("оплачено") || s === "paid") return "PAID";

  if (
    s.startsWith("частично") ||
    s.startsWith("partial") ||
    s === "part"
  ) {
    return "PART";
  }

  if (s.startsWith("к оплате") || s === "k_pay" || s === "to_pay") return "K_PAY";

  return "UNKNOWN";
}

export function paymentStatusLabel(kind: PaymentStatusKind): string {
  switch (kind) {
    case "REWORK":
      return "На доработке";
    case "PAID":
      return "Оплачено";
    case "PART":
      return "Частично оплачено";
    case "K_PAY":
      return "К оплате";
    default:
      return "К оплате";
  }
}
