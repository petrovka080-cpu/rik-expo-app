import type { AppliedOfficeTestAuthContext } from "../../src/lib/officeAuthTest/officeRoleTestHarness";
import {
  buildEmptyOfficeRoleFixtureValidation,
  isAllowedOfficeRoleStorageStatePath,
  officeRoleMarkerTestId,
  officeRoleRoute,
  officeRoleStorageStatePath,
  redactAppliedOfficeAuthContext,
} from "./officeRoleFixtureValidation";

describe("buyer office role fixture resolution", () => {
  it("binds the buyer browser fixture to the buyer route marker and safe storage path", () => {
    const storageStatePath = officeRoleStorageStatePath("buyer");
    const validation = buildEmptyOfficeRoleFixtureValidation("buyer");
    const applied: AppliedOfficeTestAuthContext = {
      authSource: "separate_role",
      roleMode: "separate_roles",
      role: "buyer",
      userId: "raw-buyer-user-id",
      storageKey: "sb-project-auth-token",
      developerOverrideAttempted: true,
      developerOverrideApplied: false,
      developerOverrideFailed: true,
      developerOverrideFailureCode: "expired",
      fallbackToSeparateRole: true,
    };

    expect(officeRoleRoute("buyer")).toBe("/office/buyer");
    expect(officeRoleMarkerTestId("buyer")).toBe("office-runtime-context-buyer");
    expect(isAllowedOfficeRoleStorageStatePath(storageStatePath)).toBe(true);
    expect(validation.storage_state_path_allowed).toBe(true);
    expect(redactAppliedOfficeAuthContext(applied)).toMatchObject({
      role: "buyer",
      developer_override_failed: true,
      developer_override_failure_code: "expired",
      fallback_to_separate_role: true,
      user_id_present_redacted: true,
    });
    expect(JSON.stringify(redactAppliedOfficeAuthContext(applied))).not.toContain(
      "raw-buyer-user-id",
    );
  });
});
