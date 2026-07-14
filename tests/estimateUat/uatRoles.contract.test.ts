import { validateUatRoleModel } from "../../scripts/estimate/buildRoleBasedUatDashboard";

describe("role based UAT roles", () => {
  it("defines every required role with permissions and critical failures", () => {
    const validation = validateUatRoleModel();

    expect(validation.blockers).toEqual([]);
    expect(validation.uat_roles_created).toBe(true);
    expect(validation.uat_permissions_created).toBe(true);
    expect(validation.uat_flow_map_created).toBe(true);
    expect(validation.every_role_has_acceptance_criteria).toBe(true);
    expect(validation.procurement_role_cannot_see_work_rows_as_procurement).toBe(true);
    expect(validation.client_role_no_raw_debug).toBe(true);
    expect(validation.support_package_role_redacted).toBe(true);
  });
});
