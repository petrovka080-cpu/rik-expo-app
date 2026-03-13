import { Platform } from "react-native";
import * as Print from "expo-print";
import * as FileSystemModule from "expo-file-system/legacy";
import { getFileSystemPaths } from "../fileSystemPaths";
import { normalizeLocalFileUri } from "../pdfFileContract";

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
      35000,
      "PDF generates too slowly. Try again.",
    );

    const rawUri = (res as any)?.uri;
    if (!rawUri) throw new Error("printToFileAsync returned empty uri");

    if ((Platform.OS as string) !== "web") {
      const sourceUri = normalizeLocalFileUri(rawUri);
      const { cacheDir } = getFileSystemPaths();
      // Generate a simple unique name instead of hashing a 5MB string which can crash Hermes
      const stableName = `gen_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.pdf`;
      const stableUri = `${cacheDir}${stableName}`;
      
      let lastError: any;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          if (attempt > 1) await uiYield(200 * attempt);
          await FileSystemModule.copyAsync({ from: sourceUri, to: stableUri });
          return stableUri;
        } catch (e) {
          lastError = e;
        }
      }
      throw lastError || new Error("Failed to stabilize generated PDF file via copyAsync");
    }

    return rawUri;
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
