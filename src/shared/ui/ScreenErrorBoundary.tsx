import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.root} testID="screen-error-fallback">
          <View style={styles.card}>
            <Text style={styles.title}>{this.props.title || "Произошла ошибка"}</Text>
            <Text style={styles.subtitle}>
              Экран не удалось отрисовать. Попробуйте снова.
            </Text>
            {__DEV__ && this.state.error?.message ? (
              <Text style={styles.details}>{this.state.error.message}</Text>
            ) : null}
            <Pressable onPress={this.handleRetry} style={styles.button}>
              <Text style={styles.buttonText}>Попробовать снова</Text>
            </Pressable>
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
    borderRadius: 18,
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
  button: {
    marginTop: 6,
    borderRadius: 14,
    backgroundColor: "#22C55E",
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#04110A",
    fontSize: 14,
    fontWeight: "800",
  },
});
