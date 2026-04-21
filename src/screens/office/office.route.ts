export const OFFICE_EXACT_PATH = "/office";
export const OFFICE_SAFE_BACK_ROUTE = "/office";

const OFFICE_CHILD_BACK_SOURCE_ROUTES = [
  "/office/foreman",
  "/office/warehouse",
] as const;

export type OfficeChildBackSourceRoute =
  (typeof OFFICE_CHILD_BACK_SOURCE_ROUTES)[number];

export type OfficeRouteScopePlan = {
  isActive: boolean;
  skipReason: string | null;
};

export function resolveOfficeRouteScopePlan(
  pathname: string | null | undefined,
): OfficeRouteScopePlan {
  if (pathname === OFFICE_EXACT_PATH) {
    return {
      isActive: true,
      skipReason: null,
    };
  }

  if (!pathname) {
    return {
      isActive: false,
      skipReason: "pathname_unavailable",
    };
  }

  return {
    isActive: false,
    skipReason: `non_exact_path:${pathname}`,
  };
}

export function resolveSafeOfficeChildRoute(
  pathname: string | null | undefined,
): OfficeChildBackSourceRoute | null {
  for (const route of OFFICE_CHILD_BACK_SOURCE_ROUTES) {
    if (route === pathname) return route;
  }
  return null;
}
