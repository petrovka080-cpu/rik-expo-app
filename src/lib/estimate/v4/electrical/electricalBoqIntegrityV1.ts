export const ELECTRICAL_BOQ_INTEGRITY_VERSION =
  "electrical-boq-integrity:2026-07-29.v1" as const;

export type ElectricalBoqIntegrityRow = {
  rowCode: string;
  semanticOwner: string;
  titleRu: string;
  resourceType: string;
  quantity: number;
  unit: string;
};

export type ElectricalBoqIntegrityReport = {
  duplicateRowCode: readonly string[];
  duplicateSemanticOwner: readonly string[];
  duplicateNormalizedName: readonly string[];
  aggregateDetailOverlap: readonly string[];
  materialDoubleCount: readonly string[];
  laborDoubleCount: readonly string[];
  resourceIdentityCollision: readonly string[];
};

function normalizedName(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ru-RU")
    .replace(/[^a-zа-яё0-9]+/giu, " ")
    .trim();
}

function duplicates(
  rows: readonly ElectricalBoqIntegrityRow[],
  key: (row: ElectricalBoqIntegrityRow) => string,
): string[] {
  const count = new Map<string, number>();
  for (const row of rows) {
    const value = key(row);
    if (value) count.set(value, (count.get(value) ?? 0) + 1);
  }
  return [...count.entries()]
    .filter(([, value]) => value > 1)
    .map(([value]) => value)
    .sort();
}

export function inspectElectricalBoqIntegrityV1(
  rows: readonly ElectricalBoqIntegrityRow[],
): ElectricalBoqIntegrityReport {
  const duplicateRowCode = duplicates(rows, (row) => row.rowCode);
  const duplicateSemanticOwner = duplicates(rows, (row) => row.semanticOwner);
  const duplicateNormalizedName = duplicates(
    rows,
    (row) => `${row.resourceType}:${normalizedName(row.titleRu)}:${row.unit}`,
  );
  const owners = new Set(rows.map((row) => row.semanticOwner).filter(Boolean));
  const aggregateDetailOverlap = [...owners]
    .filter((owner) =>
      [...owners].some(
        (candidate) =>
          candidate !== owner &&
          (candidate.startsWith(`${owner}:`) || owner.startsWith(`${candidate}:`)),
      )
    )
    .sort();
  const materialDoubleCount = duplicateSemanticOwner.filter((owner) =>
    rows.some(
      (row) => row.semanticOwner === owner && row.resourceType === "material",
    )
  );
  const laborDoubleCount = duplicateSemanticOwner.filter((owner) =>
    rows.some(
      (row) =>
        row.semanticOwner === owner &&
        (row.resourceType === "work" || row.resourceType === "labor"),
    )
  );
  const resourceIdentityCollision = [...owners]
    .filter((owner) =>
      new Set(
        rows
          .filter((row) => row.semanticOwner === owner)
          .map((row) => row.resourceType),
      ).size > 1
    )
    .sort();
  return Object.freeze({
    duplicateRowCode: Object.freeze(duplicateRowCode),
    duplicateSemanticOwner: Object.freeze(duplicateSemanticOwner),
    duplicateNormalizedName: Object.freeze(duplicateNormalizedName),
    aggregateDetailOverlap: Object.freeze(aggregateDetailOverlap),
    materialDoubleCount: Object.freeze(materialDoubleCount),
    laborDoubleCount: Object.freeze(laborDoubleCount),
    resourceIdentityCollision: Object.freeze(resourceIdentityCollision),
  });
}

export function assertElectricalBoqIntegrityV1(
  rows: readonly ElectricalBoqIntegrityRow[],
): void {
  const missingOwner = rows
    .filter((row) => !row.semanticOwner.trim())
    .map((row) => row.rowCode);
  if (missingOwner.length > 0) {
    throw new Error(`ELECTRICAL_BOQ_SEMANTIC_OWNER_REQUIRED:${missingOwner.join(",")}`);
  }
  const report = inspectElectricalBoqIntegrityV1(rows);
  const violations = Object.entries(report)
    .filter(([, values]) => values.length > 0)
    .map(([detector, values]) => `${detector}=${values.join(",")}`);
  if (violations.length > 0) {
    throw new Error(
      `ELECTRICAL_BOQ_INTEGRITY_INVALID:${ELECTRICAL_BOQ_INTEGRITY_VERSION}:${violations.join(";")}`,
    );
  }
}
