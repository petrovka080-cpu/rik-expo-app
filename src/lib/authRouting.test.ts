import { POST_AUTH_ENTRY_ROUTE } from "./authRouting";

describe("authRouting", () => {
  it("keeps profile as the unified post-auth entry route", () => {
    expect(POST_AUTH_ENTRY_ROUTE).toBe("/(tabs)/profile");
  });
});
