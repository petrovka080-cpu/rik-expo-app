import { client } from "./_core";

let requestsSubmittedAtSupportedCache: boolean | null = null;
let requestsReadableColumnsCache: Set<string> | null = null;
let requestsReadableColumnsInFlight: Promise<Set<string>> | null = null;

const getErrorMessage = (value: unknown): string => {
  if (value != null && typeof value === "object" && "message" in value && typeof (value as { message?: unknown }).message === "string") {
    return (value as { message: string }).message;
  }
  return String(value ?? "");
};

export async function resolveRequestsReadableColumns(): Promise<Set<string>> {
  if (requestsReadableColumnsCache) return requestsReadableColumnsCache;
  if (requestsReadableColumnsInFlight) return requestsReadableColumnsInFlight;

  requestsReadableColumnsInFlight = (async () => {
    try {
      const q = await client.from("requests").select("*").limit(1);
      if (q.error) throw q.error;
      const first =
        Array.isArray(q.data) && q.data.length ? (q.data[0] as Record<string, unknown>) : null;
      const cols = new Set<string>(first ? Object.keys(first) : ["id", "status", "display_no", "created_at"]);
      requestsReadableColumnsCache = cols;
      return cols;
    } catch {
      const fallback = new Set<string>(["id", "status", "display_no", "created_at"]);
      requestsReadableColumnsCache = fallback;
      return fallback;
    } finally {
      requestsReadableColumnsInFlight = null;
    }
  })();

  return requestsReadableColumnsInFlight;
}

export async function buildRequestSelectSchemaSafe(): Promise<string> {
  const desired = [
    "id",
    "status",
    "display_no",
    "foreman_name",
    "need_by",
    "comment",
    "object_type_code",
    "level_code",
    "system_code",
    "zone_code",
    "created_at",
    "year",
    "seq",
  ];
  const cols = await resolveRequestsReadableColumns();
  const filtered = desired.filter((c) => cols.has(c));
  return filtered.length ? filtered.join(", ") : "id,status,created_at";
}

export async function requestsSupportsSubmittedAt(): Promise<boolean> {
  if (requestsSubmittedAtSupportedCache != null) return requestsSubmittedAtSupportedCache;
  try {
    const q = await client.from("requests").select("submitted_at").limit(1);
    if (q.error) throw q.error;
    requestsSubmittedAtSupportedCache = true;
    return true;
  } catch (e) {
    const msg = getErrorMessage(e).toLowerCase();
    if (msg.includes("submitted_at") || msg.includes("column") || msg.includes("does not exist")) {
      requestsSubmittedAtSupportedCache = false;
      return false;
    }
    requestsSubmittedAtSupportedCache = true;
    return true;
  }
}
