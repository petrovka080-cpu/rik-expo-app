import type { AuthError } from "@supabase/supabase-js";

import { recordPlatformObservability } from "../observability/platformObservability";
import { supabase } from "../supabaseClient";

export const LOGIN_NETWORK_DEGRADED_MESSAGE =
  "Плохое соединение. Попробуйте ещё раз.";
export const LOGIN_FALLBACK_ERROR_MESSAGE = "Не удалось войти.";

type SafeSignInData = Awaited<
  ReturnType<typeof supabase.auth.signInWithPassword>
>["data"];

export type SafeSignInResult = {
  data: SafeSignInData | null;
  error: AuthError | null;
  degraded: boolean;
  userMessage: string | null;
};

const LOGIN_OBSERVABILITY_BASE = {
  screen: "request" as const,
  surface: "auth_login",
  category: "ui" as const,
  sourceKind: "supabase_auth:signInWithPassword",
  extra: {
    owner: "login_submit",
  },
};

const nowMs = () => {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
};

export function isTimeoutLikeError(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error ?? ""))
    .trim()
    .toLowerCase();

  return (
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("aborted") ||
    message.includes("aborterror") ||
    message.includes("network request failed")
  );
}

export async function signInSafe(params: {
  email: string;
  password: string;
}): Promise<SafeSignInResult> {
  const startedAt = nowMs();
  const normalizedEmail = String(params.email ?? "").trim();

  recordPlatformObservability({
    ...LOGIN_OBSERVABILITY_BASE,
    event: "login_submit_started",
    result: "skipped",
  });

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: params.password,
    });

    const durationMs = Math.max(0, Math.round(nowMs() - startedAt));

    if (error) {
      // supabase-js catches our fetch-level RequestTimeoutError and wraps
      // it into an AuthError object — so the outer catch block never fires
      // on iOS. We must detect timeout here before exposing the raw message.
      if (isTimeoutLikeError(error)) {
        recordPlatformObservability({
          ...LOGIN_OBSERVABILITY_BASE,
          event: "login_submit_degraded_timeout",
          result: "error",
          durationMs,
          fallbackUsed: true,
          errorClass: error.name || "AuthError",
          errorMessage: error.message,
        });

        return {
          data: null,
          error,
          degraded: true,
          userMessage: LOGIN_NETWORK_DEGRADED_MESSAGE,
        };
      }

      recordPlatformObservability({
        ...LOGIN_OBSERVABILITY_BASE,
        event: "login_submit_auth_error",
        result: "error",
        durationMs,
        errorClass: error.name || "AuthError",
        errorMessage: error.message,
      });

      return {
        data: null,
        error,
        degraded: false,
        userMessage: error.message,
      };
    }

    recordPlatformObservability({
      ...LOGIN_OBSERVABILITY_BASE,
      event: "login_submit_success",
      result: "success",
      durationMs,
      extra: {
        ...LOGIN_OBSERVABILITY_BASE.extra,
        hasSession: Boolean(data?.session),
      },
    });

    return {
      data,
      error: null,
      degraded: false,
      userMessage: null,
    };
  } catch (error) {
    const durationMs = Math.max(0, Math.round(nowMs() - startedAt));

    if (isTimeoutLikeError(error)) {
      recordPlatformObservability({
        ...LOGIN_OBSERVABILITY_BASE,
        event: "login_submit_degraded_timeout",
        result: "error",
        durationMs,
        fallbackUsed: true,
        errorClass: error instanceof Error ? error.name : undefined,
        errorMessage: error instanceof Error ? error.message : String(error ?? ""),
      });

      return {
        data: null,
        error: null,
        degraded: true,
        userMessage: LOGIN_NETWORK_DEGRADED_MESSAGE,
      };
    }

    recordPlatformObservability({
      ...LOGIN_OBSERVABILITY_BASE,
      event: "login_submit_unexpected_error",
      result: "error",
      durationMs,
      errorClass: error instanceof Error ? error.name : undefined,
      errorMessage: error instanceof Error ? error.message : String(error ?? ""),
    });

    return {
      data: null,
      error: null,
      degraded: false,
      userMessage: LOGIN_FALLBACK_ERROR_MESSAGE,
    };
  }
}
