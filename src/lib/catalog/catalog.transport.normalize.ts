import type { CatalogGroup, IncomingItem, UomRef } from "./catalog.types";

type CatalogGroupTransportRow = {
  code?: string | null;
  name?: string | null;
  parent_code?: string | null;
};

type UomTransportRow = {
  id?: string | null;
  code?: string | null;
  name?: string | null;
};

type IncomingItemTransportRow = {
  incoming_id?: string | null;
  incoming_item_id?: string | null;
  purchase_item_id?: string | null;
  code?: string | null;
  name?: string | null;
  uom?: string | null;
  qty_expected?: number | null;
  qty_received?: number | null;
};

const asRequiredString = (value: string | null | undefined): string | null =>
  typeof value === "string" ? value : null;

const asOptionalString = (value: string | null | undefined): string | undefined =>
  typeof value === "string" ? value : undefined;

const asNullableString = (value: string | null | undefined): string | null =>
  typeof value === "string" ? value : null;

const asFiniteNumber = (value: number | null | undefined): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export const normalizeCatalogGroupRows = (
  rows: readonly CatalogGroupTransportRow[] | null | undefined,
): CatalogGroup[] => {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    const code = asRequiredString(row.code);
    const name = asRequiredString(row.name);
    if (code === null || name === null) return [];
    return [
      {
        code,
        name,
        parent_code: asNullableString(row.parent_code),
      },
    ];
  });
};

export const normalizeUomRows = (rows: readonly UomTransportRow[] | null | undefined): UomRef[] => {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    const code = asRequiredString(row.code);
    const name = asRequiredString(row.name);
    if (code === null || name === null) return [];
    return [
      {
        id: asOptionalString(row.id),
        code,
        name,
      },
    ];
  });
};

export const normalizeIncomingItemRows = (
  rows: readonly IncomingItemTransportRow[] | null | undefined,
): IncomingItem[] => {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    const incomingId = asRequiredString(row.incoming_id);
    const incomingItemId = asRequiredString(row.incoming_item_id);
    const qtyExpected = asFiniteNumber(row.qty_expected);
    const qtyReceived = asFiniteNumber(row.qty_received);

    if (
      incomingId === null ||
      incomingItemId === null ||
      qtyExpected === null ||
      qtyReceived === null
    ) {
      return [];
    }

    return [
      {
        incoming_id: incomingId,
        incoming_item_id: incomingItemId,
        purchase_item_id: asNullableString(row.purchase_item_id),
        code: asNullableString(row.code),
        name: asNullableString(row.name),
        uom: asNullableString(row.uom),
        qty_expected: qtyExpected,
        qty_received: qtyReceived,
      },
    ];
  });
};

export const normalizeSuppliersListRpcArgs = (
  searchTerm: string | null,
): { p_search?: string } => (searchTerm === null ? {} : { p_search: searchTerm });
