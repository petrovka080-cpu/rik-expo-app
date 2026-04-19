import React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";

import type { DocumentAsset } from "../documents/pdfDocumentSessions";
import type { PdfViewerEmbeddedSource } from "./pdfViewerContract";
import { CenteredPanel } from "./pdfViewer.components";
import { styles } from "./pdfViewer.styles";

type NativeWebViewEvent = {
  nativeEvent?: {
    description?: string;
    statusCode?: number;
  };
};

type NativePdfWebViewComponent = React.ComponentType<any> | null;

type PdfViewerNativeHandoffShellProps = {
  mode: "native-handoff";
  asset: DocumentAsset | null;
  completed: boolean;
  onToggleChrome: () => void;
  onOpenAgain: () => void;
  onShare?: () => void;
};

type PdfViewerNativeWebViewShellProps = {
  mode: "native-webview";
  source: PdfViewerEmbeddedSource;
  renderInstanceKey: string;
  nativePdfWebView: NativePdfWebViewComponent;
  nativeWebViewReadAccessUri?: string;
  onLoadStart: () => void;
  onLoadEnd: () => void;
  onError: (event: NativeWebViewEvent) => void;
  onHttpError: (event: NativeWebViewEvent) => void;
  onOpenExternal: () => void;
};

export type PdfViewerNativeShellProps =
  | PdfViewerNativeHandoffShellProps
  | PdfViewerNativeWebViewShellProps;

const NativeLoadingState = () => (
  <View style={styles.loadingState}>
    <ActivityIndicator size="large" color="#FFFFFF" />
    <Text style={styles.loadingText}>Открывается...</Text>
  </View>
);

export function PdfViewerNativeShell(props: PdfViewerNativeShellProps) {
  if (props.mode === "native-handoff") {
    if (!props.completed) return <NativeLoadingState />;

    return (
      <Pressable style={styles.viewerBody} onPress={props.onToggleChrome}>
        <CenteredPanel
          title="Документ открыт во внешнем PDF-приложении"
          subtitle="Вернитесь в приложение, когда закончите, или откройте документ ещё раз отсюда."
          actionLabel="Открыть ещё раз"
          onAction={props.onOpenAgain}
          secondaryLabel={props.asset ? "Поделиться" : undefined}
          onSecondaryAction={props.asset ? props.onShare : undefined}
        />
      </Pressable>
    );
  }

  const NativePdfWebView = props.nativePdfWebView;

  if (!NativePdfWebView) {
    return (
      <CenteredPanel
        title="Unable to open document"
        subtitle="Native PDF preview is unavailable on this device."
        actionLabel="Open externally"
        onAction={props.onOpenExternal}
      />
    );
  }

  return (
    <NativePdfWebView
      key={props.renderInstanceKey}
      testID="native-pdf-webview"
      source={props.source}
      originWhitelist={["*"]}
      allowingReadAccessToURL={props.nativeWebViewReadAccessUri}
      style={styles.nativeWebView}
      onLoadStart={props.onLoadStart}
      onLoadEnd={props.onLoadEnd}
      onError={props.onError}
      onHttpError={props.onHttpError}
    />
  );
}
