import React, { createContext, useContext, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import {
  buildOfficeRuntimeContext,
  canUseOfficeRoute,
  resolveOfficeRuntimeRoleFromSources,
  type OfficeRouteRole,
  type OfficeRuntimeContext,
} from "./officeRuntimePolicy";
import {
  loadDeveloperOverrideContext,
  resolveLocalDeveloperOverrideContext,
} from "../developerOverride";
import { LOCAL_DEVELOPER_ACTOR_USER_ID } from "../developerOverride.constants";
import { resolveCurrentSessionRole } from "../sessionRole";
import { getSessionSafe, supabase } from "../supabaseClient";

export {
  buildOfficeRuntimeContext,
  canUseOfficeRoute,
  hasOfficeRuntimePermission,
  normalizeOfficeRuntimeRole,
  resolveOfficeRuntimeRoleFromSources,
  type OfficeRouteRole,
  type OfficeRuntimeContext,
  type OfficeRuntimeRole,
} from "./officeRuntimePolicy";

type OfficeRuntimeResolution =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "degraded"; message: string }
  | { status: "forbidden"; role: string | null; requiredRole: OfficeRouteRole }
  | { status: "ready"; context: OfficeRuntimeContext };

const OfficeRuntimeReactContext = createContext<OfficeRuntimeContext | null>(null);

const normalizeText = (value: unknown): string => String(value ?? "").trim();

const asSupabaseCode = (error: unknown): string | null => {
  if (!error || typeof error !== "object") return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
};

async function resolveOfficeWorkspaceRuntimeRole(params: {
  userId: string;
  requiredRole: OfficeRouteRole;
}): Promise<OfficeRouteRole | "admin" | null> {
  const membershipResult = await supabase
    .from("company_members")
    .select("role")
    .eq("user_id", params.userId)
    .in("role", ["admin", "director", params.requiredRole])
    .limit(1)
    .maybeSingle();

  if (membershipResult.error && asSupabaseCode(membershipResult.error) !== "PGRST116") {
    throw membershipResult.error;
  }

  const membershipRole = normalizeText(membershipResult.data?.role).toLowerCase();
  if (membershipRole === "admin") return "admin";
  if (membershipRole === "director") return "director";
  if (membershipRole === params.requiredRole) return params.requiredRole;
  return null;
}

function resolveLocalDeveloperRuntimeResolution(params: {
  requiredRole: OfficeRouteRole;
}): OfficeRuntimeResolution | null {
  const localDeveloperOverride = resolveLocalDeveloperOverrideContext();
  const localDeveloperRole = localDeveloperOverride
    ? resolveOfficeRuntimeRoleFromSources({
        requiredRole: params.requiredRole,
        sessionRole: null,
        developerOverride: localDeveloperOverride,
      })
    : null;

  if (!localDeveloperRole) return null;

  return {
    status: "ready",
    context: buildOfficeRuntimeContext({
      userId: localDeveloperOverride?.actorUserId ?? LOCAL_DEVELOPER_ACTOR_USER_ID,
      role: localDeveloperRole,
    }),
  };
}

export function useOfficeRuntimeContextOptional() {
  return useContext(OfficeRuntimeReactContext);
}

export function useOfficeRuntimeContext() {
  const context = useOfficeRuntimeContextOptional();
  if (!context) {
    throw new Error("Office runtime context is not available for this route");
  }
  return context;
}

async function loadOfficeRuntimeResolution(params: {
  route: string;
  requiredRole: OfficeRouteRole;
}): Promise<OfficeRuntimeResolution> {
  const localDeveloperResolution = resolveLocalDeveloperRuntimeResolution(params);
  if (localDeveloperResolution) return localDeveloperResolution;

  const sessionResult = await getSessionSafe({
    caller: "office_role_auth_context",
    route: params.route,
  });

  if (sessionResult.degraded) {
    return {
      status: "degraded",
      message: "office auth session read degraded",
    };
  }

  const user = sessionResult.session?.user ?? null;
  const userId = normalizeText(user?.id);
  if (!user || !userId) {
    return { status: "unauthenticated" };
  }

  const [roleResolution, developerOverride] = await Promise.all([
    resolveCurrentSessionRole({
      user,
      ensureProfile: false,
      trigger: `office_route:${params.route}`,
    }),
    loadDeveloperOverrideContext().catch(() => null),
  ]);
  const role = resolveOfficeRuntimeRoleFromSources({
    requiredRole: params.requiredRole,
    sessionRole: roleResolution.role,
    developerOverride,
  });
  const initialContext = role
    ? buildOfficeRuntimeContext({
        userId,
        role,
      })
    : null;
  const workspaceRole = !canUseOfficeRoute({
    context: initialContext,
    requiredRole: params.requiredRole,
  })
    ? await resolveOfficeWorkspaceRuntimeRole({
        userId,
        requiredRole: params.requiredRole,
      }).catch(() => null)
    : null;
  const resolvedRole = workspaceRole ?? role;
  const context = resolvedRole
    ? buildOfficeRuntimeContext({
        userId,
        role: resolvedRole,
      })
    : null;

  if (!context || !canUseOfficeRoute({ context, requiredRole: params.requiredRole })) {
    return {
      status: "forbidden",
      role: resolvedRole ?? roleResolution.role ?? null,
      requiredRole: params.requiredRole,
    };
  }

  return { status: "ready", context };
}

function OfficeRuntimeMarker({ context }: { context: OfficeRuntimeContext }) {
  if (!__DEV__) return null;
  return (
    <View
      accessibilityLabel={`office-runtime-context-${context.role}`}
      collapsable={false}
      importantForAccessibility="yes"
      style={styles.markerHost}
      testID={`office-runtime-context-${context.role}`}
    >
      <Text
        accessibilityLabel={`office-runtime-role-${context.role}`}
        nativeID={`office-runtime-role-${context.role}`}
        style={styles.markerText}
        testID={`office-runtime-role-${context.role}`}
      >
        {`office-runtime-role:${context.role}`}
      </Text>
    </View>
  );
}

function OfficeRoleGateFallback({
  resolution,
}: {
  resolution: Exclude<OfficeRuntimeResolution, { status: "ready" }>;
}) {
  const testID =
    resolution.status === "forbidden"
      ? "office-role-guard-blocked"
      : `office-role-auth-${resolution.status}`;
  const text =
    resolution.status === "loading"
      ? "Проверяем доступ"
      : resolution.status === "unauthenticated"
        ? "Нужен вход"
        : resolution.status === "degraded"
          ? "Доступ временно недоступен"
          : "Нет доступа";

  return (
    <View
      accessibilityLabel={testID}
      style={styles.fallback}
      testID={testID}
    >
      {resolution.status === "loading" ? (
        <ActivityIndicator testID="office-role-auth-loading-spinner" />
      ) : null}
      <Text style={styles.fallbackText}>{text}</Text>
    </View>
  );
}

export function OfficeRoleAuthContextGate({
  children,
  requiredRole,
  route,
}: {
  children: React.ReactNode;
  requiredRole: OfficeRouteRole;
  route: string;
}) {
  const [resolution, setResolution] = useState<OfficeRuntimeResolution>(
    () =>
      resolveLocalDeveloperRuntimeResolution({ requiredRole }) ?? {
        status: "loading",
      },
  );

  useEffect(() => {
    let active = true;
    const localDeveloperResolution = resolveLocalDeveloperRuntimeResolution({
      requiredRole,
    });
    if (localDeveloperResolution) {
      setResolution(localDeveloperResolution);
      return () => {
        active = false;
      };
    }

    setResolution({ status: "loading" });

    void loadOfficeRuntimeResolution({ route, requiredRole })
      .then((next) => {
        if (active) setResolution(next);
      })
      .catch((error) => {
        if (!active) return;
        setResolution({
          status: "degraded",
          message: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      active = false;
    };
  }, [requiredRole, route]);

  useEffect(() => {
    if (resolution.status !== "unauthenticated") return;
    router.replace("/auth/login");
  }, [resolution.status]);

  if (resolution.status !== "ready") {
    return <OfficeRoleGateFallback resolution={resolution} />;
  }

  const providerValue = resolution.context;

  return (
    <OfficeRuntimeReactContext.Provider value={providerValue}>
      <View
        style={styles.routeHost}
        testID={`office-role-auth-context-${providerValue.role}`}
      >
        <OfficeRuntimeMarker context={providerValue} />
        {children}
      </View>
    </OfficeRuntimeReactContext.Provider>
  );
}

const styles = StyleSheet.create({
  routeHost: {
    flex: 1,
  },
  markerHost: {
    position: "absolute",
    top: 1,
    left: 1,
    zIndex: 9999,
    width: 220,
    height: 18,
    opacity: 1,
    pointerEvents: "none",
  },
  markerText: {
    color: "rgba(255,255,255,0.01)",
    fontSize: 4,
    height: 18,
    lineHeight: 5,
    width: 220,
  },
  fallback: {
    alignItems: "center",
    backgroundColor: "#0B0F14",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 24,
  },
  fallbackText: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
});
