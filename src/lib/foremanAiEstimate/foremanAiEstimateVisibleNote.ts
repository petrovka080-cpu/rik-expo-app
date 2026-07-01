import type { ForemanEstimateContext } from "./foremanAiEstimateContracts";

const trim = (value: unknown): string => String(value ?? "").trim();

export function buildForemanAiEstimateVisibleContextNote(
  context: ForemanEstimateContext,
): string | null {
  const objectName = trim(context.objectName);
  const levelName = trim(context.levelName);
  const systemName = trim(context.systemName);
  const zoneName = trim(context.zoneName);

  const lines = [
    objectName ? `\u041e\u0431\u044a\u0435\u043a\u0442: ${objectName}` : "",
    levelName ? `\u042d\u0442\u0430\u0436 / \u0443\u0440\u043e\u0432\u0435\u043d\u044c: ${levelName}` : "",
    systemName ? `\u0421\u0438\u0441\u0442\u0435\u043c\u0430 / \u0440\u0430\u0437\u0434\u0435\u043b: ${systemName}` : "",
    zoneName ? `\u0417\u043e\u043d\u0430: ${zoneName}` : "",
  ].filter(Boolean);

  return lines.length ? lines.join("; ") : null;
}
