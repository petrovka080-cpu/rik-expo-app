import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { MARKET_HOME_COLORS } from "../../src/features/market/marketHome.colors";
import { MARKET_TAB_ROUTE } from "../../src/features/market/market.routes";
import { getMarketListingForInstantOpen } from "../../src/features/market/marketListingInstantCache";
import type { MarketHomeListingCard } from "../../src/features/market/marketHome.types";
import { waitForProductDetailBackgroundSlot } from "../../src/features/market/productDetailBackgroundSlot";
import { safeBack } from "../../src/lib/navigation/safeBack";

type ProductBoundaryObservationInput =
  Parameters<typeof import("../../src/lib/observability/platformObservability").recordPlatformObservability>[0];

const MARKET_PRODUCT_SURFACE = "product_details";
const MARKET_PRODUCT_ROUTE_PATH = "/product/[id]";
const MARKET_ALERT_TITLE = "Маркет";

const ProductDetailsContent = React.lazy(async () => import("../../src/features/market/ProductDetailsContent"));

function readWebProductIdFromLocation(): string | undefined {
  if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
  const match = window.location.pathname.match(/\/product\/([^/?#]+)/);
  if (!match?.[1]) return undefined;
  try {
    return decodeURIComponent(match[1]).trim() || undefined;
  } catch {
    return match[1].trim() || undefined;
  }
}

async function recordProductOpenObservability(row: MarketHomeListingCard) {
  const { recordPlatformObservability } = await import("../../src/lib/observability/platformObservability");
  recordPlatformObservability({
    screen: "market",
    surface: MARKET_PRODUCT_SURFACE,
    category: "ui",
    event: "market_open_item",
    result: "success",
    extra: {
      listingId: row.id,
      source: row.source,
      directRoute: true,
    },
  });
}

function getProductRouteErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      errorClass: String(error.name || "Error").trim() || "Error",
      errorMessage: String(error.message || "").trim() || "Unknown product route error",
    };
  }
  return {
    errorClass: "UnknownError",
    errorMessage: String(error ?? "Unknown product route error").trim() || "Unknown product route error",
  };
}

async function recordProductRouteBoundaryEvent(input: ProductBoundaryObservationInput) {
  const { recordPlatformObservability } = await import("../../src/lib/observability/platformObservability");
  recordPlatformObservability(input);
}

function mergeProductDetailRefresh(
  current: MarketHomeListingCard | null,
  refreshed: MarketHomeListingCard,
): MarketHomeListingCard {
  if (!current || current.id !== refreshed.id) return refreshed;
  const imageUrls = refreshed.imageUrls.length > 0 ? refreshed.imageUrls : current.imageUrls;
  const videoUrls = refreshed.videoUrls.length > 0 ? refreshed.videoUrls : current.videoUrls;
  return {
    ...current,
    ...refreshed,
    imageUrl: refreshed.imageUrl ?? current.imageUrl ?? imageUrls[0] ?? null,
    imageUrls,
    videoUrl: refreshed.videoUrl ?? current.videoUrl ?? videoUrls[0] ?? null,
    videoUrls,
  };
}

type ProductRouteErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
  retryNonce: number;
};

class ProductRouteErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ProductRouteErrorBoundaryState
> {
  state: ProductRouteErrorBoundaryState = {
    hasError: false,
    error: null,
    retryNonce: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<ProductRouteErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const details = getProductRouteErrorDetails(error);
    void recordProductRouteBoundaryEvent({
      screen: "product",
      surface: "screen_boundary",
      category: "ui",
      event: "screen_error",
      result: "error",
      errorClass: details.errorClass,
      errorMessage: details.errorMessage,
      extra: {
        module: "product",
        route: MARKET_PRODUCT_ROUTE_PATH,
        owner: "product_route_boundary",
        severity: "error",
        retryAllowed: true,
        backAvailable: true,
        componentStack: String(info.componentStack || "").trim().slice(0, 2000),
      },
    });
  }

  handleRetry = () => {
    void recordProductRouteBoundaryEvent({
      screen: "product",
      surface: "screen_boundary",
      category: "ui",
      event: "screen_error_retry",
      result: "success",
      extra: {
        module: "product",
        route: MARKET_PRODUCT_ROUTE_PATH,
        owner: "product_route_boundary",
        severity: "info",
        retryNonce: this.state.retryNonce + 1,
      },
    });
    this.setState((current) => ({
      hasError: false,
      error: null,
      retryNonce: current.retryNonce + 1,
    }));
  };

  handleBack = () => {
    const navigationResult = safeBack(router, MARKET_TAB_ROUTE);
    void recordProductRouteBoundaryEvent({
      screen: "product",
      surface: "screen_boundary",
      category: "ui",
      event: "screen_error_back",
      result: "success",
      fallbackUsed: navigationResult === "fallback",
      extra: {
        module: "product",
        route: MARKET_PRODUCT_ROUTE_PATH,
        owner: "product_route_boundary",
        severity: "info",
        navigationResult,
      },
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.center} testID="market_product_error_boundary">
          <Text style={styles.stateTitle}>Не удалось открыть объявление</Text>
          <Text style={styles.stateText}>Попробуйте снова или вернитесь в маркет.</Text>
          <Pressable style={styles.primaryBtn} onPress={this.handleRetry}>
            <Text style={styles.primaryBtnText}>Попробовать снова</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={this.handleBack}>
            <Text style={styles.secondaryActionText}>Назад в маркет</Text>
          </Pressable>
        </View>
      );
    }

    return <React.Fragment key={this.state.retryNonce}>{this.props.children}</React.Fragment>;
  }
}

function withScreenErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options: { screen: "product"; route: string; title: string },
) {
  const WrappedProductRoute = (props: P) => (
    <ProductRouteErrorBoundary>
      <Component {...props} />
    </ProductRouteErrorBoundary>
  );
  WrappedProductRoute.displayName =
    `withScreenErrorBoundary(${Component.displayName || Component.name || "ProductDetailsScreen"}:${options.route})`;
  return WrappedProductRoute;
}

function ProductDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const routeId = typeof rawId === "string" ? rawId.trim() : undefined;
  const id = routeId || readWebProductIdFromLocation();
  const initialInstantRowRef = React.useRef<MarketHomeListingCard | null | undefined>(undefined);
  if (initialInstantRowRef.current === undefined && id) {
    initialInstantRowRef.current = getMarketListingForInstantOpen(id);
  }
  const [rowState, setRow] = useState<MarketHomeListingCard | null>(() => initialInstantRowRef.current ?? null);
  const [loading, setLoading] = useState(() => !initialInstantRowRef.current);
  const visibleRow = rowState ?? initialInstantRowRef.current ?? null;

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      let renderedInstantRow = Boolean(initialInstantRowRef.current);

      try {
        const cachedRow = getMarketListingForInstantOpen(id);
        if (cachedRow) {
          renderedInstantRow = true;
          setRow(cachedRow);
          setLoading(false);
        }
        if (renderedInstantRow) {
          await waitForProductDetailBackgroundSlot();
          if (!active) return;
        }
        const repository = await import("../../src/features/market/market.repository");
        const nextRow = await repository.loadMarketListingById(id);
        if (!active) return;
        if (nextRow) {
          setRow((current) => mergeProductDetailRefresh(current, nextRow));
        } else if (!renderedInstantRow) {
          setRow(null);
        }
        if (nextRow) void recordProductOpenObservability(nextRow);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Не удалось открыть объявление.";
        if (!renderedInstantRow) Alert.alert(MARKET_ALERT_TITLE, message);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading && !visibleRow) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={MARKET_HOME_COLORS.accent} />
        <Text style={styles.stateText}>Открываем объявление...</Text>
      </View>
    );
  }

  if (!visibleRow) {
    return (
      <View style={styles.center}>
        <Text style={styles.stateTitle}>Объявление не найдено</Text>
        <Pressable style={styles.primaryBtn} onPress={() => safeBack(router, MARKET_TAB_ROUTE)}>
          <Text style={styles.primaryBtnText}>Назад</Text>
        </Pressable>
      </View>
    );
  }

  const row = visibleRow;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => safeBack(router, MARKET_TAB_ROUTE)}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle} testID="market_product_instant_title" numberOfLines={1}>
            {row.title}
          </Text>
          <Text style={styles.headerSub}>
            {row.kindLabel} • {row.sideLabel}
          </Text>
        </View>
      </View>

      <React.Suspense fallback={<View style={styles.contentPlaceholder} />}>
        <ProductDetailsContent row={row} />
      </React.Suspense>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: MARKET_HOME_COLORS.background,
  },
  header: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: MARKET_HOME_COLORS.border,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: MARKET_HOME_COLORS.background,
  },
  headerCopy: {
    flex: 1,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: MARKET_HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 30,
    lineHeight: 32,
    fontWeight: "900",
  },
  headerTitle: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 20,
    fontWeight: "900",
  },
  headerSub: {
    color: MARKET_HOME_COLORS.textSoft,
    marginTop: 4,
    fontWeight: "600",
  },
  contentPlaceholder: {
    flex: 1,
    backgroundColor: MARKET_HOME_COLORS.background,
  },
  center: {
    flex: 1,
    backgroundColor: MARKET_HOME_COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  stateTitle: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 18,
    fontWeight: "900",
  },
  stateText: {
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 14,
    fontWeight: "600",
  },
  primaryBtn: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: MARKET_HOME_COLORS.accentStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  secondaryBtn: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: {
    color: MARKET_HOME_COLORS.accentStrong,
    fontWeight: "800",
  },
});

export default withScreenErrorBoundary(ProductDetailsScreen, {
  screen: "product",
  route: MARKET_PRODUCT_ROUTE_PATH,
  title: "Не удалось открыть объявление",
});
