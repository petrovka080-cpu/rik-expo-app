import { Asset } from "expo-asset";

const EXPO_GENERATED_FONTS_STYLE_ID = "expo-generated-fonts";
const IONICONS_FONT_FAMILY = "ionicons";
const INSTALL_MARK = "__rikIoniconsWebFontFaceInstalled";

type FontFaceInstallWindow = Window & {
  [INSTALL_MARK]?: boolean;
};

function resolveIoniconsFontUri(): string | null {
  try {
    const source = require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf");
    const asset = Asset.fromModule(source);
    return String(asset.uri || asset.localUri || "").trim() || null;
  } catch {
    return null;
  }
}

function ensureExpoGeneratedFontsStyle(): HTMLStyleElement | null {
  const existing = document.getElementById(EXPO_GENERATED_FONTS_STYLE_ID);
  if (existing instanceof HTMLStyleElement) return existing;
  if (!document.head || typeof document.head.appendChild !== "function") return null;
  const style = document.createElement("style");
  style.id = EXPO_GENERATED_FONTS_STYLE_ID;
  style.type = "text/css";
  document.head.appendChild(style);
  return style;
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  const target = window as FontFaceInstallWindow;
  if (!target[INSTALL_MARK]) {
    target[INSTALL_MARK] = true;
    const uri = resolveIoniconsFontUri();
    const style = uri ? ensureExpoGeneratedFontsStyle() : null;
    if (style) {
      style.appendChild(
        document.createTextNode(
          `@font-face{font-family:${JSON.stringify(IONICONS_FONT_FAMILY)};src:url(${JSON.stringify(uri)}) format("truetype");font-display:block}`,
        ),
      );
    }
  }
}
