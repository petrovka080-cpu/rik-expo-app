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
      Print.printToFileAsync({ html, base64: true }),
      25000,
      "PDF generates too slowly. Try again.",
    );

    const rawUri = (res as any)?.uri;
    const base64Data = (res as any)?.base64;
    
    if (!rawUri && !base64Data) throw new Error("printToFileAsync returned empty payload");

    // iOS 18 stabilization: Use base64 + writeAsStringAsync instead of copyAsync.
    // This avoids a native crash (SIGABRT) when the legacy bridge tries to access the volatile /Print/ directory.
    if ((Platform.OS as string) !== "web" && base64Data) {
      const { cacheDir } = getFileSystemPaths();
      const stableName = `gen_${hashString32(html || "pdf")}.pdf`;
      const stableUri = `${cacheDir}${stableName}`;
      
      let lastError: any;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          if (attempt > 1) await uiYield(100 * attempt);
          await FileSystemModule.writeAsStringAsync(stableUri, base64Data, {
            encoding: FileSystemModule.EncodingType.Base64,
          });
          const copiedInfo = await FileSystemModule.getInfoAsync(stableUri);
          if (!copiedInfo?.exists) throw new Error("Generated PDF copy is missing after materialization (writeAsStringAsync failed)");
          console.info("[pdf-api] native_print_ready_via_base64", {
            stage: "native_print_ready",
            platform: Platform.OS,
            uri: stableUri,
            scheme: String(stableUri || "").match(/^([a-z0-9+.-]+):/i)?.[1]?.toLowerCase() || "",
          });
          return stableUri;
        } catch (e) {
          lastError = e;
          console.warn(`[pdf-api] write_attempt_failed`, { attempt, stableUri, error: String(e) });
        }
      }
      throw lastError || new Error("Failed to stabilize generated PDF file via base64");
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
