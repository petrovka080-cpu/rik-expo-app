import type { AppliedOfficeTestAuthContext } from "../../src/lib/officeAuthTest/officeRoleTestHarness";
import {
  buildEmptyOfficeRoleFixtureValidation,
  isAllowedOfficeRoleStorageStatePath,
  officeRoleMarkerTestId,
  officeRoleRoute,
  officeRoleStorageStatePath,
  redactAppliedOfficeAuthContext,
} from "./officeRoleFixtureValidation";

describe("director office role fixture resolution", () => {
  it("binds the director browser fixture to the director route marker and safe storage path", () => {
    const storageStatePath = officeRoleStorageStatePath("director");
    const validation = buildEmptyOfficeRoleFixtureValidation("director");
    const applied: AppliedOfficeTestAuthContext = {
      authSource: "developer_control",
      roleMode: "developer_control_full_access",
      role: "director",
      userId: "raw-director-user-id",
      storageKey: "sb-project-auth-token",
      developerOverrideAttempted: true,
      developerOverrideApplied: true,
      developerOverrideFailed: false,
      developerOverrideFailureCode: null,
      fallbackToSeparateRole: false,
    };

    expect(officeRoleRoute("director")).toBe("/office/director");
    expect(officeRoleMarkerTestId("director")).toBe("office-runtime-context-director");
    expect(isAllowedOfficeRoleStorageStatePath(storageStatePath)).toBe(true);
    expect(validation.storage_state_path_allowed).toBe(true);
    expect(redactAppliedOfficeAuthContext(applied)).toMatchObject({
      role: "director",
      developer_override_attempted: true,
      developer_override_applied: true,
      user_id_present_redacted: true,
    });
    expect(JSON.stringify(redactAppliedOfficeAuthContext(applied))).not.toContain(
      "raw-director-user-id",
    );
  });
});
