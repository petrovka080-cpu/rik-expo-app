export function formatEstimateMoney(value: number | null | undefined, currency = "KGS"): string {
  if (value == null || !Number.isFinite(value)) return "уточнить";
  const rounded = Math.round(value);
  const formatted = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(rounded);
  if (currency === "KGS") return `${formatted} сом`;
  if (currency === "RUB") return `${formatted} руб.`;
  return `${formatted} ${currency}`;
}
