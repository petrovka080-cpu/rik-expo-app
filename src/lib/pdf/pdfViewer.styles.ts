/**
 * PDF Viewer styles — mechanical extraction (C-REAL-2).
 * Extracted verbatim from app/pdf-viewer.tsx lines 1986-2139.
 * No style values changed or added.
 */

import { StyleSheet } from "react-native";
import {
  VIEWER_BG,
  VIEWER_HEADER_BG,
  VIEWER_BORDER,
  VIEWER_TEXT,
} from "./pdfViewer.constants";

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: VIEWER_BG,
  },
  screenRoot: {
    flex: 1,
    backgroundColor: VIEWER_BG,
    overflow: "hidden",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: VIEWER_BORDER,
    backgroundColor: VIEWER_HEADER_BG,
    zIndex: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 8,
  },
  headerTitle: {
    color: VIEWER_TEXT,
    fontSize: 16,
    fontWeight: "700",
  },
  menuAnchor: {
    position: "relative",
  },
  menu: {
    position: "absolute",
    top: 40,
    right: 0,
    width: 220,
    borderRadius: 16,
    paddingVertical: 6,
    backgroundColor: "rgba(22,22,22,0.98)",
    borderWidth: 1,
    borderColor: VIEWER_BORDER,
    zIndex: 20,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  menuAction: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  menuActionText: {
    color: VIEWER_TEXT,
    fontSize: 15,
    fontWeight: "600",
  },
  chromeVisible: {
    opacity: 1,
  },
  chromeHidden: {
    opacity: 0,
  },
  documentStage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: VIEWER_BG,
    overflow: "hidden",
  },
  viewerBody: {
    flex: 1,
    backgroundColor: VIEWER_BG,
    overflow: "hidden",
  },
  webFrameWrap: {
    flex: 1,
    width: "100%",
    alignSelf: "center",
    backgroundColor: VIEWER_BG,
  },
  nativeWebView: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: VIEWER_BG,
  },
  loadingState: {
    flex: 1,
    backgroundColor: VIEWER_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    backgroundColor: "rgba(17,17,17,0.16)",
  },
  loadingText: {
    color: VIEWER_TEXT,
    marginTop: 12,
    fontWeight: "700",
  },
  pageIndicatorWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 18,
    alignItems: "center",
  },
  pageIndicatorVisible: {
    opacity: 1,
  },
  pageIndicatorHidden: {
    opacity: 0.18,
  },
  pageIndicator: {
    minWidth: 54,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  pageIndicatorText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
