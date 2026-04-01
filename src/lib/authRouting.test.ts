import {
  FALLBACK_TAB,
  pathForRole,
  postAuthPathForRole,
} from "./authRouting";

describe("authRouting", () => {
  it("keeps market as the single post-auth home across role inputs", () => {
    expect(FALLBACK_TAB).toBe("/(tabs)/market");
    expect(pathForRole("director")).toBe("/(tabs)/market");
    expect(pathForRole("buyer")).toBe("/(tabs)/market");
    expect(pathForRole("accountant")).toBe("/(tabs)/market");
    expect(pathForRole("warehouse")).toBe("/(tabs)/market");
    expect(pathForRole("security")).toBe("/(tabs)/market");
    expect(pathForRole("foreman")).toBe("/(tabs)/market");
    expect(pathForRole("contractor")).toBe("/(tabs)/market");
    expect(pathForRole(null)).toBe("/(tabs)/market");
  });

  it("does not reintroduce role-tab bootstrap redirects", () => {
    expect(postAuthPathForRole("director")).toBe("/(tabs)/market");
    expect(postAuthPathForRole("foreman")).toBe("/(tabs)/market");
  });
});
