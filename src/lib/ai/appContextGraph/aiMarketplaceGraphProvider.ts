import { resolveAiSourceRefForRole, type AiContextGraphRole } from "./aiPermissionAwareLinkResolver";
import {
  createAiContextGraphNode,
  createUnresolvedAiSourceRef,
  type AiContextGraphEntityFactInput,
  type AiContextGraphEntityInput,
  type AiContextGraphNode,
} from "./aiSourceRef";

export type AiMaterialRecord = {
  id: string;
  nameRu: string;
  unit?: string;
  categoryRu?: string;
};

export type AiMarketplaceProductRecord = {
  id: string;
  titleRu: string;
  materialId?: string;
  supplierId?: string;
  priceRu?: string;
  availabilityRu?: string;
};

export type AiSupplierRecord = {
  id: string;
  nameRu: string;
  phoneRu?: string;
  productIds?: string[];
  materialIds?: string[];
};

export type AiContractorRecord = {
  id: string;
  nameRu: string;
  workIds?: string[];
  documentIds?: string[];
};

export type AiMarketplaceGraphInput = {
  materials?: AiMaterialRecord[];
  products?: AiMarketplaceProductRecord[];
  suppliers?: AiSupplierRecord[];
  contractors?: AiContractorRecord[];
};

function buildNode(input: AiContextGraphEntityInput, role: AiContextGraphRole): AiContextGraphNode {
  const ref = resolveAiSourceRefForRole(createUnresolvedAiSourceRef(input), role, input.routeParams);
  return createAiContextGraphNode(input, ref);
}

function fact(key: string, valueRu?: string | number | null): AiContextGraphEntityFactInput[] {
  if (valueRu === undefined || valueRu === null || String(valueRu).trim().length === 0) return [];
  return [{ key, valueRu: String(valueRu) }];
}

export function buildAiMarketplaceGraphNodes(
  input: AiMarketplaceGraphInput | undefined,
  role: AiContextGraphRole,
): AiContextGraphNode[] {
  if (!input) return [];

  const materialNodes = (input.materials ?? []).map((material) =>
    buildNode({
      entityType: "material",
      entityId: material.id,
      origin: "app_data",
      labelRu: material.nameRu,
      facts: [
        ...fact("material", material.nameRu),
        ...fact("unit", material.unit),
        ...fact("category", material.categoryRu),
      ],
    }, role),
  );

  const productNodes = (input.products ?? []).map((product) =>
    buildNode({
      entityType: "marketplace_product",
      entityId: product.id,
      origin: "internal_marketplace",
      labelRu: product.titleRu,
      facts: [
        ...fact("product", product.titleRu),
        ...fact("price", product.priceRu),
        ...fact("availability", product.availabilityRu),
      ],
      links: [
        ...(product.materialId ? [{ relation: "uses_material" as const, targetEntityType: "material" as const, targetEntityId: product.materialId, labelRu: "Материал" }] : []),
        ...(product.supplierId ? [{ relation: "purchased_from_supplier" as const, targetEntityType: "supplier" as const, targetEntityId: product.supplierId, labelRu: "Поставщик" }] : []),
      ],
      missingLinks: [
        ...(product.supplierId ? [] : [{ expected: "supplier" as const, reasonRu: "У товара нет связанного поставщика." }]),
      ],
    }, role),
  );

  const supplierNodes = (input.suppliers ?? []).map((supplier) =>
    buildNode({
      entityType: "supplier",
      entityId: supplier.id,
      origin: "supplier_history",
      labelRu: supplier.nameRu,
      facts: [...fact("supplier", supplier.nameRu), ...fact("phone", supplier.phoneRu)],
      links: [
        ...(supplier.productIds ?? []).map((productId) => ({ relation: "contains" as const, targetEntityType: "marketplace_product" as const, targetEntityId: productId, labelRu: "Товар" })),
        ...(supplier.materialIds ?? []).map((materialId) => ({ relation: "uses_material" as const, targetEntityType: "material" as const, targetEntityId: materialId, labelRu: "Материал" })),
      ],
    }, role),
  );

  const contractorNodes = (input.contractors ?? []).map((contractor) =>
    buildNode({
      entityType: "contractor",
      entityId: contractor.id,
      origin: "field",
      labelRu: contractor.nameRu,
      facts: fact("contractor", contractor.nameRu),
      links: [
        ...(contractor.workIds ?? []).map((workId) => ({ relation: "for_work" as const, targetEntityType: "work" as const, targetEntityId: workId, labelRu: "Работа" })),
        ...(contractor.documentIds ?? []).map((documentId) => ({ relation: "linked_document" as const, targetEntityType: "document" as const, targetEntityId: documentId, labelRu: "Документ" })),
      ],
    }, role),
  );

  return [...materialNodes, ...productNodes, ...supplierNodes, ...contractorNodes];
}
