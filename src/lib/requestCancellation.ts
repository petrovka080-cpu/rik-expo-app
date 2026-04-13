export function createAbortError(reason?: unknown): Error {
  if (reason instanceof Error) return reason;
  const message =
    typeof reason === "string" && reason.trim()
      ? reason.trim()
      : "Request aborted";
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

export function abortController(
  controller: AbortController | null | undefined,
  reason?: unknown,
) {
  if (!controller || controller.signal.aborted) return;
  controller.abort(createAbortError(reason));
}

export function throwIfAborted(signal?: AbortSignal | null) {
  if (!signal?.aborted) return;
  throw createAbortError(signal.reason);
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as { name?: unknown; message?: unknown };
  const name = String(record.name ?? "");
  if (name === "AbortError") return true;
  const message = String(record.message ?? "").toLowerCase();
  return message.includes("abort") || message.includes("aborted");
}

type AbortableRequest<T> = T & {
  abortSignal?: (signal: AbortSignal) => T;
};

export function applySupabaseAbortSignal<T>(
  request: T,
  signal?: AbortSignal | null,
): T {
  if (!signal) return request;
  const abortable = request as AbortableRequest<T>;
  if (typeof abortable.abortSignal !== "function") return request;
  return abortable.abortSignal(signal);
}
