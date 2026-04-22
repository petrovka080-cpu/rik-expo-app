import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import type {
  OfficeAccessMember,
  OfficeMembersPagination,
} from "../../src/screens/office/officeAccess.types";
import { useOfficeMembersSection } from "../../src/screens/office/useOfficeMembersSection";

const mockLoadOfficeMembersPage = jest.fn();
const mockUpdateOfficeMemberRole = jest.fn();
const mockLoadScreen = jest.fn();

jest.mock("../../src/screens/office/officeAccess.services", () => ({
  loadOfficeMembersPage: (...args: unknown[]) => mockLoadOfficeMembersPage(...args),
  updateOfficeMemberRole: (...args: unknown[]) =>
    mockUpdateOfficeMemberRole(...args),
}));

type MembersState = ReturnType<typeof useOfficeMembersSection>;

let latestState: MembersState | null = null;

const company = {
  id: "company-1",
  owner_user_id: "user-1",
  name: "ACME Build",
  city: "Bishkek",
  address: "Office",
  industry: "Construction",
  phone_main: null,
  phone_whatsapp: null,
  email: null,
  site: null,
  inn: null,
  about_short: null,
  about_full: null,
};

const buildMember = (userId: string): OfficeAccessMember => ({
  userId,
  role: "foreman",
  fullName: `Member ${userId}`,
  phone: null,
  createdAt: `2026-04-0${userId.slice(-1)}T00:00:00.000Z`,
  isOwner: userId === "user-1",
});

const buildPagination = (
  loadedCount: number,
  total: number,
  limit = 2,
): OfficeMembersPagination => ({
  limit,
  nextOffset: loadedCount,
  total,
  hasMore: loadedCount < total,
});

function Probe(
  props: Parameters<typeof useOfficeMembersSection>[0],
): React.ReactElement | null {
  latestState = useOfficeMembersSection(props);
  return null;
}

function renderProbe(
  props: Parameters<typeof useOfficeMembersSection>[0],
): ReactTestRenderer {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(<Probe {...props} />);
  });
  return renderer;
}

describe("useOfficeMembersSection pagination", () => {
  beforeEach(() => {
    latestState = null;
    mockLoadOfficeMembersPage.mockReset();
    mockUpdateOfficeMemberRole.mockReset();
    mockLoadScreen.mockReset();
  });

  it("appends the next page in order and preserves the success path", async () => {
    mockLoadOfficeMembersPage.mockResolvedValue({
      members: [buildMember("user-3"), buildMember("user-4")],
      membersPagination: buildPagination(4, 4),
    });

    renderProbe({
      company,
      initialMembers: [buildMember("user-1"), buildMember("user-2")],
      initialMembersPagination: buildPagination(2, 4),
      loadScreen: mockLoadScreen,
    });

    await act(async () => {
      await latestState?.handleLoadMore();
    });

    expect(mockLoadOfficeMembersPage).toHaveBeenCalledWith({
      company,
      limit: 2,
      offset: 2,
    });
    expect(latestState?.items.map((member) => member.userId)).toEqual([
      "user-1",
      "user-2",
      "user-3",
      "user-4",
    ]);
    expect(latestState?.hasMore).toBe(false);
  });

  it("deduplicates overlapping pages instead of rendering duplicates", async () => {
    mockLoadOfficeMembersPage.mockResolvedValue({
      members: [buildMember("user-2"), buildMember("user-3")],
      membersPagination: buildPagination(3, 3),
    });

    renderProbe({
      company,
      initialMembers: [buildMember("user-1"), buildMember("user-2")],
      initialMembersPagination: buildPagination(2, 3),
      loadScreen: mockLoadScreen,
    });

    await act(async () => {
      await latestState?.handleLoadMore();
    });

    expect(latestState?.items.map((member) => member.userId)).toEqual([
      "user-1",
      "user-2",
      "user-3",
    ]);
  });

  it("resets to the refreshed first page instead of keeping stale appended rows", () => {
    const renderer = renderProbe({
      company,
      initialMembers: [buildMember("user-1"), buildMember("user-2")],
      initialMembersPagination: buildPagination(2, 4),
      loadScreen: mockLoadScreen,
    });

    act(() => {
      renderer.update(
        <Probe
          company={company}
          initialMembers={[buildMember("user-1")]}
          initialMembersPagination={buildPagination(1, 1)}
          loadScreen={mockLoadScreen}
        />,
      );
    });

    expect(latestState?.items.map((member) => member.userId)).toEqual([
      "user-1",
    ]);
    expect(latestState?.hasMore).toBe(false);
  });

  it("does not request another page once the contract reports no more data", async () => {
    renderProbe({
      company,
      initialMembers: [buildMember("user-1")],
      initialMembersPagination: buildPagination(1, 1),
      loadScreen: mockLoadScreen,
    });

    await act(async () => {
      await latestState?.handleLoadMore();
    });

    expect(mockLoadOfficeMembersPage).not.toHaveBeenCalled();
  });
});
