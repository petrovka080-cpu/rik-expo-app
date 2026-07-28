import {
  OFFICE_ACCESS_ROUTE_MANIFEST,
  type OfficeAccessRouteRole,
} from "../officeRuntime/officeRuntimePolicy";

export const PLATFORM_DEVELOPER_ENTITLEMENT_NAME =
  "platform_developer" as const;

export const PLATFORM_DEVELOPER_OFFICE_ROUTES = Object.freeze(
  Object.values(OFFICE_ACCESS_ROUTE_MANIFEST).map((entry) => ({
    area: "office" as const,
    effectiveRole: entry.role,
    route: entry.route,
    routeModule: entry.routeModule,
    expectedShellTestId: entry.expectedShellTestId,
  })),
);

export const PLATFORM_DEVELOPER_SHARED_ROUTES = Object.freeze([
  {
    area: "marketplace",
    route: "/market",
    routeModule: "app/(tabs)/market.tsx",
  },
  {
    area: "seller",
    route: "/seller",
    routeModule: "app/seller.tsx",
  },
  {
    area: "profile",
    route: "/profile",
    routeModule: "app/(tabs)/profile.tsx",
  },
  {
    area: "request",
    route: "/request",
    routeModule: "app/(tabs)/request/index.tsx",
  },
  {
    area: "ai",
    route: "/ai",
    routeModule: "app/(tabs)/ai.tsx",
  },
] as const);

const ADMIN_GLOBAL_ESTIMATE_ROUTE_NAMES = [
  "index",
  "audit",
  "change-control",
  "coverage",
  "import",
  "pricebook",
  "qa",
  "sources",
  "tax-rules",
  "templates",
  "work-types",
] as const;

export const PLATFORM_DEVELOPER_ADMIN_ROUTES = Object.freeze(
  ADMIN_GLOBAL_ESTIMATE_ROUTE_NAMES.map((name) => ({
    area: "administration" as const,
    route:
      name === "index"
        ? "/admin/global-estimate"
        : (`/admin/global-estimate/${name}` as const),
    routeModule: `app/admin/global-estimate/${name}.tsx` as const,
  })),
);

export const PLATFORM_DEVELOPER_ACCESS_MATRIX = Object.freeze([
  ...PLATFORM_DEVELOPER_OFFICE_ROUTES,
  ...PLATFORM_DEVELOPER_SHARED_ROUTES,
  ...PLATFORM_DEVELOPER_ADMIN_ROUTES,
]);

export const ORDINARY_ROLE_NEGATIVE_ACCESS_MATRIX = Object.freeze([
  {
    actorRole: "buyer",
    forbiddenEffectiveRole: "accountant",
    route: "/office/accountant",
  },
  {
    actorRole: "foreman",
    forbiddenEffectiveRole: "director",
    route: "/office/director",
  },
  {
    actorRole: "contractor",
    forbiddenEffectiveRole: "warehouse",
    route: "/office/warehouse",
  },
] as const satisfies readonly {
  actorRole: OfficeAccessRouteRole;
  forbiddenEffectiveRole: OfficeAccessRouteRole;
  route: `/office/${string}`;
}[]);
