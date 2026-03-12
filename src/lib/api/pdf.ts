import { Platform } from "react-native";
import * as Print from "expo-print";

type OpenDocOpts = { share?: boolean };

const uiYield = async (ms = 0) => {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
};

const withTimeout = async <T,>(p: Promise<T>, ms: number, msg: string): Promise<T> => {
  let t: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    t = setTimeout(() => reject(new Error(msg)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (t) clearTimeout(t);
  }
};

export async function openHtmlAsPdfUniversal(
  html: string,
  _opts: OpenDocOpts = {},
): Promise<string> {
  try {
    if (Platform.OS === "web") {
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      return URL.createObjectURL(blob);
    }

    await uiYield(50);
    console.info("[pdf-api] native_print_requested", {
      stage: "native_print_requested",
      platform: Platform.OS,
      htmlLength: String(html || "").length,
    });

    const res = await withTimeout(
      Print.printToFileAsync({ html }),
      25000,
      "PDF generates too slowly. Try again.",
    );

    const uri = (res as any)?.uri;
    if (!uri) throw new Error("printToFileAsync returned empty uri");

    console.info("[pdf-api] native_print_ready", {
      stage: "native_print_ready",
      platform: Platform.OS,
      uri,
      scheme: String(uri || "").match(/^([a-z0-9+.-]+):/i)?.[1]?.toLowerCase() || "",
    });

    await uiYield(Platform.OS === "ios" ? 80 : 10);
    return uri;
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string"
        ? String((error as { message?: unknown }).message || "").trim()
        : String(error ?? "").trim() || "PDF generation failed";
    console.error("[pdf-api] native_print_failed", {
      stage: "native_print_failed",
      platform: Platform.OS,
      htmlLength: String(html || "").length,
      errorName: error && typeof error === "object" && "name" in error ? String((error as { name?: unknown }).name || "") : "",
      errorMessage: message,
    });
    throw new Error(message);
  }
}
