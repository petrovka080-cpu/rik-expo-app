/**
 * C-REAL-2 PDF viewer extraction tests — validates the mechanical extraction
 * of constants, styles, helpers, and components from app/pdf-viewer.tsx.
 */

import { styles } from "./pdfViewer.styles";
import {
  FALLBACK_ROUTE,
  VIEWER_BG,
  VIEWER_HEADER_BG,
  VIEWER_BORDER,
  VIEWER_TEXT,
  VIEWER_SUBTLE,
  VIEWER_DIM,
  VIEWER_PLATFORM,
} from "./pdfViewer.constants";
import {
  getUriScheme,
  FileSystemCompat,
} from "./pdfViewer.helpers";
import {
  MenuAction,
  EmptyState,
  CenteredPanel,
} from "./pdfViewer.components";

describe("pdfViewer.constants — extraction integrity", () => {
  it("FALLBACK_ROUTE is /", () => {
    expect(FALLBACK_ROUTE).toBe("/");
  });

  it("VIEWER_BG is dark", () => {
    expect(VIEWER_BG).toBe("#111111");
  });

  it("VIEWER_TEXT is light", () => {
    expect(VIEWER_TEXT).toBe("#F8FAFC");
  });

  it("all color constants are strings", () => {
    for (const c of [VIEWER_BG, VIEWER_HEADER_BG, VIEWER_BORDER, VIEWER_TEXT, VIEWER_SUBTLE, VIEWER_DIM]) {
      expect(typeof c).toBe("string");
      expect(c.length).toBeGreaterThan(0);
    }
  });

  it("VIEWER_PLATFORM is one of web/android/ios", () => {
    expect(["web", "android", "ios"]).toContain(VIEWER_PLATFORM);
  });
});

describe("pdfViewer.styles — extraction integrity", () => {
  const EXPECTED_STYLE_KEYS = [
    "screen", "screenRoot", "header", "iconButton",
    "headerTitleWrap", "headerTitle", "menuAnchor", "menu",
    "menuAction", "menuActionText",
    "chromeVisible", "chromeHidden",
    "documentStage", "viewerBody", "webFrameWrap", "nativeWebView",
    "loadingState", "loadingOverlay", "loadingText",
    "pageIndicatorWrap", "pageIndicatorVisible", "pageIndicatorHidden",
    "pageIndicator", "pageIndicatorText",
  ];

  it("has all expected style keys", () => {
    for (const key of EXPECTED_STYLE_KEYS) {
      expect(styles).toHaveProperty(key);
    }
  });

  it("style count matches expected", () => {
    expect(Object.keys(styles).length).toBe(EXPECTED_STYLE_KEYS.length);
  });

  it("screen style uses VIEWER_BG", () => {
    expect(styles.screen).toMatchObject({
      flex: 1,
      backgroundColor: VIEWER_BG,
    });
  });
});

describe("pdfViewer.helpers — extraction integrity", () => {
  it("getUriScheme extracts file scheme", () => {
    expect(getUriScheme("file:///path/to/doc.pdf")).toBe("file");
  });

  it("getUriScheme extracts https scheme", () => {
    expect(getUriScheme("https://example.com/doc.pdf")).toBe("https");
  });

  it("getUriScheme returns empty for no scheme", () => {
    expect(getUriScheme("no-scheme")).toBe("");
    expect(getUriScheme(null)).toBe("");
    expect(getUriScheme(undefined)).toBe("");
    expect(getUriScheme("")).toBe("");
  });

  it("FileSystemCompat is an object", () => {
    expect(typeof FileSystemCompat).toBe("object");
  });
});

describe("pdfViewer.components — extraction integrity", () => {
  it("MenuAction is a function component", () => {
    expect(typeof MenuAction).toBe("function");
  });

  it("EmptyState is a function component", () => {
    expect(typeof EmptyState).toBe("function");
  });

  it("CenteredPanel is a function component", () => {
    expect(typeof CenteredPanel).toBe("function");
  });
});
