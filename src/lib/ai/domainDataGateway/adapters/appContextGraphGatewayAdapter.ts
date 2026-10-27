import type { AiSourceRef } from "../../appContextGraph";
import type { AiDomainSourceRef } from "../aiDomainContextBundle";

const originMap: Record<AiDomainSourceRef["origin"], AiSourceRef["origin"]> = {
  app_data: "app_data",
  document_asset: "document_asset",
  pdf_document: "pdf_document",
  document_chunk: "document_chunk",
  media_asset: "media_asset",
  warehouse: "warehouse",
  finance: "finance",
  procurement: "procurement",
  field: "field",
  documents: "documents",
  marketplace: "internal_marketplace",
  consumer_repair: "app_data",
  approval: "app_data",
  office: "app_data",
};

export function toAppContextGraphSourceRef(ref: AiDomainSourceRef): AiSourceRef {
  return {
    id: ref.id,
    origin: originMap[ref.origin],
    entityType: ref.entityType as AiSourceRef["entityType"],
    entityId: ref.entityId,
    labelRu: ref.labelRu,
    appLink: ref.appLink,
    permission: ref.permission,
    canBePresentedAsFact: ref.canBePresentedAsFact,
    requiresReview: ref.requiresReview,
  };
}

export function toAppContextGraphSourceRefs(refs: readonly AiDomainSourceRef[]): AiSourceRef[] {
  return refs.map(toAppContextGraphSourceRef);
}
