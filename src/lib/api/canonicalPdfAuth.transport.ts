import { isAbortError, throwIfAborted } from "../requestCancellation";
import { SUPABASE_ANON_KEY, supabase } from "../supabaseClient";

export type CanonicalPdfAuthDiagnostic = (
  event: string,
  error: unknown,
  extra?: Record<string, unknown>,
) => void;

type CanonicalPdfAuthTransportArgs = {
  signal?: AbortSignal | null;
  onDiagnostic?: CanonicalPdfAuthDiagnostic;
};

const trimAuthText = (value: unknown) => String(value ?? "").trim();

export async function resolveEdgeFunctionAccessToken(
  args: CanonicalPdfAuthTransportArgs = {},
): Promise<string> {
  throwIfAborted(args.signal);
  try {
    if (!supabase?.auth || typeof supabase.auth.getSession !== "function") {
      return SUPABASE_ANON_KEY;
    }
    const session = await supabase.auth.getSession();
    throwIfAborted(args.signal);
    return trimAuthText(session.data.session?.access_token) || SUPABASE_ANON_KEY;
  } catch (error) {
    if (isAbortError(error)) throw error;
    args.onDiagnostic?.("resolve_access_token_failed", error);
    return SUPABASE_ANON_KEY;
  }
}

export async function refreshCanonicalPdfSessionOnce(
  args: CanonicalPdfAuthTransportArgs = {},
): Promise<boolean> {
  throwIfAborted(args.signal);
  try {
    if (!supabase?.auth || typeof supabase.auth.getSession !== "function") {
      return false;
    }
    const current = await supabase.auth.getSession();
    throwIfAborted(args.signal);
    if (
      !current.data.session ||
      typeof supabase.auth.refreshSession !== "function"
    ) {
      return false;
    }
    const refreshed = await supabase.auth.refreshSession();
    throwIfAborted(args.signal);
    return Boolean(refreshed.data.session && !refreshed.error);
  } catch (error) {
    if (isAbortError(error)) throw error;
    args.onDiagnostic?.("refresh_session_failed", error);
    return false;
  }
}
