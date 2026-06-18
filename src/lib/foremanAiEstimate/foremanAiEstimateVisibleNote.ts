import type { ForemanEstimateContext } from "./foremanAiEstimateContracts";

const trim = (value: unknown): string => String(value ?? "").trim();

export function buildForemanAiEstimateVisibleContextNote(
  context: ForemanEstimateContext,
): string | null {
  const objectName = trim(context.objectName);
  const location = [context.levelName, context.systemName, context.zoneName]
    .map(trim)
    .filter(Boolean)
    .join(" / ");

  const lines = [
    objectName ? `\u041e\u0431\u044a\u0435\u043a\u0442: ${objectName}` : "",
    location ? `\u041b\u043e\u043a\u0430\u0446\u0438\u044f: ${location}` : "",
  ].filter(Boolean);

  return lines.length ? lines.join("; ") : null;
}
