import type {
  CatalogSearchRpcRow,
  ProfileContractorCompatRow,
  RikQuickSearchFallbackRow,
  RikQuickSearchRpcRow,
  SuppliersListRpcRow,
} from "./catalog.types";

const asUnknownRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;

const asNullableString = (value: unknown): string | null =>
  value == null ? null : String(value);

export const parseCatalogSearchRpcRows = (rows: unknown): CatalogSearchRpcRow[] => {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((value): CatalogSearchRpcRow | null => {
      const row = asUnknownRecord(value);
      if (!row) return null;
      return {
        code: asNullableString(row.code),
        rik_code: asNullableString(row.rik_code),
        name: asNullableString(row.name),
        name_human: asNullableString(row.name_human),
        uom: asNullableString(row.uom),
        uom_code: asNullableString(row.uom_code),
        sector_code: asNullableString(row.sector_code),
        spec: asNullableString(row.spec),
        kind: asNullableString(row.kind),
        group_code: asNullableString(row.group_code),
      } satisfies CatalogSearchRpcRow;
    })
    .filter((row): row is CatalogSearchRpcRow => !!row);
};

export const parseSuppliersListRpcRows = (rows: unknown): SuppliersListRpcRow[] => {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((value): SuppliersListRpcRow | null => {
      const row = asUnknownRecord(value);
      if (!row) return null;
      return {
        id: asNullableString(row.id),
        name: asNullableString(row.name),
        inn: asNullableString(row.inn),
        bank_account: asNullableString(row.bank_account),
        specialization: asNullableString(row.specialization),
        phone: asNullableString(row.phone),
        email: asNullableString(row.email),
        website: asNullableString(row.website),
        address: asNullableString(row.address),
        contact_name: asNullableString(row.contact_name),
        notes: asNullableString(row.notes),
        comment: asNullableString(row.comment),
      } satisfies SuppliersListRpcRow;
    })
    .filter((row): row is SuppliersListRpcRow => !!row);
};

const parseRikQuickSearchRpcRow = (value: unknown): RikQuickSearchRpcRow | null => {
  const row = asUnknownRecord(value);
  if (!row) return null;
  return {
    code: asNullableString(row.code),
    rik_code: asNullableString(row.rik_code),
    name: asNullableString(row.name),
    name_human: asNullableString(row.name_human),
    name_human_ru: asNullableString(row.name_human_ru),
    name_ru: asNullableString(row.name_ru),
    item_name: asNullableString(row.item_name),
    uom: asNullableString(row.uom),
    uom_code: asNullableString(row.uom_code),
    kind: asNullableString(row.kind),
  };
};

const parseRikQuickSearchFallbackRow = (value: unknown): RikQuickSearchFallbackRow | null => {
  const row = asUnknownRecord(value);
  if (!row) return null;
  return {
    rik_code: asNullableString(row.rik_code),
    name_human: asNullableString(row.name_human),
    uom_code: asNullableString(row.uom_code),
    kind: asNullableString(row.kind),
    name_human_ru: asNullableString(row.name_human_ru),
  };
};

export const parseRikQuickSearchRpcRows = (rows: unknown): RikQuickSearchRpcRow[] => {
  if (!Array.isArray(rows)) return [];
  return rows
    .map(parseRikQuickSearchRpcRow)
    .filter((row): row is RikQuickSearchRpcRow => !!row);
};

export const parseRikQuickSearchFallbackRows = (rows: unknown): RikQuickSearchFallbackRow[] => {
  if (!Array.isArray(rows)) return [];
  return rows
    .map(parseRikQuickSearchFallbackRow)
    .filter((row): row is RikQuickSearchFallbackRow => !!row);
};

export const parseProfileContractorRows = (rows: unknown): ProfileContractorCompatRow[] => {
  if (!Array.isArray(rows)) return [];
  return rows.filter((row): row is ProfileContractorCompatRow => !!row && typeof row === "object");
};
