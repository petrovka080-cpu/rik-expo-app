import {
  BFF_DEFAULT_PAGE_SIZE,
  BFF_MAX_PAGE_SIZE,
  type BffClientConfig,
  type BffPage,
  type BffPageInput,
} from "./bffContracts";

const REDACTED = "[redacted]";
const SECRET_KEY_VALUE_PATTERN = /\b(?:token|apikey|api_key|authorization|secret)=(?!\[redacted\])[^\s&#]+/gi;
const TOKEN_PATTERN = /\b(?:token|apikey|api_key|authorization|secret)=?[A-Za-z0-9._~+/=-]{8,}\b/gi;
const BEARER_PATTERN = /\b(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const SIGNED_URL_QUERY_PATTERN = /([?&](?:token|access_token|signature|sig|X-Amz-Signature|X-Amz-Credential|X-Amz-Security-Token)=)[^&#\s]+/gi;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_PATTERN = /(?:\+?\d[\s().-]*){8,}/g;
const ADDRESS_PATTERN = /\b\d{1,6}\s+[A-Za-z0-9.'-]+(?:\s+(?:street|st\.|avenue|ave\.|road|rd\.|lane|ln\.|drive|dr\.|building|apt\.))\b/gi;
const SERVICE_SECRET_PATTERN = /\b(?:service[_-]?role|server[_-]?admin|admin[_-]?database)[A-Za-z0-9._~+/=-]{8,}\b/gi;

const toInt = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};

export function normalizeBffPage(input?: BffPageInput): BffPage {
  const rawPageSize = toInt(input?.pageSize, BFF_DEFAULT_PAGE_SIZE);
  const pageSize = Math.min(Math.max(rawPageSize, 1), BFF_MAX_PAGE_SIZE);
  const page = Math.max(toInt(input?.page, 0), 0);
  const from = page * pageSize;

  return {
    page,
    pageSize,
    from,
    to: from + pageSize - 1,
  };
}

export function isBffEnabled(config: BffClientConfig): boolean {
  return config.enabled === true && typeof config.baseUrl === "string" && config.baseUrl.trim().length > 0;
}

export function redactBffText(value: unknown): string {
  return String(value ?? "")
    .replace(JWT_PATTERN, REDACTED)
    .replace(SIGNED_URL_QUERY_PATTERN, `$1${REDACTED}`)
    .replace(BEARER_PATTERN, `$1${REDACTED}`)
    .replace(SECRET_KEY_VALUE_PATTERN, REDACTED)
    .replace(TOKEN_PATTERN, REDACTED)
    .replace(SERVICE_SECRET_PATTERN, REDACTED)
    .replace(EMAIL_PATTERN, REDACTED)
    .replace(PHONE_PATTERN, REDACTED)
    .replace(ADDRESS_PATTERN, REDACTED);
}

export function buildBffError(code: string, message: unknown): { code: string; message: string } {
  const safeCode = String(code || "BFF_ERROR")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .slice(0, 64) || "BFF_ERROR";
  const safeMessage = redactBffText(message).slice(0, 240) || "Server API boundary request failed";

  return {
    code: safeCode,
    message: safeMessage,
  };
}
