import type { AssistantContext } from "../assistant.types";
import type { AiRoleScreenAssistantRegistryEntry } from "./aiRoleScreenAssistantTypes";

export const AI_ROLE_SCREEN_ASSISTANT_REGISTRY: readonly AiRoleScreenAssistantRegistryEntry[] = [
  { screenId: "accountant.main", role: "accountant", domain: "finance", title: "Финансы сегодня", contexts: ["accountant"] },
  { screenId: "accountant.payment", role: "accountant", domain: "finance", title: "AI-проверка платежа", contexts: ["accountant"] },
  { screenId: "buyer.main", role: "buyer", domain: "procurement", title: "Снабжение сегодня", contexts: ["buyer", "request"] },
  { screenId: "buyer.requests", role: "buyer", domain: "procurement", title: "Входящие заявки", contexts: ["buyer", "request"] },
  { screenId: "buyer.request.detail", role: "buyer", domain: "procurement", title: "Готовые варианты закупки", contexts: ["buyer", "request"] },
  { screenId: "procurement.copilot", role: "buyer", domain: "procurement", title: "Рабочий срез закупки", contexts: ["buyer", "request"] },
  { screenId: "director.dashboard", role: "director", domain: "control", title: "Решения на сегодня", contexts: ["director", "reports"] },
  { screenId: "approval.inbox", role: "director", domain: "control", title: "На согласовании", contexts: ["director"] },
  { screenId: "warehouse.main", role: "warehouse", domain: "warehouse", title: "Склад сегодня", contexts: ["warehouse"] },
  { screenId: "warehouse.incoming", role: "warehouse", domain: "warehouse", title: "Приход", contexts: ["warehouse"] },
  { screenId: "warehouse.issue", role: "warehouse", domain: "warehouse", title: "Выдача", contexts: ["warehouse"] },
  { screenId: "foreman.main", role: "foreman", domain: "projects", title: "Работы сегодня", contexts: ["foreman"] },
  { screenId: "foreman.ai.quick_modal", role: "foreman", domain: "projects", title: "Быстрый workbench", contexts: ["foreman"] },
  { screenId: "foreman.subcontract", role: "foreman", domain: "projects", title: "Подрядчики и evidence", contexts: ["foreman"] },
  { screenId: "contractor.main", role: "contractor", domain: "projects", title: "Что нужно сдать", contexts: ["contractor"] },
  { screenId: "documents.main", role: "office", domain: "documents", title: "Документ готов к разбору", contexts: ["reports", "profile"] },
  { screenId: "agent.documents.knowledge", role: "office", domain: "documents", title: "Документы и knowledge", contexts: ["reports", "profile"] },
  { screenId: "chat.main", role: "office", domain: "chat", title: "Итоги обсуждения", contexts: ["unknown"] },
  { screenId: "map.main", role: "office", domain: "logistics", title: "Карта и логистика", contexts: ["supplierMap", "market"] },
  { screenId: "office.hub", role: "office", domain: "office", title: "Офис сегодня", contexts: ["profile"] },
  { screenId: "security.screen", role: "security", domain: "security", title: "Безопасность", contexts: ["security"] },
  { screenId: "screen.runtime", role: "admin", domain: "runtime", title: "Runtime health", contexts: ["security"] },
];

export function listAiRoleScreenAssistantRegistry(): AiRoleScreenAssistantRegistryEntry[] {
  return [...AI_ROLE_SCREEN_ASSISTANT_REGISTRY];
}

export function getAiRoleScreenAssistantRegistryEntry(
  screenId: string,
): AiRoleScreenAssistantRegistryEntry | null {
  return AI_ROLE_SCREEN_ASSISTANT_REGISTRY.find((entry) => entry.screenId === screenId) ?? null;
}

export function resolveDefaultRoleAssistantScreenId(context: AssistantContext): string {
  switch (context) {
    case "accountant":
      return "accountant.main";
    case "buyer":
    case "request":
      return "buyer.main";
    case "warehouse":
      return "warehouse.main";
    case "foreman":
      return "foreman.main";
    case "contractor":
      return "contractor.main";
    case "director":
      return "director.dashboard";
    case "reports":
      return "documents.main";
    case "supplierMap":
      return "map.main";
    case "profile":
      return "office.hub";
    case "security":
      return "security.screen";
    default:
      return "chat.main";
  }
}
