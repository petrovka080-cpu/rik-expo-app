import {
  OFFICE_BOOTSTRAP_ROLE,
  buildOfficeAccessEntryCopy,
  buildOfficeBootstrapProfilePayload,
  canManageOfficeCompanyAccess,
  filterOfficeWorkspaceCards,
} from "./officeAccess.model";

describe("officeAccess.model", () => {
  it("keeps market-only users outside false office role cards", () => {
    expect(filterOfficeWorkspaceCards([])).toEqual([]);
  });

  it("shows only explicitly assigned office workspaces", () => {
    const cards = filterOfficeWorkspaceCards(["director", "buyer"]);
    expect(cards.map((card) => card.key)).toEqual(["buyer", "director", "reports"]);
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
      }).title,
    ).toBe("Подключить Office");

    expect(
      buildOfficeAccessEntryCopy({
        hasOfficeAccess: true,
        hasCompanyContext: true,
      }).title,
    ).toBe("Office и компания");
  });
});
