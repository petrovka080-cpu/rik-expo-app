import {
  OFFICE_BOOTSTRAP_ROLE,
  buildOfficeAccessEntryCopy,
  buildOfficeBootstrapProfilePayload,
  canManageOfficeCompanyAccess,
  filterOfficeWorkspaceCards,
} from "./officeAccess.model";

describe("officeAccess.model", () => {
  it("keeps market-only users outside false office role cards", () => {
    expect(
      filterOfficeWorkspaceCards({ availableOfficeRoles: [] }),
    ).toEqual([]);
  });

  it("shows only explicitly assigned office workspaces", () => {
    const cards = filterOfficeWorkspaceCards({
      availableOfficeRoles: ["director", "buyer"],
    });
    expect(cards.map((card) => card.key)).toEqual([
      "director",
      "buyer",
      "reports",
    ]);
  });

  it("shows the full director-owned directions set for managed office entry", () => {
    const cards = filterOfficeWorkspaceCards({
      availableOfficeRoles: ["director"],
      includeDirectorOwnedDirections: true,
    });

    expect(cards.map((card) => card.key)).toEqual([
      "director",
      "foreman",
      "buyer",
      "accountant",
      "warehouse",
      "contractor",
      "security",
      "engineer",
      "reports",
    ]);
  });

  it("marks bootstrap company creation as director-only start", () => {
    expect(OFFICE_BOOTSTRAP_ROLE).toBe("director");
    expect(
      buildOfficeBootstrapProfilePayload({
        id: "profile-1",
        user_id: "user-1",
        full_name: "Айбек",
        phone: "+996700000000",
        city: "Бишкек",
        usage_market: true,
        usage_build: false,
      }),
    ).toMatchObject({
      user_id: "user-1",
      usage_market: true,
      usage_build: true,
    });
  });

  it("allows company management only for owner or director", () => {
    expect(
      canManageOfficeCompanyAccess({
        currentUserId: "user-1",
        companyOwnerUserId: "user-1",
        companyAccessRole: null,
        availableOfficeRoles: [],
      }),
    ).toBe(true);

    expect(
      canManageOfficeCompanyAccess({
        currentUserId: "user-2",
        companyOwnerUserId: "user-1",
        companyAccessRole: "director",
        availableOfficeRoles: ["buyer"],
      }),
    ).toBe(true);

    expect(
      canManageOfficeCompanyAccess({
        currentUserId: "user-2",
        companyOwnerUserId: "user-1",
        companyAccessRole: "buyer",
        availableOfficeRoles: ["buyer"],
      }),
    ).toBe(false);
  });

  it("keeps profile entry copy honest for bootstrap and managed access", () => {
    expect(
      buildOfficeAccessEntryCopy({
        hasOfficeAccess: false,
        hasCompanyContext: false,
      }),
    ).toMatchObject({
      title: "Подключить Office",
      subtitle: "Создайте компанию, чтобы начать работу.",
    });

    expect(
      buildOfficeAccessEntryCopy({
        hasOfficeAccess: true,
        hasCompanyContext: true,
      }),
    ).toMatchObject({
      title: "Office",
      subtitle: "Контроль, команда и компания.",
    });
  });
});
