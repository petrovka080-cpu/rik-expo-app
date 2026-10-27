import { EMPTY_DATA } from "./officeHub.constants";
import type { OfficeAccessScreenData } from "./officeAccess.types";
import {
  buildOfficePostReturnExtra,
  buildOfficePostReturnProbeFlags,
  planOfficePostReturnSectionDone,
  planOfficePostReturnTraceStart,
} from "./officePostReturnTracing.model";

const companyData: OfficeAccessScreenData = {
  ...EMPTY_DATA,
  company: {
    id: "company-1",
    owner_user_id: "user-1",
    name: "ACME Build",
    city: "Bishkek",
    address: "Toktogul 1",
    industry: "Construction",
  },
};

describe("officePostReturnTracing.model", () => {
  it("maps post-return probe flags deterministically", () => {
    expect(
      buildOfficePostReturnProbeFlags([
        "no_layout_callbacks",
        "no_interaction_manager",
        "no_animation_frame",
      ]),
    ).toEqual({
      disableScrollCallbacks: false,
      disableLayoutCallbacks: true,
      disableContentSizeCallbacks: false,
      disableKeyboardBridge: false,
      disableInteractionManager: true,
      disableAnimationFrame: true,
    });
  });

  it("builds breadcrumb extras without overriding explicit probe values", () => {
    expect(
      buildOfficePostReturnExtra({
        focusCycle: 3,
        sectionsLabel: "summary,members",
        probeLabel: "members",
        extra: { reason: "focus_refresh" },
      }),
    ).toEqual({
      owner: "office_hub",
      focusCycle: 3,
      sections: "summary,members",
      probe: "members",
      reason: "focus_refresh",
    });

    expect(
      buildOfficePostReturnExtra({
        focusCycle: 4,
        sectionsLabel: "members",
        probeLabel: "members",
        extra: { probe: "manual" },
      }),
    ).toMatchObject({ probe: "manual" });

    expect(
      buildOfficePostReturnExtra({
        focusCycle: 5,
        sectionsLabel: "none",
        probeLabel: "all",
      }),
    ).not.toHaveProperty("probe");
  });

  it("plans visible post-return sections for no-company and company states", () => {
    expect(planOfficePostReturnTraceStart(EMPTY_DATA, ["all"])).toEqual({
      sections: ["company_create", "rules"],
      sectionsLabel: "company_create,rules",
      shouldCompleteChildMountInIdle: false,
    });

    expect(planOfficePostReturnTraceStart(companyData, ["all"])).toEqual({
      sections: [
        "summary",
        "directions",
        "company_details",
        "invites",
        "members",
      ],
      sectionsLabel: "summary,directions,company_details,invites,members",
      shouldCompleteChildMountInIdle: false,
    });

    expect(planOfficePostReturnTraceStart(companyData, ["members"])).toEqual({
      sections: ["members"],
      sectionsLabel: "members",
      shouldCompleteChildMountInIdle: false,
    });
  });

  it("plans section completion without mutating caller-owned state", () => {
    const pendingSections = ["summary", "members"] as const;
    const committedSections = new Set<typeof pendingSections[number]>();

    expect(
      planOfficePostReturnSectionDone({
        section: "company_create",
        pendingSections,
        committedSections,
        layoutCommitted: false,
      }),
    ).toEqual({
      sectionsLabel: "none",
      shouldCommitLayout: false,
      shouldRecordSectionDone: false,
      shouldRecordChildMountDone: false,
    });

    expect(
      planOfficePostReturnSectionDone({
        section: "summary",
        pendingSections,
        committedSections,
        layoutCommitted: false,
      }),
    ).toEqual({
      sectionsLabel: "summary,members",
      shouldCommitLayout: true,
      shouldRecordSectionDone: true,
      shouldRecordChildMountDone: false,
    });
    expect(committedSections.size).toBe(0);

    committedSections.add("summary");
    expect(
      planOfficePostReturnSectionDone({
        section: "members",
        pendingSections,
        committedSections,
        layoutCommitted: true,
      }),
    ).toEqual({
      sectionsLabel: "summary,members",
      shouldCommitLayout: false,
      shouldRecordSectionDone: true,
      shouldRecordChildMountDone: true,
    });
  });

  it("preserves duplicate section behavior after layout commit", () => {
    expect(
      planOfficePostReturnSectionDone({
        section: "summary",
        pendingSections: ["summary"],
        committedSections: new Set(["summary"]),
        layoutCommitted: true,
      }),
    ).toEqual({
      sectionsLabel: "summary",
      shouldCommitLayout: false,
      shouldRecordSectionDone: false,
      shouldRecordChildMountDone: false,
    });
  });
});
