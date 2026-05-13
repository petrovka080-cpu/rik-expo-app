import { listSuppliers } from "../../../../lib/catalog/catalog.facade";
import type { Supplier } from "../../../../lib/catalog/catalog.types";
import {
  clampAiToolTransportLimit,
  normalizeAiToolTransportText,
  type AiSupplierTransportItem,
} from "./aiToolTransportTypes";

export const COMPARE_SUPPLIERS_TRANSPORT_ROUTE_SCOPE = "ai.tool.compare_suppliers" as const;
export const COMPARE_SUPPLIERS_TRANSPORT_MAX_LIMIT = 10;

export type CompareSuppliersTransportRequest = {
  query: string;
  limit: number;
};

function toTransportSupplier(supplier: Supplier): AiSupplierTransportItem {
  return {
    id: normalizeAiToolTransportText(supplier.id),
    name: normalizeAiToolTransportText(supplier.name),
    specialization: normalizeAiToolTransportText(supplier.specialization),
    address: normalizeAiToolTransportText(supplier.address),
    website: normalizeAiToolTransportText(supplier.website),
  };
}

export async function readCompareSuppliersTransport(
  request: CompareSuppliersTransportRequest,
): Promise<readonly AiSupplierTransportItem[]> {
  const limit = clampAiToolTransportLimit(
    request.limit,
    COMPARE_SUPPLIERS_TRANSPORT_MAX_LIMIT,
    COMPARE_SUPPLIERS_TRANSPORT_MAX_LIMIT,
  );
  const rows = await listSuppliers(request.query);
  return rows.slice(0, limit).map(toTransportSupplier);
}
