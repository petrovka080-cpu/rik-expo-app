import type { ConstructionWorkCatalogLink, ConstructionWorkLinkKind } from "./constructionWorkTypes";

export const constructionWorkCatalogLinkKinds: ConstructionWorkLinkKind[] = [
  "material",
  "equipment",
  "tool",
  "service",
  "supplier_offer",
  "warehouse_item",
];

export function isConstructionWorkCatalogLinkKind(value: string): value is ConstructionWorkLinkKind {
  return constructionWorkCatalogLinkKinds.includes(value as ConstructionWorkLinkKind);
}

export function groupConstructionWorkCatalogLinksByKind(
  links: ConstructionWorkCatalogLink[],
): Record<ConstructionWorkLinkKind, ConstructionWorkCatalogLink[]> {
  return constructionWorkCatalogLinkKinds.reduce(
    (acc, kind) => {
      acc[kind] = links.filter((link) => link.link_kind === kind);
      return acc;
    },
    {} as Record<ConstructionWorkLinkKind, ConstructionWorkCatalogLink[]>,
  );
}
