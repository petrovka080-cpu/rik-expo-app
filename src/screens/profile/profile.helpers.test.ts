import { getProfileRoleColor, getProfileRoleLabel } from "./profile.helpers";

describe("profile.helpers role labels", () => {
  it("renders canonical office role labels without mojibake", () => {
    expect(getProfileRoleLabel("director")).toBe("Директор");
    expect(getProfileRoleLabel("buyer")).toBe("Снабженец");
    expect(getProfileRoleLabel("foreman")).toBe("Прораб");
    expect(getProfileRoleLabel("warehouse")).toBe("Склад");
    expect(getProfileRoleLabel("accountant")).toBe("Бухгалтер");
    expect(getProfileRoleLabel("contractor")).toBe("Подрядчик");
    expect(getProfileRoleLabel("security")).toBe("Безопасность");
  });

  it("falls back to a safe label for unknown roles", () => {
    expect(getProfileRoleLabel("mystery-role")).toBe("Роль GOX");
    expect(getProfileRoleLabel(null)).toBe("Роль GOX");
  });

  it("keeps role colors stable for canonical roles", () => {
    expect(getProfileRoleColor("director")).toBe("#2563EB");
    expect(getProfileRoleColor("buyer")).toBe("#14B8A6");
    expect(getProfileRoleColor("foreman")).toBe("#F97316");
  });
});
