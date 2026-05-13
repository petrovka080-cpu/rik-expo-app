import { callDirectorFinanceBffRpc } from "../../../../screens/director/director.finance.bff.client";
import type { DirectorFinanceBffRequestDto } from "../../../../screens/director/director.finance.bff.contract";
import {
  type AiFinanceSummaryTransportInput,
  type AiFinanceSummaryTransportResult,
} from "./aiToolTransportTypes";

export const FINANCE_SUMMARY_TRANSPORT_ROUTE_OPERATION = "director.finance.rpc.scope" as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function readRecord(record: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  for (const key of keys) {
    const value = record[key];
    if (isRecord(value)) return value;
  }
  return record;
}

function readNumber(record: Record<string, unknown>, keys: readonly string[]): number {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return toNumber(record[key]);
    }
  }
  return 0;
}

function readStringArray(record: Record<string, unknown>, keys: readonly string[]): string[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }
  }
  return [];
}

function readArrayCount(record: Record<string, unknown>, keys: readonly string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value.length;
  }
  return 0;
}

function buildDirectorFinanceRequest(
  input: AiFinanceSummaryTransportInput,
): DirectorFinanceBffRequestDto {
  if (input.scope === "supplier") {
    return {
      operation: "director.finance.supplier_scope.v2",
      args: {
        p_supplier: input.entityId ?? "",
        p_object_id: undefined,
        p_from: input.periodStart,
        p_to: input.periodEnd,
        p_kind_name: undefined,
        p_due_days: 7,
        p_critical_days: 14,
      },
    };
  }

  return {
    operation: "director.finance.summary.v2",
    args: {
      p_object_id: input.scope === "project" ? input.entityId ?? undefined : undefined,
      p_date_from: input.periodStart ?? undefined,
      p_date_to: input.periodEnd ?? undefined,
    },
  };
}

function redactFinancePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const summary = readRecord(payload, ["summary", "summaryV2", "totals"]);
  return {
    summary: {
      total_payable: readNumber(summary, [
        "total_payable",
        "totalPayable",
        "total_amount",
        "totalAmount",
        "payable",
      ]),
      total_paid: readNumber(summary, ["total_paid", "totalPaid", "paid"]),
      total_debt: readNumber(summary, ["total_debt", "totalDebt", "debt"]),
      overdue_amount: readNumber(summary, ["overdue_amount", "overdueAmount", "overdue"]),
      critical_amount: readNumber(summary, ["critical_amount", "criticalAmount"]),
      overdue_count: readNumber(summary, ["overdue_count", "overdueCount"]),
      document_count: readNumber(summary, ["document_count", "documentCount", "documents"]),
      supplier_count:
        readNumber(summary, ["supplier_count", "supplierCount"]) ||
        readArrayCount(payload, ["by_supplier", "bySupplier", "suppliers"]),
    },
    document_gaps: readStringArray(payload, ["document_gaps", "documentGaps"]),
  };
}

export async function readFinanceSummaryTransport(params: {
  input: AiFinanceSummaryTransportInput;
}): Promise<AiFinanceSummaryTransportResult> {
  const response = await callDirectorFinanceBffRpc(buildDirectorFinanceRequest(params.input));

  if (response.status === "unavailable") {
    throw new Error(`finance summary read unavailable: ${response.reason}`);
  }
  if (response.status === "error") {
    throw new Error(response.error.message);
  }

  return {
    payload: redactFinancePayload(response.payload),
    dtoOnly: true,
    rawRowsExposed: false,
  };
}
