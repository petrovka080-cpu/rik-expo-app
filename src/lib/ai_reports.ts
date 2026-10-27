import {
  loadAiConfigRow,
  loadProposalHistoryRowsTransport,
  upsertAiReport,
} from "./ai_reports.transport";
import {
  SENSITIVE_REDACTION_MARKER,
  redactSensitiveText,
} from "./security/redaction";

type PriceHistoryItem = {
  date: string;
  price: number;
  supplier: string;
};

export type PriceAnalysis = {
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  lastPrice: number;
  priceChange: number;
  recommendation: "good" | "average" | "expensive";
  history: PriceHistoryItem[];
};

export type SupplierScore = {
  name: string;
  score: number;
  orderCount: number;
  avgPrice: number;
  lastOrderDate: string | null;
  specializations: string[];
};

export type SaveAiReportInput = {
  id: string;
  companyId?: string | null;
  userId?: string | null;
  role?: string | null;
  context?: string | null;
  title?: string | null;
  content: string;
  metadata?: Record<string, unknown> | null;
};

type ProposalHistoryRow = {
  price: number;
  supplier: string;
  createdAt: string;
};

const AI_REPORT_FULL_REDACT_KEYS = new Set([
  "apikey",
  "authorization",
  "authorizationheader",
  "companyid",
  "jwt",
  "providerpayload",
  "rawcontext",
  "rawprompt",
  "rawproviderpayload",
  "rawresponse",
  "servicerole",
  "supplierfinancialdetails",
  "token",
  "userid",
]);

const aiReportRawTextPattern =
  /\b(raw\s+(?:prompt|context|response|provider\s+payload)|api[_\s-]?key|authorization\s+header|service\s+role|jwt|token|user_id|company_id|supplier\s+financial\s+details)\s*[:=]\s*[^\n;]+/gi;

const normalizeMetadataKey = (key: string): string =>
  key.replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const toTrimmedText = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text || null;
};

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function redactAiReportStorageText(value: string): string {
  return redactSensitiveText(value).replace(aiReportRawTextPattern, (entry) => {
    const separatorIndex = Math.max(entry.indexOf(":"), entry.indexOf("="));
    const label = separatorIndex >= 0 ? entry.slice(0, separatorIndex) : entry;
    return `${label}: ${SENSITIVE_REDACTION_MARKER}`;
  });
}

const redactAiReportMetadataValue = (key: string, value: unknown): unknown => {
  if (AI_REPORT_FULL_REDACT_KEYS.has(normalizeMetadataKey(key))) {
    return SENSITIVE_REDACTION_MARKER;
  }
  if (value == null) return value;
  if (typeof value === "string") return redactAiReportStorageText(value);
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((entry) => redactAiReportMetadataValue(key, entry));
  }

  const redacted: Record<string, unknown> = {};
  for (const [nestedKey, nestedValue] of Object.entries(value)) {
    redacted[nestedKey] = redactAiReportMetadataValue(nestedKey, nestedValue);
  }
  return redacted;
};

export function redactAiReportForStorage(input: SaveAiReportInput): SaveAiReportInput {
  return {
    ...input,
    title: input.title ? redactAiReportStorageText(input.title) : input.title,
    content: redactAiReportStorageText(input.content),
    metadata: input.metadata
      ? Object.fromEntries(
          Object.entries(input.metadata).map(([key, value]) => [
            key,
            redactAiReportMetadataValue(key, value),
          ]),
        )
      : input.metadata,
  };
}

const normalizeProposalHistoryRows = (rows: unknown): ProposalHistoryRow[] => {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => {
      const record = asRecord(row);
      if (!record) return null;

      const price = toFiniteNumber(record.price);
      const createdAt = toTrimmedText(record.created_at);
      if (price == null || !createdAt || price <= 0) return null;

      return {
        price,
        supplier: toTrimmedText(record.supplier) || "",
        createdAt,
      } satisfies ProposalHistoryRow;
    })
    .filter((row): row is ProposalHistoryRow => Boolean(row));
};

export async function loadAiConfig(id = "procurement_system_prompt"): Promise<string | null> {
  const { data, error } = await loadAiConfigRow(id);

  if (error) {
    if (__DEV__) console.warn("[loadAiConfig]", error.message || error);
    return null;
  }

  const record = asRecord(data);
  return record ? toTrimmedText(record.content) : null;
}

export async function saveAiReport(input: SaveAiReportInput): Promise<boolean> {
  const { error } = await upsertAiReport(redactAiReportForStorage(input));

  if (error) {
    if (__DEV__) console.warn("[saveAiReport]", error.message || error);
    return false;
  }

  return true;
}

async function loadProposalHistoryRows(
  rikCode: string,
  companyId?: string | null,
): Promise<ProposalHistoryRow[]> {
  if (companyId && __DEV__) {
    console.warn("[loadProposalHistoryRows] companyId filter is ignored: proposals.company_id is absent in current schema");
  }

  const { data, error } = await loadProposalHistoryRowsTransport(rikCode);
  if (error) {
    if (__DEV__) console.warn("[loadProposalHistoryRows]", error.message || error);
    return [];
  }

  return normalizeProposalHistoryRows(data);
}

export async function analyzePriceHistory(
  rikCode: string,
  currentPrice: number,
  companyId?: string | null,
): Promise<PriceAnalysis | null> {
  const normalizedRikCode = toTrimmedText(rikCode);
  const normalizedCurrentPrice = toFiniteNumber(currentPrice);
  if (!normalizedRikCode || normalizedCurrentPrice == null || normalizedCurrentPrice <= 0) {
    return null;
  }

  const historyRows = await loadProposalHistoryRows(normalizedRikCode, companyId);
  if (!historyRows.length) return null;

  const prices = historyRows.map((row) => row.price).filter((price) => price > 0);
  if (!prices.length) return null;

  const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const lastPrice = prices[0] ?? normalizedCurrentPrice;
  const priceChange = lastPrice > 0 ? ((normalizedCurrentPrice - lastPrice) / lastPrice) * 100 : 0;

  let recommendation: PriceAnalysis["recommendation"] = "average";
  if (normalizedCurrentPrice <= minPrice * 1.1) recommendation = "good";
  else if (normalizedCurrentPrice >= maxPrice * 0.9) recommendation = "expensive";

  return {
    averagePrice,
    minPrice,
    maxPrice,
    lastPrice,
    priceChange,
    recommendation,
    history: historyRows.slice(0, 5).map((row) => ({
      date: row.createdAt,
      price: row.price,
      supplier: row.supplier,
    })),
  };
}

export async function getSupplierRecommendations(
  rikCode: string,
  limit = 5,
  companyId?: string | null,
): Promise<SupplierScore[]> {
  const normalizedRikCode = toTrimmedText(rikCode);
  if (!normalizedRikCode) return [];

  const historyRows = await loadProposalHistoryRows(normalizedRikCode, companyId);
  if (!historyRows.length) return [];

  const supplierMap = new Map<
    string,
    {
      orders: number;
      totalPrice: number;
      lastDate: string;
    }
  >();

  for (const row of historyRows) {
    const supplier = toTrimmedText(row.supplier);
    if (!supplier) continue;

    const existing = supplierMap.get(supplier) || {
      orders: 0,
      totalPrice: 0,
      lastDate: row.createdAt,
    };

    existing.orders += 1;
    existing.totalPrice += row.price;
    if (row.createdAt > existing.lastDate) {
      existing.lastDate = row.createdAt;
    }
    supplierMap.set(supplier, existing);
  }

  const scores: SupplierScore[] = [];
  for (const [name, stats] of supplierMap.entries()) {
    const avgPrice = stats.orders > 0 ? stats.totalPrice / stats.orders : 0;
    const recencyDays = Math.max(
      1,
      (Date.now() - new Date(stats.lastDate).getTime()) / (1000 * 60 * 60 * 24),
    );
    const score = (stats.orders * 10) / Math.sqrt(recencyDays);

    scores.push({
      name,
      score,
      orderCount: stats.orders,
      avgPrice,
      lastOrderDate: stats.lastDate,
      specializations: [],
    });
  }

  return scores.sort((a, b) => b.score - a.score).slice(0, Math.max(1, limit));
}
