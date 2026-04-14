/**
 * PDF Viewer constants — mechanical extraction (C-REAL-2).
 * Extracted verbatim from app/pdf-viewer.tsx.
 * No values changed or added.
 */

import { Platform } from "react-native";

export const FALLBACK_ROUTE = "/";
export const VIEWER_BG = "#111111";
export const VIEWER_HEADER_BG = "rgba(17,17,17,0.94)";
export const VIEWER_BORDER = "rgba(255,255,255,0.08)";
export const VIEWER_TEXT = "#F8FAFC";
export const VIEWER_SUBTLE = "rgba(255,255,255,0.72)";
export const VIEWER_DIM = "rgba(255,255,255,0.52)";
export const VIEWER_PLATFORM =
  Platform.OS === "web" ? "web" : Platform.OS === "android" ? "android" : "ios";
