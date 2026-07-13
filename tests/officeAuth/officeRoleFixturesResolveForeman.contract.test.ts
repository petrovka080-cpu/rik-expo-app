import type { AppliedOfficeTestAuthContext } from "../../src/lib/officeAuthTest/officeRoleTestHarness";
import {
  buildEmptyOfficeRoleFixtureValidation,
  isAllowedOfficeRoleStorageStatePath,
  officeRoleMarkerTestId,
  officeRoleRoute,
  officeRoleStorageStatePath,
  redactAppliedOfficeAuthContext,
} from "./officeRoleFixtureValidation";

describe("foreman office role fixture resolution", () => {
  it("binds the foreman browser fixture to the foreman route marker and safe storage path", () => {
    const storageStatePath = officeRoleStorageStatePath("foreman");
    const validation = buildEmptyOfficeRoleFixtureValidation("foreman");
    const applied: AppliedOfficeTestAuthContext = {
      authSource: "separate_role",
      roleMode: "separate_roles",
      role: "foreman",
      userId: "raw-user-id-must-not-be-exported",
      storageKey: "sb-project-auth-token",
      developerOverrideAttempted: false,
      developerOverrideApplied: false,
      developerOverrideFailed: false,
      developerOverrideFailureCode: null,
      fallbackToSeparateRole: false,
    };

    expect(officeRoleRoute("foreman")).toBe("/office/foreman");
    expect(officeRoleMarkerTestId("foreman")).toBe("office-runtime-context-foreman");
    expect(isAllowedOfficeRoleStorageStatePath(storageStatePath)).toBe(true);
    expect(validation.storage_state_path_allowed).toBe(true);
    expect(redactAppliedOfficeAuthContext(applied)).toMatchObject({
      role: "foreman",
      user_id_present_redacted: true,
      storage_key_present: true,
    });
    expect(JSON.stringify(redactAppliedOfficeAuthContext(applied))).not.toContain(
      "raw-user-id-must-not-be-exported",
    );
  });
});
