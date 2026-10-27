import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { MARKET_HOME_COLORS } from "../marketHome.colors";
import type { MarketHomeListingCard } from "../marketHome.types";

type MyListingsPhase = "loading" | "ready" | "empty" | "error";

type Props = {
  listings: MarketHomeListingCard[];
  totalCount: number;
  phase: MyListingsPhase;
  errorText: string | null;
  onOpenListing: (listing: MarketHomeListingCard) => void;
  onOpenAddListing: () => void;
  onRefresh: () => void;
};

const COPY = {
  create: "\u041f\u043e\u0434\u0430\u0442\u044c \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u0435",
  title: "\u041c\u043e\u0438 \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u044f",
  emptyTitle: "\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u043f\u043e\u043a\u0430 \u043f\u0443\u0441\u0442\u0430",
  emptyText: "\u041e\u043f\u0443\u0431\u043b\u0438\u043a\u0443\u0439\u0442\u0435 \u043f\u0435\u0440\u0432\u043e\u0435 \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u0435, \u0438 \u043e\u043d\u043e \u043f\u043e\u044f\u0432\u0438\u0442\u0441\u044f \u0437\u0434\u0435\u0441\u044c.",
  errorTitle: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u043c\u043e\u0438 \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u044f",
  retry: "\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c",
  open: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c",
  priceRequest: "\u0426\u0435\u043d\u0430 \u043f\u043e \u0437\u0430\u043f\u0440\u043e\u0441\u0443",
  photos: "\u0444\u043e\u0442\u043e",
  video: "\u0412\u0438\u0434\u0435\u043e",
  updated: "\u043e\u0431\u043d.",
  created: "\u0441\u043e\u0437\u0434.",
} as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUS_SUMMARY_LABELS: Record<string, string> = {
  active: "\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0435",
  published: "\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0435",
  draft: "\u0427\u0435\u0440\u043d\u043e\u0432\u0438\u043a\u0438",
  inactive: "\u041d\u0435\u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0435",
  archived: "\u0421\u043d\u044f\u0442\u044b\u0435",
  pending: "\u041d\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0435",
};

function safeListingTitle(listing: MarketHomeListingCard): string {
  const title = String(listing.title ?? "").trim();
  if (!title || UUID_RE.test(title)) return "\u041e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u0435";
  return title;
}

function formatPrice(listing: MarketHomeListingCard): string {
  if (listing.price == null) return COPY.priceRequest;
  return `${listing.price.toLocaleString("ru-RU")} \u0441\u043e\u043c${listing.unit ? ` / ${listing.unit}` : ""}`;
}

function formatDate(value: string | null | undefined): string {
  const time = Date.parse(String(value ?? ""));
  if (!Number.isFinite(time)) return "";
  return new Date(time).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function buildStatusSummary(listings: readonly MarketHomeListingCard[]): string {
  const counts = new Map<string, number>();
  listings.forEach((listing) => {
    const status = String(listing.status || "active").trim().toLowerCase() || "active";
    const label = STATUS_SUMMARY_LABELS[status] ?? "\u0414\u0440\u0443\u0433\u0438\u0435";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([status, count]) => `${status}: ${count.toLocaleString("ru-RU")}`)
    .join("  ");
}

function formatListingCount(count: number): string {
  const safeCount = Math.max(0, Math.trunc(Number.isFinite(count) ? count : 0));
  const mod10 = safeCount % 10;
  const mod100 = safeCount % 100;
  const word = mod10 === 1 && mod100 !== 11
    ? "\u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u0435"
    : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
      ? "\u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u044f"
      : "\u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u0439";
  return `${safeCount.toLocaleString("ru-RU")} ${word}`;
}

function MarketMyListingCard({
  listing,
  onOpen,
}: {
  listing: MarketHomeListingCard;
  onOpen: () => void;
}) {
  const photoCount = listing.imageUrls.length || (listing.imageUrl ? 1 : 0);
  const videoCount = listing.videoUrls.length || (listing.videoUrl ? 1 : 0);
  const mediaCount = photoCount + videoCount;
  const hasVideo = videoCount > 0;
  const updated = formatDate((listing as { updated_at?: string | null }).updated_at ?? listing.created_at);
  const created = formatDate(listing.created_at);
  const imageSource = listing.imageUrl ? { uri: listing.imageUrl } : listing.imageSource;

  return (
    <View style={styles.card} testID={`market-my-listings-card_${listing.id}`}>
      <Pressable style={styles.cardOpenArea} onPress={onOpen} testID={`market-my-listings-open-area_${listing.id}`}>
        <View style={styles.mediaShell}>
          <Image
            testID={`market_my_listing_image_${listing.id}`}
            source={imageSource}
            resizeMode="cover"
            style={styles.media}
          />
          {hasVideo ? (
            <View style={styles.videoBadge} testID={`market_my_listing_video_badge_${listing.id}`}>
              <Ionicons name="play-circle" size={14} color="#FFFFFF" />
              <Text style={styles.videoBadgeText}>{COPY.video}</Text>
            </View>
          ) : null}
          <View style={styles.mediaCount}>
            <Ionicons name="images-outline" size={13} color="#FFFFFF" />
            <Text style={styles.mediaCountText}>
              {mediaCount} {COPY.photos}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={3}>
            {safeListingTitle(listing)}
          </Text>
          <Text style={styles.metaLine} numberOfLines={1}>
            {listing.kindLabel}{listing.city ? ` \u00b7 ${listing.city}` : ""}
          </Text>
          <Text style={styles.priceLine} numberOfLines={1}>
            {formatPrice(listing)}
          </Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusPill} numberOfLines={1}>
              {listing.statusLabel}
            </Text>
            <Text style={styles.dateText} numberOfLines={1}>
              {updated ? `${COPY.updated} ${updated}` : created ? `${COPY.created} ${created}` : ""}
            </Text>
          </View>
          <Pressable
            style={styles.openButton}
            onPress={onOpen}
            testID={`market-my-listings-open_${listing.id}`}
          >
            <Ionicons name="open-outline" size={15} color="#FFFFFF" />
            <Text style={styles.openButtonText}>{COPY.open}</Text>
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

export default function MarketMyListingsBlock({
  listings,
  totalCount,
  phase,
  errorText,
  onOpenListing,
  onOpenAddListing,
  onRefresh,
}: Props) {
  const statusSummary = useMemo(() => buildStatusSummary(listings), [listings]);
  const isLoading = phase === "loading";
  const hasListings = listings.length > 0;

  return (
    <View style={styles.root} testID="market-my-listings-block">
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{COPY.title}</Text>
          <Text style={styles.summary} testID="market-my-listings-status-summary" numberOfLines={1}>
            {statusSummary || formatListingCount(totalCount)}
          </Text>
        </View>
        <Pressable
          style={styles.createButton}
          onPress={onOpenAddListing}
          testID="market-my-listings-create"
          accessibilityLabel={COPY.create}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.createButtonText}>{COPY.create}</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.stateRow} testID="market-my-listings-loading">
          <ActivityIndicator color={MARKET_HOME_COLORS.accentStrong} />
        </View>
      ) : null}

      {phase === "error" ? (
        <View style={styles.stateBox} testID="market-my-listings-error">
          <Text style={styles.stateTitle}>{COPY.errorTitle}</Text>
          <Text style={styles.stateText}>{errorText}</Text>
          <Pressable style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>{COPY.retry}</Text>
          </Pressable>
        </View>
      ) : null}

      {phase === "empty" ? (
        <View style={styles.stateBox} testID="market-my-listings-empty-state">
          <Text style={styles.stateTitle}>{COPY.emptyTitle}</Text>
          <Text style={styles.stateText}>{COPY.emptyText}</Text>
        </View>
      ) : null}

      {hasListings ? (
        <View style={styles.list} testID="market-my-listings-history">
          {listings.map((listing) => (
            <MarketMyListingCard
              key={listing.id}
              listing={listing}
              onOpen={() => onOpenListing(listing)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 20,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "900",
  },
  summary: {
    marginTop: 4,
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  createButton: {
    minHeight: 42,
    maxWidth: 184,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: MARKET_HOME_COLORS.accentStrong,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  createButtonText: {
    flexShrink: 1,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  list: {
    gap: 12,
  },
  card: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: MARKET_HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
  },
  cardOpenArea: {
    flexDirection: "row",
    minHeight: 132,
  },
  mediaShell: {
    position: "relative",
    width: 144,
    minHeight: 132,
    backgroundColor: "#E2E8F0",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  videoBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    minHeight: 26,
    borderRadius: 8,
    backgroundColor: "rgba(15, 23, 42, 0.78)",
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  videoBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  mediaCount: {
    position: "absolute",
    left: 8,
    bottom: 8,
    minHeight: 26,
    borderRadius: 8,
    backgroundColor: "rgba(15, 23, 42, 0.78)",
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mediaCountText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    padding: 12,
    gap: 6,
  },
  cardTitle: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
  },
  metaLine: {
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  priceLine: {
    color: MARKET_HOME_COLORS.accentStrong,
    fontSize: 15,
    fontWeight: "900",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  statusPill: {
    maxWidth: 112,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: MARKET_HOME_COLORS.accentSoft,
    color: MARKET_HOME_COLORS.text,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
  },
  dateText: {
    flex: 1,
    textAlign: "right",
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 11,
    fontWeight: "700",
  },
  openButton: {
    marginTop: 2,
    alignSelf: "flex-start",
    minHeight: 34,
    minWidth: 126,
    borderRadius: 8,
    backgroundColor: MARKET_HOME_COLORS.accentStrong,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 12,
  },
  openButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  stateRow: {
    minHeight: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
    backgroundColor: MARKET_HOME_COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  stateBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
    backgroundColor: MARKET_HOME_COLORS.surface,
    padding: 14,
    gap: 8,
  },
  stateTitle: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 15,
    fontWeight: "900",
  },
  stateText: {
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  retryButton: {
    alignSelf: "flex-start",
    minHeight: 36,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  retryButtonText: {
    color: MARKET_HOME_COLORS.accentStrong,
    fontSize: 12,
    fontWeight: "900",
  },
});
