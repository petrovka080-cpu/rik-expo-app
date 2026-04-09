import { useEffect, useState } from "react";

import { recordPlatformObservability } from "./observability/platformObservability";
import { resolveCurrentSessionRole } from "./sessionRole";

type AppRole = "foreman" | "director" | "viewer";

const normalizeAppRole = (value: unknown): AppRole | null => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "foreman" || normalized === "director" || normalized === "viewer") {
    return normalized;
  }
  return null;
};

export function useRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resolution = await resolveCurrentSessionRole({
          ensureProfile: false,
          trigger: "useRole_hook",
        });
        if (!mounted) return;

        const normalizedRole = normalizeAppRole(resolution.role);
        if (!normalizedRole && resolution.role) {
          recordPlatformObservability({
            screen: "profile",
            surface: "use_role",
            category: "fetch",
            event: "use_role_invalid_role",
            result: "error",
            sourceKind: resolution.source,
            errorStage: "normalize_role",
            errorMessage: "invalid_role_payload",
            extra: {
              rawRole: resolution.role,
              userId: resolution.userId,
            },
          });
        }
        setRole(normalizedRole);
      } catch (error) {
        if (!mounted) return;
        recordPlatformObservability({
          screen: "profile",
          surface: "use_role",
          category: "fetch",
          event: "use_role_resolve_failed",
          result: "error",
          errorStage: "resolve_current_session_role",
          errorMessage: error instanceof Error ? error.message : String(error),
        });
        setRole(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { role, loading };
}
