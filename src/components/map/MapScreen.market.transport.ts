import { supabase } from "../../lib/supabaseClient";

export type MapScreenDemandOfferInsert = {
  demand_id: string;
  supplier_id: string;
  price: number;
  delivery_days: number | null;
  comment: string | null;
};

export async function submitMapScreenDemandOffer(payload: MapScreenDemandOfferInsert) {
  return await supabase.from("demand_offers").insert(payload);
}

export async function loadMapScreenListingRouteMeta(listingId: string) {
  const query = supabase.from("market_listings").select("id,title,user_id,company_id");
  return await query.eq("id", listingId).maybeSingle();
}
