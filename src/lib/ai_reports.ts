import { supabase } from "./supabaseClient";

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

function getSupabaseAny() {
  return supabase as any;
}

export async function loadAiConfig(id = "procurement_system_prompt"): Promise<string | null> {
  const sb = getSupabaseAny();
  const { data, error } = await sb
    .from("ai_configs")
    .select("content")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.warn("[loadAiConfig]", error.message || error);
    return null;
  }

  return typeof data?.content === "string" ? data.content : null;
}

export async function saveAiReport(input: SaveAiReportInput): Promise<boolean> {
  const sb = getSupabaseAny();
  const { error } = await sb.from("ai_reports").upsert({
    id: input.id,
    company_id: input.companyId || null,
    user_id: input.userId || null,
    role: input.role || null,
    context: input.context || null,
    title: input.title || null,
    content: input.content,
    metadata: input.metadata || {},
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.warn("[saveAiReport]", error.message || error);
    return false;
  }

  return true;
}

export async function analyzePriceHistory(
  rikCode: string,
  currentPrice: number,
  companyId?: string | null,
): Promise<PriceAnalysis | null> {
  const sb = getSupabaseAny();
  let query = sb
    .from("proposal_items")
    .select("price, supplier, created_at, proposals!inner(company_id)")
    .eq("rik_code", rikCode)
    .not("price", "is", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (companyId) {
    query = query.eq("proposals.company_id", companyId);
  }

  const { data, error } = await query;
  if (error || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  const prices = data
    .map((row: any) => Number(row.price))
    .filter((price: number) => Number.isFinite(price) && price > 0);

  if (prices.length === 0) return null;

  const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const lastPrice = prices[0];
  const priceChange = lastPrice > 0 ? ((currentPrice - lastPrice) / lastPrice) * 100 : 0;

  let recommendation: PriceAnalysis["recommendation"] = "average";
  if (currentPrice <= minPrice * 1.1) recommendation = "good";
  else if (currentPrice >= maxPrice * 0.9) recommendation = "expensive";

  return {
    averagePrice,
    minPrice,
    maxPrice,
    lastPrice,
    priceChange,
    recommendation,
    history: data.slice(0, 5).map((row: any) => ({
      date: row.created_at,
      price: Number(row.price) || 0,
      supplier: String(row.supplier || ""),
    })),
  };
}

export async function getSupplierRecommendations(
  rikCode: string,
  limit = 5,
  companyId?: string | null,
): Promise<SupplierScore[]> {
  const sb = getSupabaseAny();
  let query = sb
    .from("proposal_items")
    .select("supplier, price, created_at, proposals!inner(company_id)")
    .eq("rik_code", rikCode)
    .not("supplier", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (companyId) {
    query = query.eq("proposals.company_id", companyId);
  }

  const { data, error } = await query;
  if (error || !Array.isArray(data) || data.length === 0) {
    return [];
  }

  const supplierMap = new Map<
    string,
    {
      orders: number;
      totalPrice: number;
      lastDate: string;
    }
  >();

  for (const row of data) {
    const supplier = String(row.supplier || "").trim();
    if (!supplier) continue;

    const existing = supplierMap.get(supplier) || {
      orders: 0,
      totalPrice: 0,
      lastDate: row.created_at,
    };

    existing.orders += 1;
    existing.totalPrice += Number(row.price) || 0;
    if (row.created_at > existing.lastDate) {
      existing.lastDate = row.created_at;
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

  return scores.sort((a, b) => b.score - a.score).slice(0, limit);
}
