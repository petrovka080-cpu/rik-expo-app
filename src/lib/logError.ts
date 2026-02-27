import { Platform } from "react-native";
import { supabase } from "./supabaseClient";

type Extra = Record<string, unknown> | undefined;

const isDevRuntime =
  (typeof __DEV__ !== "undefined" && __DEV__) ||
  process.env.NODE_ENV !== "production";

const toMessage = (error: unknown): string => {
  if (error && typeof error === "object" && "message" in error) {
    const m = (error as { message?: unknown }).message;
    if (m != null) return String(m);
  }
  if (typeof error === "string") return error;
  return String(error ?? "unknown error");
};

export function logError(context: string, error: unknown, extra?: Extra): void {
  const message = toMessage(error);
  const payload = {
    context,
    message,
    extra: extra ?? null,
    platform: Platform.OS,
  };

  if (isDevRuntime) {
    console.error(`[${context}]`, message, { error, extra });
    return;
  }

  void (async () => {
    try {
      const { error: insertError } = await supabase.from("app_errors").insert(payload);
      if (insertError && isDevRuntime) {
        console.error("[logError][insert]", insertError.message);
      }
    } catch {
      // no-op: logging must never break user flow
    }
  })();
}
