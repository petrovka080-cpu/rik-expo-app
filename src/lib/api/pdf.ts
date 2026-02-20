// src/lib/api/pdf.ts
import { InteractionManager, Platform } from "react-native";
import * as Print from "expo-print";

type OpenDocOpts = { share?: boolean };

const uiYield = async (ms = 0) => {
  await new Promise<void>((r) => setTimeout(r, ms));
  await new Promise<void>((r) => InteractionManager.runAfterInteractions(() => r()));
};

const withTimeout = async <T,>(p: Promise<T>, ms: number, msg: string): Promise<T> => {
  let t: any;
  const timeout = new Promise<T>((_, rej) => {
    t = setTimeout(() => rej(new Error(msg)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    try { clearTimeout(t); } catch {}
  }
};

export async function openHtmlAsPdfUniversal(
  html: string,
  _opts: OpenDocOpts = {}
): Promise<string> {
  // WEB → html blob-url (как было)
  if (Platform.OS === "web") {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    return URL.createObjectURL(blob);
  }

  // ✅ 1) отпускаем UI, чтобы не было "замирания"
  await uiYield(50);

  // ✅ 2) печать в файл, но с таймаутом (чтобы не висло вечно)
  const res = await withTimeout(
    Print.printToFileAsync({ html }),
    25000,
    "PDF генерируется слишком долго. Попробуй ещё раз."
  );

  const uri = (res as any)?.uri;
  if (!uri) throw new Error("printToFileAsync вернул пустой uri");

  // ✅ 3) маленькая пауза перед шарингом/открытием
  await uiYield(Platform.OS === "ios" ? 80 : 10);

  return uri;
}

