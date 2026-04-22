import type { OfficeAccessMember } from "../../src/screens/office/officeAccess.types";
import {
  OFFICE_MEMBERS_PAGE_LIMIT,
  OFFICE_MEMBERS_PAGE_MAX_LIMIT,
  buildOfficeMembersPagination,
  mergeOfficeMembersPages,
  normalizeOfficeMembersPageParams,
} from "../../src/screens/office/officeAccess.types";

const buildMember = (userId: string): OfficeAccessMember => ({
  userId,
  role: "foreman",
  fullName: `Member ${userId}`,
  phone: null,
  createdAt: "2026-04-01T00:00:00.000Z",
  isOwner: false,
});

describe("officeMembersPagination.contract", () => {
  it("normalizes malformed params to the safe first-page contract", () => {
    expect(
      normalizeOfficeMembersPageParams({
        limit: 0,
        offset: -3,
      }),
    ).toEqual({
      limit: OFFICE_MEMBERS_PAGE_LIMIT,
      offset: 0,
    });
  });

  it("clamps oversized limits without changing the explicit contract shape", () => {
    expect(
      normalizeOfficeMembersPageParams({
        limit: 999,
        offset: 4,
      }),
    ).toEqual({
      limit: OFFICE_MEMBERS_PAGE_MAX_LIMIT,
      offset: 4,
    });
  });

  it("builds deterministic next-offset metadata for exact and partial pages", () => {
    expect(
      buildOfficeMembersPagination({
        limit: 2,
        offset: 0,
        total: 4,
        loadedCount: 2,
      }),
    ).toEqual({
      limit: 2,
      nextOffset: 2,
      total: 4,
      hasMore: true,
    });

    expect(
      buildOfficeMembersPagination({
        limit: 2,
        offset: 2,
        total: 3,
        loadedCount: 1,
      }),
    ).toEqual({
      limit: 2,
      nextOffset: 3,
      total: 3,
      hasMore: false,
    });
  });

  it("merges pages without duplicating already loaded members", () => {
    expect(
      mergeOfficeMembersPages(
        [buildMember("user-1"), buildMember("user-2")],
        [buildMember("user-2"), buildMember("user-3")],
      ).map((member) => member.userId),
    ).toEqual(["user-1", "user-2", "user-3"]);
  });
});
