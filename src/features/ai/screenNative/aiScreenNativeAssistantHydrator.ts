import { resolveDefaultScreenNativeScreenId } from "./aiScreenNativeAssistantRegistry";
import type { AiScreenNativeAssistantHydrationRequest } from "./aiScreenNativeAssistantTypes";

export type AiScreenNativeHydratedContext = {
  screenId: string;
  scopedFactsSummary: string | null;
  params: Record<string, string | string[] | undefined>;
  criticalTitle: string | null;
  criticalReason: string | null;
  readyOptionTitle: string | null;
  readyOptionDescription: string | null;
  riskTitle: string | null;
  riskReason: string | null;
  missingLabel: string | null;
  evidenceLabels: string[];
  today: {
    count?: number;
    amountLabel?: string;
    criticalCount?: number;
    overdueCount?: number;
    pendingApprovalCount?: number;
  };
};

function firstParam(params: Record<string, string | string[] | undefined> | undefined, key: string): string | undefined {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function splitParam(params: Record<string, string | string[] | undefined> | undefined, key: string): string[] {
  return clean(firstParam(params, key))
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function numberParam(params: Record<string, string | string[] | undefined> | undefined, key: string): number | undefined {
  const value = clean(firstParam(params, key)).replace(/\s+/g, "");
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function hydrateAiScreenNativeAssistantContext(
  request: AiScreenNativeAssistantHydrationRequest,
): AiScreenNativeHydratedContext {
  const params = request.searchParams ?? {};
  const screenId = clean(request.screenId || firstParam(params, "screenId"))
    || resolveDefaultScreenNativeScreenId(request.context);
  const evidenceLabels = [
    ...splitParam(params, "nativeEvidence"),
    ...splitParam(params, "screenEvidence"),
    ...splitParam(params, "paymentEvidence"),
    ...splitParam(params, "readyBuySupplierEvidence"),
    ...splitParam(params, "warehouseEvidence"),
    ...splitParam(params, "foremanEvidence"),
    ...splitParam(params, "directorEvidence"),
    ...splitParam(params, "documentEvidence"),
  ];

  return {
    screenId,
    scopedFactsSummary: request.scopedFactsSummary ?? null,
    params,
    criticalTitle: clean(firstParam(params, "criticalTitle")) || clean(firstParam(params, "paymentSupplierName")) || null,
    criticalReason: clean(firstParam(params, "criticalReason")) || clean(firstParam(params, "paymentRisk")) || clean(firstParam(params, "warehouseRisk")) || clean(firstParam(params, "foremanRisk")) || clean(firstParam(params, "directorDecisionReason")) || null,
    readyOptionTitle: clean(firstParam(params, "readyOptionTitle")) || clean(firstParam(params, "readyBuySupplierName")) || null,
    readyOptionDescription: clean(firstParam(params, "readyOptionDescription")) || clean(firstParam(params, "readyBuySupplierPrice")) || null,
    riskTitle: clean(firstParam(params, "riskTitle")) || null,
    riskReason: clean(firstParam(params, "riskReason")) || clean(firstParam(params, "paymentRisk")) || null,
    missingLabel: clean(firstParam(params, "missingLabel")) || clean(firstParam(params, "paymentMissingDocument")) || clean(firstParam(params, "warehouseMissingDocument")) || null,
    evidenceLabels,
    today: {
      count: numberParam(params, "todayCount"),
      amountLabel: clean(firstParam(params, "todayAmountLabel") || firstParam(params, "paymentTotalAmountLabel")) || undefined,
      criticalCount: numberParam(params, "criticalCount"),
      overdueCount: numberParam(params, "overdueCount"),
      pendingApprovalCount: numberParam(params, "pendingApprovalCount") ?? numberParam(params, "paymentApprovalCount"),
    },
  };
}
