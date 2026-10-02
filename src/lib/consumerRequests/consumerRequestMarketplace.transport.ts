import type { Json } from "../database.types";

export type ConsumerEstimateMarketplacePublishInput = {
  localRequestId: string;
  revisionId: string;
  releaseId: string;
  artifactId: string;
  idempotencyKey: string;
  expectedRevisionChecksumSha256: string;
  expectedArtifactSha256: string;
  canonicalCatalogId: string;
  title: string;
  description: string;
  city: string;
  addressText: string;
  contactPhone: string;
  expectedRowCount: number;
  items: Json[];
};

export type ConsumerEstimateMarketplacePublishRow = {
  listing_id: string;
  created: boolean;
  server_status: string;
  revision_id: string;
  release_id: string;
  artifact_id: string;
};

export type ConsumerEstimateMarketplaceListingRow = {
  id: string;
  user_id: string;
  status: string;
  client_mutation_id: string | null;
  items_json: Json | null;
};

export type ConsumerEstimateMarketplaceTransport = {
  publish(
    input: ConsumerEstimateMarketplacePublishInput,
  ): Promise<ConsumerEstimateMarketplacePublishRow>;
  readPublishedListing(listingId: string): Promise<ConsumerEstimateMarketplaceListingRow>;
};

function onePublishRow(value: unknown): ConsumerEstimateMarketplacePublishRow {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") {
    throw new Error("CONSUMER_MARKETPLACE_PUBLISH_RECEIPT_MISSING");
  }
  return row as ConsumerEstimateMarketplacePublishRow;
}

export const consumerEstimateMarketplaceTransport: ConsumerEstimateMarketplaceTransport = {
  async publish(input) {
    // Keep the transport owner lazy. Pure estimate/audit processes import the
    // request service in Node and must not initialize React Native storage just
    // because the live marketplace boundary is available to the application.
    const { supabase } = await import("../supabaseClient");
    const { data, error } = await supabase.rpc(
      "consumer_estimate_marketplace_publish_v1" as never,
      {
        p_local_request_id: input.localRequestId,
        p_revision_id: input.revisionId,
        p_release_id: input.releaseId,
        p_artifact_id: input.artifactId,
        p_idempotency_key: input.idempotencyKey,
        p_expected_revision_checksum_sha256: input.expectedRevisionChecksumSha256,
        p_expected_artifact_sha256: input.expectedArtifactSha256,
        p_canonical_catalog_id: input.canonicalCatalogId,
        p_title: input.title,
        p_description: input.description,
        p_city: input.city,
        p_address_text: input.addressText,
        p_contact_phone: input.contactPhone,
        p_expected_row_count: input.expectedRowCount,
        p_items: input.items,
      } as never,
    );
    if (error) throw error;
    return onePublishRow(data);
  },

  async readPublishedListing(listingId) {
    const { supabase } = await import("../supabaseClient");
    const { data, error } = await supabase
      .from("market_listings")
      .select("id,user_id,status,client_mutation_id,items_json")
      .eq("id", listingId)
      .in("status", ["active", "published", "draft"])
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("CONSUMER_MARKETPLACE_LISTING_READBACK_MISSING");
    return data;
  },
};
