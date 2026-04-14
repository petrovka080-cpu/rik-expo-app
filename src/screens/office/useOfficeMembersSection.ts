/**
 * useOfficeMembersSection — Owner hook for the OfficeHub members section.
 *
 * Extracted from OfficeHubScreen.tsx (Wave O) to establish a single owner
 * boundary for member role assignment state and side-effects.
 *
 * Owns:
 *  - savingRole indicator
 *  - handleAssignRole handler
 */
import { useCallback, useState } from "react";
import { Alert } from "react-native";

import { updateOfficeMemberRole } from "./officeAccess.services";
import { COPY, type LoadScreenMode } from "./officeHub.constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UseOfficeMembersSectionArgs = {
  /** Current company from the screen data — used for the role assignment. */
  company: { id: string } | null;
  /** Screen-level data loader — invoked after role assignment to refresh. */
  loadScreen: (opts?: { mode?: LoadScreenMode }) => Promise<unknown>;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOfficeMembersSection({
  company,
  loadScreen,
}: UseOfficeMembersSectionArgs) {
  // ── State ──────────────────────────────────────────────────────────────
  const [savingRole, setSavingRole] = useState<string | null>(null);

  // ── Actions ────────────────────────────────────────────────────────────

  const handleAssignRole = useCallback(
    async (memberUserId: string, nextRole: string) => {
      if (!company) return;
      try {
        setSavingRole(`${memberUserId}:${nextRole}`);
        await updateOfficeMemberRole({
          companyId: company.id,
          memberUserId,
          nextRole,
        });
        await loadScreen({
          mode: "refresh",
        });
      } catch (error: unknown) {
        Alert.alert(
          COPY.title,
          error instanceof Error && error.message.trim()
            ? error.message
            : COPY.roleAssignError,
        );
      } finally {
        setSavingRole(null);
      }
    },
    [company, loadScreen],
  );

  // ── Return ─────────────────────────────────────────────────────────────

  return {
    savingRole,
    handleAssignRole,
  };
}
