import type { MarketHomeFilters, MarketHomeListingCard, MarketSide } from "./marketHome.types";

const MARKET_LISTING_CACHE_TTL_MS = 5 * 60 * 1000;
const MARKET_LISTING_CACHE_MAX = 80;
const MARKET_FEED_CACHE_TTL_MS = 5 * 60 * 1000;
const MARKET_FEED_CACHE_MAX = 12;
const MARKET_FEED_LISTING_MAX = 80;

export type MarketInstantFeedState = {
  listings: MarketHomeListingCard[];
  totalCount: number;
  hasMore: boolean;
  offset: number;
};

type CacheEntry = {
  listing: MarketHomeListingCard;
  storedAt: number;
};

type FeedCacheEntry = {
  feed: MarketInstantFeedState;
  storedAt: number;
};

const listingCache = new Map<string, CacheEntry>();
const feedCache = new Map<string, FeedCacheEntry>();

function pruneExpired(now: number) {
  for (const [id, entry] of listingCache.entries()) {
    if (now - entry.storedAt > MARKET_LISTING_CACHE_TTL_MS) {
      listingCache.delete(id);
    }
  }
  for (const [key, entry] of feedCache.entries()) {
    if (now - entry.storedAt > MARKET_FEED_CACHE_TTL_MS) {
      feedCache.delete(key);
    }
  }
}

function trimToMaxSize() {
  while (listingCache.size > MARKET_LISTING_CACHE_MAX) {
    const oldestKey = listingCache.keys().next().value;
    if (!oldestKey) return;
    listingCache.delete(oldestKey);
  }
  while (feedCache.size > MARKET_FEED_CACHE_MAX) {
    const oldestKey = feedCache.keys().next().value;
    if (!oldestKey) return;
    feedCache.delete(oldestKey);
  }
}

function cloneFeed(feed: MarketInstantFeedState): MarketInstantFeedState {
  return {
    listings: feed.listings.slice(0, MARKET_FEED_LISTING_MAX),
    totalCount: Math.max(0, Number(feed.totalCount) || 0),
    hasMore: feed.hasMore,
    offset: Math.max(0, Number(feed.offset) || feed.listings.length),
  };
}

function normalizeFeedSide(value: unknown): MarketSide | "all" {
  return value === "offer" || value === "demand" ? value : "all";
}

function normalizeFeedKind(value: unknown): MarketHomeFilters["kind"] {
  return value === "material" || value === "work" || value === "service" || value === "rent" ? value : "all";
}

export function getMarketFeedCacheKey(
  filters: Partial<Pick<MarketHomeFilters, "side" | "kind">> | null | undefined,
) {
  return `${normalizeFeedSide(filters?.side)}:${normalizeFeedKind(filters?.kind)}`;
}

function listingMatchesFeedKey(listing: MarketHomeListingCard, key: string) {
  const [side, kind] = key.split(":");
  if (side !== "all" && listing.side !== side) return false;
  if (kind !== "all" && listing.kind !== kind) return false;
  return true;
}

export function storeMarketListingForInstantOpen(listing: MarketHomeListingCard) {
  const id = String(listing.id || "").trim();
  if (!id) return;
  const now = Date.now();
  pruneExpired(now);
  listingCache.delete(id);
  listingCache.set(id, { listing, storedAt: now });
  trimToMaxSize();
}

export function storeMarketListingsForInstantOpen(listings: readonly MarketHomeListingCard[]) {
  listings.forEach(storeMarketListingForInstantOpen);
}

export function storeMarketFeedForInstantOpen(
  filters: Partial<Pick<MarketHomeFilters, "side" | "kind">> | null | undefined,
  feed: MarketInstantFeedState,
) {
  const now = Date.now();
  const key = getMarketFeedCacheKey(filters);
  const nextFeed = cloneFeed(feed);
  pruneExpired(now);
  storeMarketListingsForInstantOpen(nextFeed.listings);
  feedCache.delete(key);
  feedCache.set(key, { feed: nextFeed, storedAt: now });
  trimToMaxSize();
}

export function upsertMarketFeedListingForInstantOpen(listing: MarketHomeListingCard) {
  const id = String(listing.id || "").trim();
  if (!id) return;
  const now = Date.now();
  pruneExpired(now);
  storeMarketListingForInstantOpen(listing);

  const keys = new Set([
    getMarketFeedCacheKey({ side: "all", kind: "all" }),
    getMarketFeedCacheKey({ side: listing.side, kind: "all" }),
    getMarketFeedCacheKey({ side: "all", kind: normalizeFeedKind(listing.kind) }),
    getMarketFeedCacheKey({ side: listing.side, kind: normalizeFeedKind(listing.kind) }),
  ]);

  for (const key of keys) {
    const current = feedCache.get(key)?.feed ?? {
      listings: [],
      totalCount: 0,
      hasMore: false,
      offset: 0,
    };
    if (!listingMatchesFeedKey(listing, key)) continue;
    const withoutDuplicate = current.listings.filter((item) => item.id !== id);
    const listings = [listing, ...withoutDuplicate].slice(0, MARKET_FEED_LISTING_MAX);
    const wasAlreadyPresent = withoutDuplicate.length !== current.listings.length;
    const nextFeed = cloneFeed({
      listings,
      totalCount: Math.max(listings.length, current.totalCount + (wasAlreadyPresent ? 0 : 1)),
      hasMore: current.hasMore,
      offset: listings.length,
    });
    feedCache.delete(key);
    feedCache.set(key, { feed: nextFeed, storedAt: now });
  }

  trimToMaxSize();
}

export function getMarketFeedForInstantOpen(
  filters: Partial<Pick<MarketHomeFilters, "side" | "kind">> | null | undefined,
): MarketInstantFeedState | null {
  const now = Date.now();
  pruneExpired(now);
  const key = getMarketFeedCacheKey(filters);
  const entry = feedCache.get(key);
  if (!entry) return null;
  feedCache.delete(key);
  feedCache.set(key, entry);
  return cloneFeed(entry.feed);
}

export function getMarketListingForInstantOpen(id: string | null | undefined): MarketHomeListingCard | null {
  const listingId = String(id || "").trim();
  if (!listingId) return null;
  const now = Date.now();
  pruneExpired(now);
  const entry = listingCache.get(listingId);
  if (!entry) return null;
  listingCache.delete(listingId);
  listingCache.set(listingId, entry);
  return entry.listing;
}
