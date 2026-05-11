import {
  AI_SCREEN_CAPABILITY_REGISTRY,
  assertAiScreenAccess,
  getAiScreenCapabilities,
} from "../../src/features/ai/policy/aiScreenCapabilityRegistry";

describe("AI screen capability registry", () => {
  it("registers required screens with role-scoped policies", () => {
    const ids = AI_SCREEN_CAPABILITY_REGISTRY.map((entry) => entry.screenId);
    expect(ids).toEqual(expect.arrayContaining([
      "director.dashboard",
      "buyer.main",
      "market.home",
      "accountant.main",
      "foreman.main",
      "foreman.subcontract",
      "contractor.main",
      "office.hub",
      "map.main",
      "chat.main",
      "reports.modal",
      "foreman.ai.quick_modal",
    ]));
    expect(getAiScreenCapabilities("director.dashboard", "director").entry).toMatchObject({
      domain: "control",
      contextPolicy: "director_full",
      mutationPolicy: "approval_required",
    });
  });

  it("allows scoped roles and denies incompatible screen access", () => {
    expect(assertAiScreenAccess("buyer.main", "buyer").allowed).toBe(true);
    expect(assertAiScreenAccess("accountant.main", "foreman").allowed).toBe(false);
    expect(assertAiScreenAccess("contractor.main", "contractor").allowed).toBe(true);
    expect(assertAiScreenAccess("director.dashboard", "contractor").allowed).toBe(false);
  });
});
