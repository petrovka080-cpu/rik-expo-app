import { trim } from "./foreman.subcontractController.model";
import type { SubcontractControllerGuardReason } from "./foreman.subcontractController.guards";

export function getForemanSubcontractErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && trim(error.message)) return trim(error.message);
  if (typeof error === "string" && trim(error)) return trim(error);
  return fallback;
}

export function buildForemanSubcontractDebugPayload(scope: string, error: unknown) {
  return {
    message: `[ForemanSubcontractTab] ${scope}:`,
    error,
  };
}

export function getForemanSubcontractAlertCopy(reason: SubcontractControllerGuardReason) {
  switch (reason) {
    case "missing_template":
      return {
        title: "Подряд не выбран",
        message: "Сначала выберите утвержденный подряд.",
      };
    case "template_not_approved":
      return {
        title: "Подряд не утвержден",
        message: "Для заявки можно использовать только утвержденный подряд.",
      };
    case "missing_user":
      return {
        title: "Данные не загружены",
        message: "Профиль пользователя не найден.",
      };
    case "missing_request":
      return {
        title: "Внимание",
        message: "Сначала сформируйте заявку.",
      };
    case "empty_draft":
      return {
        title: "Внимание",
        message: "В черновике нет позиций для отправки.",
      };
  }
}
