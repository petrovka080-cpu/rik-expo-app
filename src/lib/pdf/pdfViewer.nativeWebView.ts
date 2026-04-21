import { Platform } from "react-native";
import { WebView } from "react-native-webview";

import type { PdfViewerNativeWebViewComponent } from "./PdfViewerNativeShell";

export function resolvePdfViewerNativeWebView(): PdfViewerNativeWebViewComponent {
  return Platform.OS === "web" ? null : WebView;
}
