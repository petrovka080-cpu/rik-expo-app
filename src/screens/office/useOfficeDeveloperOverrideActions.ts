import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";

import {
  clearDeveloperEffectiveRole,
  DEVELOPER_OVERRIDE_ROLES,
  setDeveloperEffectiveRole,
  type DeveloperOverrideContext,
  type DeveloperOverrideRole,
} from "../../lib/developerOverride";
import type { OfficeAccessScreenData } from "./officeAccess.types";
import type { LoadScreenMode } from "./officeHub.constants";

type LoadScreen = (params?: {
  mode?: LoadScreenMode;
  reason?: string;
}) => Promise<OfficeAccessScreenData | null>;

type UseOfficeDeveloperOverrideActionsParams = {
  developerOverride: DeveloperOverrideContext | null | undefined;
  loadScreen: LoadScreen;
};

export function useOfficeDeveloperOverrideActions({
  developerOverride,
  loadScreen,
}: UseOfficeDeveloperOverrideActionsParams) {
  const [developerRoleSaving, setDeveloperRoleSaving] = useState<string | null>(
    null,
  );

  const developerOverrideRoles = useMemo(
    () =>
      DEVELOPER_OVERRIDE_ROLES.filter((role) =>
        developerOverride?.allowedRoles.includes(role),
      ),
    [developerOverride?.allowedRoles],
  );

  const handleDeveloperRoleSelect = useCallback(
    async (role: DeveloperOverrideRole) => {
      setDeveloperRoleSaving(role);
      try {
        await setDeveloperEffectiveRole(role);
        await loadScreen({
          mode: "refresh",
          reason: "developer_override_role_selected",
        });
      } catch (error) {
        Alert.alert(
          "Dev override",
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        setDeveloperRoleSaving(null);
      }
    },
    [loadScreen],
  );

  const handleDeveloperRoleClear = useCallback(async () => {
    setDeveloperRoleSaving("normal");
    try {
      await clearDeveloperEffectiveRole();
      await loadScreen({
        mode: "refresh",
        reason: "developer_override_cleared",
      });
    } catch (error) {
      Alert.alert(
        "Dev override",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setDeveloperRoleSaving(null);
    }
  }, [loadScreen]);

  const onDeveloperRoleSelect = useCallback(
    (role: DeveloperOverrideRole) => {
      void handleDeveloperRoleSelect(role);
    },
    [handleDeveloperRoleSelect],
  );

  const onDeveloperRoleClear = useCallback(() => {
    void handleDeveloperRoleClear();
  }, [handleDeveloperRoleClear]);

  return {
    developerRoleSaving,
    developerOverrideRoles,
    onDeveloperRoleSelect,
    onDeveloperRoleClear,
  };
}
