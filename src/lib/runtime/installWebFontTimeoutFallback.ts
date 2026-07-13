const WEB_FONT_TIMEOUT_FALLBACK_MARK = "__rikWebFontTimeoutFallbackInstalled";
const FONTFACEOBSERVER_TIMEOUT = "6000ms timeout exceeded";

type FontTimeoutWindow = Window & {
  [WEB_FONT_TIMEOUT_FALLBACK_MARK]?: boolean;
};

function isExpoWebFontTimeout(reason: unknown): boolean {
  const message = reason instanceof Error ? reason.message : String(reason ?? "");
  const stack = reason instanceof Error ? reason.stack ?? "" : "";
  return (
    message.includes(FONTFACEOBSERVER_TIMEOUT) &&
    (!stack || stack.includes("fontfaceobserver") || stack.includes("FontObserver"))
  );
}

if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  const target = window as FontTimeoutWindow;
  if (!target[WEB_FONT_TIMEOUT_FALLBACK_MARK]) {
    target[WEB_FONT_TIMEOUT_FALLBACK_MARK] = true;
    window.addEventListener("unhandledrejection", (event) => {
      if (!isExpoWebFontTimeout(event.reason)) return;
      event.preventDefault();
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.warn("[web-font] Expo icon font timed out; continuing with fallback rendering.");
      }
    });
    window.addEventListener(
      "error",
      (event) => {
        if (!isExpoWebFontTimeout(event.error ?? event.message)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (typeof __DEV__ !== "undefined" && __DEV__) {
          console.warn("[web-font] Expo icon font error suppressed; continuing with fallback rendering.");
        }
      },
      true,
    );
  }
}
