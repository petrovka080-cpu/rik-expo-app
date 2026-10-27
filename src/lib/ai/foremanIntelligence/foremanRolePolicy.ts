import type { ConstructionKnowledgeSource } from "../constructionKnowledgeCore";
import type { AiSourceType } from "./foremanTypes";

export const FOREMAN_ALLOWED_SOURCE_TYPES: readonly ConstructionKnowledgeSource["type"][] = [
  "general_construction_knowledge",
  "company_standard",
  "country_profile",
  "normative_pdf",
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
] as const;

export const FOREMAN_FORBIDDEN_SOURCE_TYPES: readonly ConstructionKnowledgeSource["type"][] = [
  "payment",
  "supplier_offer",
] as const;

export const FOREMAN_ROLE_POLICY = {
  role: "foreman" as const,
  canReadFinance: false,
  canReadAllBusinessDomains: false,
  directSigningAllowed: false,
  directFinalSubmitAllowed: false,
  directWorkCloseAllowed: false,
  directStockMutationAllowed: false,
  directPaymentAllowed: false,
  readableSourceTypes: FOREMAN_ALLOWED_SOURCE_TYPES,
  forbiddenSourceTypes: FOREMAN_FORBIDDEN_SOURCE_TYPES,
  directorBusinessDomainNote:
    "Директор может читать все бизнес-домены, но raw secrets, runtime и provider payload не доступны normal user.",
};

export function sourceTypeAllowedForForeman(type: AiSourceType): boolean {
  if (type === "payment" || type === "supplier_offer") return false;
  if (type === "document" || type === "pdf_chunk" || type === "estimate_line" || type === "subcontractor" || type === "remark" || type === "warehouse_issue") {
    return true;
  }
  return FOREMAN_ALLOWED_SOURCE_TYPES.includes(type);
}
