import { Platform } from "react-native";
import { redactSensitiveRecord, redactSensitiveText, redactSensitiveValue } from "./security/redaction";
import { supabase } from "./supabaseClient";

type Extra = Record<string, unknown> | undefined;
type AppErrorInsert = {
  context: string;
  message: string;
  extra: Record<string, unknown> | null;
  platform: string;
};

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

export function buildLogErrorPayload(context: string, error: unknown, extra?: Extra): AppErrorInsert {
  const message = redactSensitiveText(toMessage(error));
  const redactedExtra = redactSensitiveRecord(extra) ?? null;
  return {
    context,
    message,
    extra: redactedExtra,
    platform: Platform.OS,
  };
}

export function logError(context: string, error: unknown, extra?: Extra): void {
  const payload = buildLogErrorPayload(context, error, extra);
  const { message, extra: redactedExtra } = payload;

  if (isDevRuntime) {
    console.error(`[${context}]`, message, {
      error: redactSensitiveValue(error),
      extra: redactedExtra,
    });
    return;
  }

  void (async () => {
    try {
      const { error: insertError } = await supabase
        .from("app_errors" as never)
        .insert(payload as never);
      if (insertError && isDevRuntime) {
        console.error("[logError][insert]", insertError.message);
      }
    } catch {
      // no-op: logging must never break user flow
    }
  })();
}
