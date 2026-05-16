import React from "react";
import { router, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { safeBack, type SafeBackRouterLike } from "../../lib/navigation/safeBack";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";

type ScreenBoundaryScreen =
  | "startup"
  | "auth"
  | "not_found"
  | "warehouse"
  | "contractor"
  | "accountant"
  | "buyer"
  | "director"
  | "foreman"
  | "market"
  | "office"
  | "ai"
  | "profile"
  | "seller"
  | "add_listing"
  | "security"
  | "reports"
  | "chat"
  | "auctions"
  | "supplier_map"
  | "request"
  | "pdf_viewer"
  | "product"
  | "auction_detail"
  | "supplier_showcase"
  | "calculator"
  | "reports_dashboard";

type ScreenErrorBoundaryProps = {
  children: React.ReactNode;
  screen: ScreenBoundaryScreen;
  route: string;
  title?: string;
};

type ScreenErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
  retryNonce: number;
};

const SCREEN_ERROR_FALLBACK_ROUTE = "/" as Href;

const isScreenErrorDebugEnabled = () =>
  typeof __DEV__ !== "undefined" &&
  __DEV__ &&
  String(process.env.EXPO_PUBLIC_SCREEN_ERROR_DEBUG ?? "").trim() === "1";

const getErrorDetails = (error: unknown) => {
  if (error instanceof Error) {
    return {
      errorClass: String(error.name || "Error").trim() || "Error",
      errorMessage: String(error.message || "").trim() || "Unknown screen error",
    };
  }
  return {
    errorClass: "UnknownError",
    errorMessage: String(error ?? "Unknown screen error").trim() || "Unknown screen error",
  };
};

class ScreenErrorBoundary extends React.Component<
  ScreenErrorBoundaryProps,
  ScreenErrorBoundaryState
> {
  state: ScreenErrorBoundaryState = {
    hasError: false,
    error: null,
    retryNonce: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<ScreenErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const details = getErrorDetails(error);
    recordPlatformObservability({
      screen: this.props.screen,
      surface: "screen_boundary",
      category: "ui",
      event: "screen_error",
      result: "error",
      errorClass: details.errorClass,
      errorMessage: details.errorMessage,
      extra: {
        module: this.props.screen,
        route: this.props.route,
        role: this.props.screen,
        owner: "screen_boundary",
        severity: "error",
        retryAllowed: true,
        backAvailable: true,
        componentStack: String(info.componentStack || "").trim().slice(0, 2000),
      },
    });
  }

  handleRetry = () => {
    recordPlatformObservability({
      screen: this.props.screen,
      surface: "screen_boundary",
      category: "ui",
      event: "screen_error_retry",
      result: "success",
      extra: {
        module: this.props.screen,
        route: this.props.route,
        role: this.props.screen,
        owner: "screen_boundary",
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
    const navigationResult = safeBack(
      router as SafeBackRouterLike,
      SCREEN_ERROR_FALLBACK_ROUTE,
    );
    recordPlatformObservability({
      screen: this.props.screen,
      surface: "screen_boundary",
      category: "ui",
      event: "screen_error_back",
      result: "success",
      fallbackUsed: navigationResult === "fallback",
      extra: {
        module: this.props.screen,
        route: this.props.route,
        role: this.props.screen,
        owner: "screen_boundary",
        severity: "info",
        navigationResult,
      },
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.root} testID="screen-error-fallback">
          <View style={styles.card}>
            <Text style={styles.title}>{this.props.title || "Произошла ошибка"}</Text>
            <Text style={styles.subtitle}>
              Экран не удалось отрисовать. Попробуйте снова или вернитесь назад.
            </Text>
            {isScreenErrorDebugEnabled() && this.state.error?.message ? (
              <Text style={styles.details}>{this.state.error.message}</Text>
            ) : null}
            <View style={styles.actions}>
              <Pressable onPress={this.handleRetry} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Попробовать снова</Text>
              </Pressable>
              <Pressable onPress={this.handleBack} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Назад</Text>
              </Pressable>
            </View>
          </View>
        </View>
      );
    }

    return <React.Fragment key={this.state.retryNonce}>{this.props.children}</React.Fragment>;
  }
}

export function withScreenErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    screen: ScreenBoundaryScreen;
    route: string;
    title?: string;
  },
) {
  const WrappedScreen = (props: P) => (
    <ScreenErrorBoundary
      screen={options.screen}
      route={options.route}
      title={options.title}
    >
      <Component {...props} />
    </ScreenErrorBoundary>
  );

  WrappedScreen.displayName = `withScreenErrorBoundary(${
    Component.displayName || Component.name || "Screen"
  })`;

  return WrappedScreen;
}

export default ScreenErrorBoundary;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#0B1220",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#111827",
    padding: 20,
    gap: 10,
  },
  title: {
    color: "#F9FAFB",
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
  },
  details: {
    color: "#FCA5A5",
    fontSize: 12,
    lineHeight: 18,
  },
  actions: {
    marginTop: 6,
    gap: 8,
  },
  primaryButton: {
    borderRadius: 8,
    backgroundColor: "#22C55E",
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#04110A",
    fontSize: 14,
    fontWeight: "800",
  },
  secondaryButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(203,213,225,0.45)",
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "800",
  },
});
