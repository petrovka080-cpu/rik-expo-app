import { useCallback } from "react";
import { Alert } from "react-native";

const DEFAULT_ALERT_TITLE = "Ошибка";
const DEFAULT_ALERT_MESSAGE = "Произошла ошибка";

export function normalizeBuyerAlertPart(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    const message = value.trim();
    if (message && message !== "[object Object]") return message;
  }
  if (value instanceof Error) {
    const message = value.message.trim();
    if (message && message !== "[object Object]") return message;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["message", "error", "details", "hint", "code"] as const) {
      const part = String(record[key] ?? "").trim();
      if (part && part !== "[object Object]") return part;
    }
    try {
      const json = JSON.stringify(value);
      if (json && json !== "{}" && json !== '"[object Object]"') return json;
    } catch {}
  }
  return fallback;
}

export function useBuyerAlerts() {
  const alertUser = useCallback((title: string, message?: string) => {
    const safeTitle = normalizeBuyerAlertPart(title, DEFAULT_ALERT_TITLE);
    const safeMessage = normalizeBuyerAlertPart(message, DEFAULT_ALERT_MESSAGE);
    Alert.alert(safeTitle, safeMessage);
  }, []);

  return { alertUser };
}
