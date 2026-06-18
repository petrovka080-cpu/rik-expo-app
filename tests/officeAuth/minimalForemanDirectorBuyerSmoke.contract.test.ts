import {
  buildOfficeRuntimeContext,
  canUseOfficeRoute,
  hasOfficeRuntimePermission,
} from "../../src/lib/officeRuntime/officeRuntimePolicy";

describe("minimal foreman director buyer office smoke", () => {
  it("keeps the minimal approval chain roles and permissions visible", () => {
    const foreman = buildOfficeRuntimeContext({ userId: "foreman", role: "foreman" });
    const director = buildOfficeRuntimeContext({ userId: "director", role: "director" });
    const buyer = buildOfficeRuntimeContext({ userId: "buyer", role: "buyer" });

    const matrix = {
      foreman_route_auth_context_present: canUseOfficeRoute({
        context: foreman,
        requiredRole: "foreman",
      }),
      director_route_auth_context_present: canUseOfficeRoute({
        context: director,
        requiredRole: "director",
      }),
      buyer_route_auth_context_present: canUseOfficeRoute({
        context: buyer,
        requiredRole: "buyer",
      }),
      director_approval_controls_visible: hasOfficeRuntimePermission(
        director,
        "office:request:approve",
      ),
      buyer_procurement_controls_visible: hasOfficeRuntimePermission(
        buyer,
        "office:procurement:create",
      ),
      wrong_role_can_approve_as_director: canUseOfficeRoute({
        context: foreman,
        requiredRole: "director",
      }),
    };

    expect(matrix).toEqual({
      foreman_route_auth_context_present: true,
      director_route_auth_context_present: true,
      buyer_route_auth_context_present: true,
      director_approval_controls_visible: true,
      buyer_procurement_controls_visible: true,
      wrong_role_can_approve_as_director: false,
    });
  });
});
