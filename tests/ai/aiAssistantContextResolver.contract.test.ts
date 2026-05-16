import { resolveAssistantUserContext } from "../../src/features/ai/assistantUx/aiAssistantContextResolver";

describe("AI assistant context resolver", () => {
  it("treats context=buyer as procurement even when the session role is contractor", () => {
    const resolved = resolveAssistantUserContext({
      urlContext: "buyer",
      sessionRole: "contractor",
      screenId: "buyer.main",
    });

    expect(resolved).toMatchObject({
      effectiveDomain: "procurement",
      userRole: "contractor",
      accessMode: "limited",
      userFacingScopeLabel: "Снабжение",
    });
    expect(resolved.userFacingNotice).toContain("роль имеет ограниченный доступ");
  });

  it("keeps real buyer access full for buyer context", () => {
    expect(
      resolveAssistantUserContext({
        urlContext: "buyer",
        sessionRole: "buyer",
        screenId: "buyer.main",
      }),
    ).toMatchObject({
      effectiveDomain: "procurement",
      userRole: "buyer",
      accessMode: "full",
      userFacingScopeLabel: "Снабжение",
    });
  });
});
