import {
  normalizeCompanyMembershipRows,
  resolveForemanRequestPdfAccess,
  resolveWarehousePdfAccess,
} from "./rolePdfAuth";

describe("rolePdfAuth policy layer", () => {
  describe("normalizeCompanyMembershipRows", () => {
    it("normalizes company membership rows and drops invalid entries", () => {
      expect(
        normalizeCompanyMembershipRows([
          { company_id: "company-1", role: " Director " },
          { companyId: "company-2", role: "warehouse" },
          { company_id: "", role: "foreman" },
          { company_id: "company-3", role: "" },
        ]),
      ).toEqual([
        { companyId: "company-1", role: "director" },
        { companyId: "company-2", role: "warehouse" },
      ]);
    });
  });

  describe("resolveForemanRequestPdfAccess", () => {
    it("allows same-company foreman owner", () => {
      expect(
        resolveForemanRequestPdfAccess({
          authUid: "foreman-user",
          requestFound: true,
          requestCreatedBy: "foreman-user",
          actorMembershipRows: [{ company_id: "company-1", role: "foreman" }],
          creatorCompanyIds: ["company-1"],
        }),
      ).toMatchObject({
        allowed: true,
        reason: "allowed_foreman_owner",
        companyId: "company-1",
        isDirector: false,
        ownerCheckApplied: true,
      });
    });

    it("allows same-company director for another foreman request", () => {
      expect(
        resolveForemanRequestPdfAccess({
          authUid: "director-user",
          requestFound: true,
          requestCreatedBy: "foreman-user",
          actorMembershipRows: [{ company_id: "company-1", role: "director" }],
          creatorCompanyIds: ["company-1"],
        }),
      ).toMatchObject({
        allowed: true,
        reason: "allowed_director_same_company",
        companyId: "company-1",
        isDirector: true,
        ownerCheckApplied: false,
      });
    });

    it("denies wrong-company director", () => {
      expect(
        resolveForemanRequestPdfAccess({
          authUid: "director-user",
          requestFound: true,
          requestCreatedBy: "foreman-user",
          actorMembershipRows: [{ company_id: "company-2", role: "director" }],
          creatorCompanyIds: ["company-1"],
        }),
      ).toMatchObject({
        allowed: false,
        reason: "membership_role_forbidden",
        companyId: null,
      });
    });

    it("denies missing membership", () => {
      expect(
        resolveForemanRequestPdfAccess({
          authUid: "director-user",
          requestFound: true,
          requestCreatedBy: "foreman-user",
          actorMembershipRows: [],
          creatorCompanyIds: ["company-1"],
        }),
      ).toMatchObject({
        allowed: false,
        reason: "membership_role_forbidden",
      });
    });

    it("keeps owner restriction for non-director", () => {
      expect(
        resolveForemanRequestPdfAccess({
          authUid: "foreman-user",
          requestFound: true,
          requestCreatedBy: "other-user",
          actorMembershipRows: [{ company_id: "company-1", role: "foreman" }],
          creatorCompanyIds: ["company-1"],
        }),
      ).toMatchObject({
        allowed: false,
        reason: "owner_mismatch",
        companyId: "company-1",
        ownerCheckApplied: true,
      });
    });
  });

  describe("resolveWarehousePdfAccess", () => {
    it("allows warehouse membership in same company scope", () => {
      expect(
        resolveWarehousePdfAccess({
          membershipRows: [{ company_id: "company-1", role: "warehouse" }],
        }),
      ).toMatchObject({
        allowed: true,
        reason: "allowed_warehouse_same_company",
        companyId: "company-1",
      });
    });

    it("allows director cross-role access", () => {
      expect(
        resolveWarehousePdfAccess({
          membershipRows: [{ company_id: "company-1", role: "director" }],
        }),
      ).toMatchObject({
        allowed: true,
        reason: "allowed_director_same_company",
        companyId: "company-1",
        isDirector: true,
      });
    });

    it("denies users without warehouse or director membership", () => {
      expect(
        resolveWarehousePdfAccess({
          membershipRows: [{ company_id: "company-1", role: "buyer" }],
        }),
      ).toMatchObject({
        allowed: false,
        reason: "membership_role_forbidden",
        companyId: "company-1",
      });
    });

    it("denies missing membership", () => {
      expect(
        resolveWarehousePdfAccess({
          membershipRows: [],
        }),
      ).toMatchObject({
        allowed: false,
        reason: "membership_role_forbidden",
        companyId: null,
      });
    });
  });
});
