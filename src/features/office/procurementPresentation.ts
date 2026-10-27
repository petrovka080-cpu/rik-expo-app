const cleanText = (value: unknown): string => String(value ?? "").replace(/\s+/g, " ").trim();

const parseMoneyNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = cleanText(value);
  if (!raw) return null;
  const normalized = raw.replace(/\s+/g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatMoneyNumber = (value: number): string =>
  value.toLocaleString("ru-RU", { maximumFractionDigits: 2 });

export type ProcurementUnknownFieldsUxInput = {
  price?: unknown;
  counterparty?: unknown;
  note?: unknown;
  sum?: unknown;
  currencyLabel?: string;
};

export type ProcurementUnknownFieldsUx = {
  hasPrice: boolean;
  priceText: string;
  counterpartyText: string;
  noteText: string;
  sumText: string;
};

export function selectProcurementUnknownFieldsUx(
  input: ProcurementUnknownFieldsUxInput,
): ProcurementUnknownFieldsUx {
  const priceRaw = cleanText(input.price);
  const counterpartyRaw = cleanText(input.counterparty);
  const noteRaw = cleanText(input.note);
  const currency = cleanText(input.currencyLabel) || "сом";
  const hasPrice = priceRaw.length > 0;
  const priceNumber = parseMoneyNumber(priceRaw);
  const sumNumber = parseMoneyNumber(input.sum);

  return {
    hasPrice,
    priceText: hasPrice
      ? priceNumber != null
        ? formatMoneyNumber(priceNumber)
        : priceRaw
      : "Не заполнено",
    counterpartyText: counterpartyRaw || "Не выбран",
    noteText: noteRaw || "—",
    sumText: hasPrice
      ? `${formatMoneyNumber(sumNumber ?? 0)} ${currency}`
      : "появится после цены",
  };
}
