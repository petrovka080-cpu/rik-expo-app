const formattedWholeNumbers = new Map<number, string>();
const MAX_FORMATTED_MONEY_CACHE_SIZE = 512;
const RU_GROUP_SEPARATOR = "\u00a0";

function formatRussianWholeNumber(value: number): string {
  const roundedMagnitude = Math.round(Math.abs(value) + Number.EPSILON);
  const grouped = String(roundedMagnitude).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    RU_GROUP_SEPARATOR,
  );
  return value < 0 ? `-${grouped}` : grouped;
}

export function formatEstimateMoney(value: number | null | undefined, currency = "KGS"): string {
  if (value == null || !Number.isFinite(value)) return "уточнить";
  const rounded = Math.round(value);
  let formatted = formattedWholeNumbers.get(rounded);
  if (formatted === undefined) {
    formatted = formatRussianWholeNumber(rounded);
    if (formattedWholeNumbers.size >= MAX_FORMATTED_MONEY_CACHE_SIZE) {
      formattedWholeNumbers.clear();
    }
    formattedWholeNumbers.set(rounded, formatted);
  }
  if (currency === "KGS") return `${formatted} сом`;
  if (currency === "RUB") return `${formatted} руб.`;
  return `${formatted} ${currency}`;
}
