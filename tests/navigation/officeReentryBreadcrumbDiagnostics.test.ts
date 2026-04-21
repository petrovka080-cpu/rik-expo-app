import {
  buildOfficeReentryBreadcrumbsText,
  formatOfficePostReturnProbe,
  getOfficePostReturnProbe,
  normalizeOfficePostReturnProbe,
  setOfficePostReturnProbe,
} from "../../src/lib/navigation/officeReentryBreadcrumbs";

describe("office reentry breadcrumb diagnostics", () => {
  afterEach(() => {
    setOfficePostReturnProbe("all");
  });

  it("normalizes probe tokens from arrays and comma-delimited strings", () => {
    expect(
      normalizeOfficePostReturnProbe([
        "members",
        "summary",
        "members",
        " summary , no_layout_callbacks ",
      ]),
    ).toEqual(["members", "summary", "no_layout_callbacks"]);

    expect(
      normalizeOfficePostReturnProbe("members,summary, members ,invalid"),
    ).toEqual(["members", "summary"]);
  });

  it("keeps probe state deterministic through get/set helpers", () => {
    expect(setOfficePostReturnProbe("members,summary, members")).toEqual([
      "members",
      "summary",
    ]);
    expect(getOfficePostReturnProbe()).toEqual(["members", "summary"]);
    expect(setOfficePostReturnProbe(null)).toEqual(["all"]);
    expect(getOfficePostReturnProbe()).toEqual(["all"]);
  });

  it("formats probe and breadcrumb text without changing diagnostic ordering", () => {
    expect(formatOfficePostReturnProbe(["members", "summary", "members"]))
      .toBe("members,summary");
    expect(formatOfficePostReturnProbe([])).toBe("all");

    expect(
      buildOfficeReentryBreadcrumbsText([
        {
          at: "2026-04-21T10:00:00.000Z",
          marker: "office_post_return_subtree_done",
          result: "success",
          extra: {
            route: "/office",
            owner: "office_hub",
            focusCycle: 4,
            subtree: "members_list",
            probe: "members",
          },
        },
      ]),
    ).toBe(
      "2026-04-21T10:00:00.000Z | office_post_return_subtree_done | success | route=/office | owner=office_hub | focusCycle=4 | subtree=members_list | probe=members",
    );
  });
});
