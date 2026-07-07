import type { ProfessionalCostLine } from "../../lib/estimate/professionalCostingContract";

export type BuyerHandoffCostTraceRow = {
  rowId: string;
  name: string;
  rowType: ProfessionalCostLine["rowType"];
  quantity: number;
  unit: string;
  priceState: ProfessionalCostLine["priceState"];
  unitPrice: number | null;
  subtotal: number | null;
  priceSourceId: string | null;
  priceSourceLabel: string | null;
  priceRegion: string | null;
  retrievedAt: string | null;
};

function isProcurementCostRow(line: ProfessionalCostLine): boolean {
  return (
    line.rowType === "material" ||
    line.rowType === "equipment" ||
    line.rowType === "service" ||
    line.rowType === "transport" ||
    line.rowType === "mobilization"
  );
}

export function buildBuyerHandoffCostTraceRows(
  lines: readonly ProfessionalCostLine[],
): BuyerHandoffCostTraceRow[] {
  return lines.filter(isProcurementCostRow).map((line) => ({
    rowId: line.rowId,
    name: line.name,
    rowType: line.rowType,
    quantity: line.quantity,
    unit: line.unit,
    priceState: line.priceState,
    unitPrice: line.unitPrice,
    subtotal: line.lineSubtotal,
    priceSourceId: line.priceSourceId,
    priceSourceLabel: line.priceSourceLabel,
    priceRegion: line.priceRegion,
    retrievedAt: line.priceRetrievedAt,
  }));
}

export function renderBuyerHandoffCostTrace(input: {
  lines: readonly ProfessionalCostLine[];
}): string {
  return buildBuyerHandoffCostTraceRows(input.lines)
    .map((row) => [
      row.rowId,
      row.name,
      row.rowType,
      `${row.quantity} ${row.unit}`,
      row.priceState,
      row.unitPrice == null ? "unitPrice=missing_price" : `unitPrice=${row.unitPrice}`,
      row.subtotal == null ? "subtotal=null" : `subtotal=${row.subtotal}`,
      row.priceSourceId ?? "priceSourceId=null",
      row.priceSourceLabel ?? "priceSourceLabel=null",
      row.priceRegion ?? "priceRegion=null",
      row.retrievedAt ?? "retrievedAt=null",
    ].join("; "))
    .join("\n");
}
