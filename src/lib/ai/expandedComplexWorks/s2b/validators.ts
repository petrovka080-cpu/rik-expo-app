import type { ExpandedComplexBoqRow } from "../index";
import type { S2BDomainPack, S2BWave2Kind } from "./types";

export function assertS2BDomainPack(kind: S2BWave2Kind, pack: S2BDomainPack): void {
  if (!pack.components.length) {
    throw new Error(`S2B_DOMAIN_PACK_EMPTY:${kind}`);
  }
  const seen = new Set<string>();
  for (const component of pack.components) {
    if (!component.code || !component.titleRu || !component.materialKey) {
      throw new Error(`S2B_DOMAIN_PACK_INCOMPLETE_COMPONENT:${kind}`);
    }
    if (seen.has(component.code)) {
      throw new Error(`S2B_DOMAIN_PACK_DUPLICATE_COMPONENT:${kind}:${component.code}`);
    }
    seen.add(component.code);
  }
}

export function hasS2BDomainRequiredRows(rows: readonly ExpandedComplexBoqRow[], kind: S2BWave2Kind): boolean {
  const domainPrefix = `s2b_${kind}`;
  const domainRows = rows.filter((row) => row.code.startsWith(domainPrefix));
  const lineTypes = new Set(domainRows.map((row) => row.lineType));
  return lineTypes.has("material") && lineTypes.has("work") && lineTypes.has("equipment") && lineTypes.has("service");
}
