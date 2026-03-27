import { supabase } from "./supabaseClient";

export type MarketListingSearchResult = {
  id: string;
  title: string;
  price?: number | null;
  seller_company?: string | null;
  seller_name?: string | null;
};

const normalizeKind = (kind?: string): string | null => {
  const value = String(kind ?? "").trim().toLowerCase();
  return value ? value : null;
};

export async function searchMarketListings(
  query: string,
  limit = 6,
  kind?: "material" | "work" | "service" | "rent"
): Promise<MarketListingSearchResult[]> {
  const search = String(query ?? "").trim();
  if (!search || !supabase) return [];

  try {
    let builder = supabase
      .from("market_listings")
      .select("id,title,price,seller_company,seller_name,kind")
      .ilike("title", `%${search}%`)
      .limit(Math.max(1, Math.min(limit, 20)));

    const normalizedKind = normalizeKind(kind);
    if (normalizedKind) {
      builder = builder.eq("kind", normalizedKind);
    }

    const { data, error } = await builder;
    if (error || !Array.isArray(data)) return [];
    return data.map((row) => ({
      id: String(row.id ?? ""),
      title: String(row.title ?? ""),
      price: row.price == null ? null : Number(row.price),
      seller_company: row.seller_company == null ? null : String(row.seller_company),
      seller_name: row.seller_name == null ? null : String(row.seller_name),
    }));
  } catch {
    return [];
  }
}
