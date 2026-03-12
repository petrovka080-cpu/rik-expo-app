import { Platform } from "react-native";
import * as Print from "expo-print";
import * as FileSystemModule from "expo-file-system/legacy";
import { getFileSystemPaths } from "../fileSystemPaths";
import { normalizeLocalFileUri } from "../pdfFileContract";
import { hashString32 } from "../pdfFileContract";

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

    const rawUri = (res as any)?.uri;
    if (!rawUri) throw new Error("printToFileAsync returned empty uri");

    // Move the generated file out of volatile iOS print storage immediately.
    if ((Platform.OS as string) !== "web") {
      const sourceUri = normalizeLocalFileUri(rawUri);
      const { cacheDir } = getFileSystemPaths();
      const stableName = `gen_${hashString32(html || "pdf")}.pdf`;
      const stableUri = `${cacheDir}${stableName}`;
      
      let lastError: any;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          if (attempt > 1) await uiYield(100 * attempt);
          await FileSystemModule.copyAsync({ from: sourceUri, to: stableUri });
          const copiedInfo = await FileSystemModule.getInfoAsync(stableUri);
          if (!copiedInfo?.exists) throw new Error("Generated PDF copy is missing after materialization");
          console.info("[pdf-api] native_print_ready", {
            stage: "native_print_ready",
            platform: Platform.OS,
            uri: stableUri,
            sourceUri,
            scheme: String(stableUri || "").match(/^([a-z0-9+.-]+):/i)?.[1]?.toLowerCase() || "",
          });
          return stableUri;
        } catch (e) {
          lastError = e;
          console.warn(`[pdf-api] copy_attempt_failed`, { attempt, sourceUri, stableUri, error: String(e) });
        }
      }
      throw lastError || new Error("Failed to stabilize generated PDF file");
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
