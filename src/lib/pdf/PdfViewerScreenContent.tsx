import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { DocumentAsset } from "../documents/pdfDocumentSessions";
import type { PdfViewerEmbeddedSource, PdfViewerResolution } from "./pdfViewerContract";
import type { PdfViewerContentModel } from "./pdfViewer.readiness";
import { VIEWER_TEXT } from "./pdfViewer.constants";
import { MenuAction, EmptyState, CenteredPanel } from "./pdfViewer.components";
import {
  PdfViewerNativeShell,
  type PdfViewerNativeWebViewComponent,
  type PdfViewerNativeWebViewEvent,
} from "./PdfViewerNativeShell";
import { styles } from "./pdfViewer.styles";
import { PdfViewerWebShell } from "./PdfViewerWebShell";

type PdfViewerScreenContentProps = {
  title: string;
  showChrome: boolean;
  headerHeight: number;
  topInset: number;
  menuOpen: boolean;
  asset: DocumentAsset | null;
  contentModel: PdfViewerContentModel;
  width: number;
  renderInstanceKey: string;
  webEmbeddedUri: string;
  nativeHandoffCompleted: boolean;
  nativePdfWebView: PdfViewerNativeWebViewComponent;
  nativeWebViewReadAccessUri?: string;
  source?: PdfViewerEmbeddedSource;
  resolvedSource: PdfViewerResolution;
  showPageIndicator: boolean;
  pageIndicatorText: string;
  onBack: () => void;
  onToggleMenu: () => void;
  onShare: () => void;
  onDownload: () => void;
  onOpenExternal: () => void;
  onPrint: () => void;
  onRetry: () => void;
  onToggleChrome: () => void;
  onOpenAgain: () => void;
  onWebLoad: () => void;
  onWebError: () => void;
  onNativeLoadStart: () => void;
  onNativeLoadEnd: () => void;
  onNativeError: (event: PdfViewerNativeWebViewEvent) => void;
  onNativeHttpError: (event: PdfViewerNativeWebViewEvent) => void;
  onNativeRenderProcessGone: (event: PdfViewerNativeWebViewEvent) => void;
};

function LoadingState() {
  return (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color="#FFFFFF" />
      <Text style={styles.loadingText}>Открывается...</Text>
    </View>
  );
}

function LoadingOverlay() {
  return (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color="#FFFFFF" />
      <Text style={styles.loadingText}>Открывается...</Text>
    </View>
  );
}

function renderViewerBody(props: PdfViewerScreenContentProps) {
  const {
    asset,
    contentModel,
    nativeHandoffCompleted,
    nativePdfWebView,
    nativeWebViewReadAccessUri,
    onOpenAgain,
    onOpenExternal,
    onRetry,
    onShare,
    onToggleChrome,
    onWebError,
    onWebLoad,
    onNativeError,
    onNativeHttpError,
    onNativeRenderProcessGone,
    onNativeLoadEnd,
    onNativeLoadStart,
    renderInstanceKey,
    resolvedSource,
    source,
    webEmbeddedUri,
    width,
  } = props;

  switch (contentModel.kind) {
    case "empty":
      return (
        <EmptyState
          title={contentModel.title}
          subtitle={contentModel.subtitle}
        />
      );
    case "error":
      return (
        <CenteredPanel
          title={contentModel.title}
          subtitle={contentModel.subtitle}
          actionLabel={contentModel.allowRetry ? "Retry" : undefined}
          onAction={contentModel.allowRetry ? onRetry : undefined}
          secondaryLabel={
            contentModel.allowOpenExternal ? "Open externally" : undefined
          }
          onSecondaryAction={
            contentModel.allowOpenExternal ? onOpenExternal : undefined
          }
        />
      );
    case "missing-asset":
      return (
        <EmptyState
          title={contentModel.title}
          subtitle={contentModel.subtitle}
        />
      );
    case "unsupported":
      return (
        <CenteredPanel
          title={contentModel.title}
          subtitle={contentModel.subtitle}
          actionLabel={contentModel.allowRetry ? "Retry" : undefined}
          onAction={contentModel.allowRetry ? onRetry : undefined}
          secondaryLabel={
            contentModel.allowOpenExternal ? "Open externally" : undefined
          }
          onSecondaryAction={
            contentModel.allowOpenExternal ? onOpenExternal : undefined
          }
        />
      );
    case "loading":
      return <LoadingState />;
    case "native-handoff":
      return (
        <PdfViewerNativeShell
          mode="native-handoff"
          asset={asset}
          completed={nativeHandoffCompleted}
          onToggleChrome={onToggleChrome}
          onOpenAgain={onOpenAgain}
          onShare={contentModel.allowShare ? onShare : undefined}
        />
      );
    case "embedded-web":
      if (!asset) {
        return (
          <EmptyState
            title="Document not found"
            subtitle="Missing document asset."
          />
        );
      }
      return (
        <Pressable style={styles.viewerBody} onPress={onToggleChrome}>
          {contentModel.showLoadingOverlay ? <LoadingOverlay /> : null}
          <PdfViewerWebShell
            asset={asset}
            width={width}
            renderInstanceKey={renderInstanceKey}
            webEmbeddedUri={webEmbeddedUri}
            onLoad={onWebLoad}
            onError={onWebError}
          />
        </Pressable>
      );
    case "embedded-native":
      if (!source || resolvedSource.kind !== "resolved-embedded") {
        return (
          <EmptyState
            title="Document not found"
            subtitle="Missing document asset."
          />
        );
      }
      return (
        <Pressable style={styles.viewerBody} onPress={onToggleChrome}>
          {contentModel.showLoadingOverlay ? <LoadingOverlay /> : null}
          <PdfViewerNativeShell
            mode="native-webview"
            source={source}
            renderInstanceKey={renderInstanceKey}
            nativePdfWebView={nativePdfWebView}
            nativeWebViewReadAccessUri={nativeWebViewReadAccessUri}
            onLoadStart={onNativeLoadStart}
            onLoadEnd={onNativeLoadEnd}
            onError={onNativeError}
            onHttpError={onNativeHttpError}
            onRenderProcessGone={onNativeRenderProcessGone}
            onOpenExternal={onOpenExternal}
          />
        </Pressable>
      );
  }
}

export function PdfViewerScreenContent(props: PdfViewerScreenContentProps) {
  return (
    <View style={styles.screenRoot}>
      <View
        pointerEvents={props.showChrome ? "auto" : "none"}
        style={[
          styles.header,
          props.showChrome ? styles.chromeVisible : styles.chromeHidden,
          {
            height: props.headerHeight,
            paddingTop: Platform.OS === "web" ? 0 : props.topInset,
          },
        ]}
      >
        <Pressable
          onPress={props.onBack}
          style={styles.iconButton}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={20} color={VIEWER_TEXT} />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {props.title}
          </Text>
        </View>

        <View style={styles.menuAnchor}>
          <Pressable
            onPress={props.onToggleMenu}
            style={styles.iconButton}
            disabled={!props.asset}
            accessibilityLabel="Document actions"
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={18}
              color={VIEWER_TEXT}
            />
          </Pressable>
          {props.menuOpen && props.asset ? (
            <View style={styles.menu}>
              <MenuAction
                icon="share-outline"
                label="Share"
                onPress={props.onShare}
              />
              <MenuAction
                icon="download-outline"
                label="Download"
                onPress={props.onDownload}
              />
              <MenuAction
                icon="open-outline"
                label="Open externally"
                onPress={props.onOpenExternal}
              />
              <MenuAction
                icon="print-outline"
                label="Print"
                onPress={props.onPrint}
              />
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.documentStage}>{renderViewerBody(props)}</View>

      {props.showPageIndicator ? (
        <View
          pointerEvents="none"
          style={[
            styles.pageIndicatorWrap,
            props.showChrome
              ? styles.pageIndicatorVisible
              : styles.pageIndicatorHidden,
          ]}
        >
          <View style={styles.pageIndicator}>
            <Text style={styles.pageIndicatorText}>
              {props.pageIndicatorText}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
