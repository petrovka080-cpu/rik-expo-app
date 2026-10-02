/** Shared canonical owner for generated expanded-template row reconciliation. */
export type ExpandedTemplateDuplicateLineage = Readonly<{
  rowCode: string;
  role: "catalog_anchor" | "category_group";
  unitPrice: number;
}>;

export type ReconciliableExpandedTemplateRow = {
  code: string;
  title: string;
  section: string;
  quantityFormula: string;
  unit: string;
  unitPrice: number;
  required?: boolean;
  optional?: boolean;
  includedByDefault?: boolean;
  procurementEligible?: boolean;
  duplicateLineage?: readonly ExpandedTemplateDuplicateLineage[];
};

type GeneratedRowOrigin = Readonly<{
  workScopeId: string;
  role: "catalog_anchor" | "category_group";
  sectionRole: "material" | "labor";
}>;

function normalizedTitle(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("ru-RU")
    .replace(/\s+/gu, " ")
    .replace(/[.,;:()[\]{}"'`]+/gu, "");
}

function generatedRowOrigin(code: string): GeneratedRowOrigin | null {
  const match = code.match(/^(.*)_(catalog_anchor|group)_(material|labor)_\d+$/u);
  if (!match) return null;
  return {
    workScopeId: match[1],
    role: match[2] === "catalog_anchor" ? "catalog_anchor" : "category_group",
    sectionRole: match[3] as GeneratedRowOrigin["sectionRole"],
  };
}

function sameCalculationBasis(
  left: ReconciliableExpandedTemplateRow,
  right: ReconciliableExpandedTemplateRow,
): boolean {
  return left.quantityFormula === right.quantityFormula
    && Boolean(left.required) === Boolean(right.required)
    && Boolean(left.optional) === Boolean(right.optional)
    && (left.includedByDefault !== false) === (right.includedByDefault !== false)
    && Boolean(left.procurementEligible) === Boolean(right.procurementEligible);
}

function candidateKey(
  row: ReconciliableExpandedTemplateRow,
  origin: GeneratedRowOrigin,
  identityUnit: (unit: string) => string,
): string {
  return [
    origin.workScopeId,
    origin.sectionRole,
    row.section,
    normalizedTitle(row.title),
    identityUnit(row.unit),
  ].join("|");
}

/**
 * Reconciles the one generated duplicate that has an explicit source relationship:
 * a catalog anchor and a category-group row for the same work scope and calculation
 * basis. Other equal-looking rows remain independent because a display title is not
 * a semantic identity.
 */
export function reconcileExpandedTemplateRows<T extends ReconciliableExpandedTemplateRow>(
  rows: readonly T[],
  identityUnit: (unit: string) => string = (unit) => unit,
): T[] {
  const candidates = new Map<string, Array<{ row: T; origin: GeneratedRowOrigin }>>();

  for (const row of rows) {
    const origin = generatedRowOrigin(row.code);
    if (!origin) continue;
    if (origin.sectionRole === "material" && row.section !== "materials") continue;
    if (origin.sectionRole === "labor" && row.section !== "labor") continue;
    const key = candidateKey(row, origin, identityUnit);
    candidates.set(key, [...(candidates.get(key) ?? []), { row, origin }]);
  }

  const removedCodes = new Set<string>();
  const replacementByCode = new Map<string, T>();

  for (const group of candidates.values()) {
    const anchors = group.filter((candidate) => candidate.origin.role === "catalog_anchor");
    const categoryRows = group.filter((candidate) => candidate.origin.role === "category_group");

    // Ambiguous equal labels are not proof of identity. Only the one-to-one generated
    // relationship can be resolved without discarding a real operation/layer.
    if (anchors.length !== 1 || categoryRows.length !== 1) continue;
    const anchor = anchors[0].row;
    const categoryRow = categoryRows[0].row;
    if (!sameCalculationBasis(anchor, categoryRow)) continue;

    const duplicateLineage = [
      ...(anchor.duplicateLineage ?? []),
      { rowCode: anchor.code, role: "catalog_anchor" as const, unitPrice: anchor.unitPrice },
      ...(categoryRow.duplicateLineage ?? []),
      { rowCode: categoryRow.code, role: "category_group" as const, unitPrice: categoryRow.unitPrice },
    ].sort((left, right) => left.rowCode.localeCompare(right.rowCode));

    // The catalog anchor is the explicit work-specific owner. This priority is stable
    // under input reordering; the displaced category rate remains in lineage.
    replacementByCode.set(anchor.code, { ...anchor, duplicateLineage });
    removedCodes.add(categoryRow.code);
  }

  return rows
    .filter((row) => !removedCodes.has(row.code))
    .map((row) => replacementByCode.get(row.code) ?? row);
}
