import type { ConstructionKnowledgeSource } from "../constructionKnowledgeCore";
import type { WarehouseStockContext } from "./warehouseStockTypes";

const ALLOWED_SOURCE_TYPES = new Set<ConstructionKnowledgeSource["type"]>([
  "general_construction_knowledge",
  "company_standard",
  "project_pdf",
  "architecture_pdf",
  "engineering_pdf",
  "estimate_pdf",
  "boq",
  "specification",
  "act",
  "report",
  "photo",
  "work",
  "object",
  "zone",
  "material",
  "warehouse_stock",
  "procurement_request",
  "approval",
  "chat_message",
]);

function isForbiddenLabel(labelRu: string): boolean {
  return /runtime|debug|provider payload|service_role|secret|env|full cashflow|raw/i.test(labelRu);
}

export function sanitizeWarehouseContext(context: WarehouseStockContext): WarehouseStockContext {
  const sources = context.sources.filter((source) =>
    ALLOWED_SOURCE_TYPES.has(source.type) && !isForbiddenLabel(source.labelRu),
  );
  return {
    ...context,
    sources,
  };
}

export function warehouseHiddenPermissionLimits(context: WarehouseStockContext): {
  sourceType: string;
  reasonRu: string;
}[] {
  return context.sources
    .filter((source) => !ALLOWED_SOURCE_TYPES.has(source.type) || isForbiddenLabel(source.labelRu))
    .map((source) => ({
      sourceType: source.type,
      reasonRu: "Hidden from warehouse role: finance, security, runtime or raw provider data.",
    }));
}
