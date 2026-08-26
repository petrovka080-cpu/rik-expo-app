import {
  AUTH_LOGIN_ROUTE,
  PROFILE_TAB_ROUTE,
} from "./navigation/coreRoutes";

export type PostAuthEntryPath = typeof PROFILE_TAB_ROUTE;

// Unified post-auth entry goes through the identity/access hub.
// Role-specific auto-redirects are intentionally not supported anymore.
export const POST_AUTH_ENTRY_ROUTE: PostAuthEntryPath = PROFILE_TAB_ROUTE;

export type AuthLoginHref =
  | typeof AUTH_LOGIN_ROUTE
  | {
      pathname: typeof AUTH_LOGIN_ROUTE;
      params: { returnTo: string };
    };

const MAX_RETURN_TO_LENGTH = 2_048;

const firstRouteParam = (
  value: string | string[] | null | undefined,
): string => (Array.isArray(value) ? String(value[0] ?? "") : String(value ?? ""));

/**
 * Accepts only an internal app path. This value is navigation state, never an
 * external URL, and therefore cannot become an open redirect after login.
 */
export function normalizePostAuthReturnTo(
  value: string | string[] | null | undefined,
): string | null {
  const candidate = firstRouteParam(value).trim();
  if (
    !candidate ||
    candidate.length > MAX_RETURN_TO_LENGTH ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /[\u0000-\u001F\u007F]/u.test(candidate)
  ) {
    return null;
  }

  const pathname = candidate.split(/[?#]/u, 1)[0] ?? "";
  let decodedPathname = pathname;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (
    decodedPathname.startsWith("//") ||
    decodedPathname.includes("\\") ||
    decodedPathname === "/auth" ||
    decodedPathname.startsWith("/auth/")
  ) {
    return null;
  }
  return candidate;
}

export function resolvePostAuthReturnTo(
  value: string | string[] | null | undefined,
): string {
  return normalizePostAuthReturnTo(value) ?? POST_AUTH_ENTRY_ROUTE;
}

export function buildAuthLoginHref(
  returnTo: string | string[] | null | undefined,
): AuthLoginHref {
  const safeReturnTo = normalizePostAuthReturnTo(returnTo);
  return safeReturnTo
    ? { pathname: AUTH_LOGIN_ROUTE, params: { returnTo: safeReturnTo } }
    : AUTH_LOGIN_ROUTE;
}

export function buildCurrentRouteReturnTo(
  pathname: string | null | undefined,
  params: Readonly<Record<string, string | string[] | undefined>> = {},
): string | null {
  const normalizedPathname = String(pathname ?? "").trim();
  if (!normalizePostAuthReturnTo(normalizedPathname)) return null;
  const search = new URLSearchParams();
  Object.keys(params)
    .sort()
    .filter((key) => key !== "returnTo")
    .forEach((key) => {
      const raw = params[key];
      const values = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
      values.forEach((value) => search.append(key, String(value)));
    });
  const query = search.toString();
  return normalizePostAuthReturnTo(
    query ? `${normalizedPathname}?${query}` : normalizedPathname,
  );
}
