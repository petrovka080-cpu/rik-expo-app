import {
  buildOfficeReentryBreadcrumbsText,
  recordOfficePostReturnChildMountDone,
  recordOfficePostReturnChildMountStart,
  recordOfficePostReturnFocus,
  recordOfficePostReturnIdleDone,
  recordOfficePostReturnIdleStart,
  recordOfficePostReturnLayoutCommit,
  recordOfficePostReturnSectionRenderDone,
  recordOfficePostReturnSectionRenderStart,
  recordOfficeReentryComponentMount,
  recordOfficeReentryEffectDone,
  recordOfficeReentryEffectStart,
  recordOfficeReentryFailure,
  recordOfficeReentryRenderSuccess,
  recordOfficeReentryStart,
} from "../../src/lib/navigation/officeReentryBreadcrumbs";
import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../../src/lib/observability/platformObservability";

describe("office reentry breadcrumbs", () => {
  beforeEach(() => {
    resetPlatformObservabilityEvents();
  });

  it("formats readable office reentry diagnostics", () => {
    expect(
      buildOfficeReentryBreadcrumbsText([
        {
          at: "2026-04-09T10:00:00.000Z",
          marker: "office_post_return_section_render_done",
          result: "success",
          extra: {
            route: "/office",
            owner: "office_hub",
            focusCycle: 3,
            section: "members",
          },
        },
      ]),
    ).toBe(
      "2026-04-09T10:00:00.000Z | office_post_return_section_render_done | success | route=/office | owner=office_hub | focusCycle=3 | section=members",
    );
  });

  it("records the expected office reentry marker sequence", () => {
    recordOfficeReentryStart({ owner: "office_index_route" });
    recordOfficeReentryComponentMount({ owner: "office_hub" });
    recordOfficeReentryEffectStart({ owner: "office_hub", mode: "initial" });
    recordOfficeReentryEffectDone({ owner: "office_hub", mode: "initial" });
    recordOfficeReentryRenderSuccess({ owner: "office_hub" });
    recordOfficePostReturnFocus({ owner: "office_hub", focusCycle: 2 });
    recordOfficePostReturnChildMountStart({
      owner: "office_hub",
      focusCycle: 2,
      sections: "summary,directions,invites,members",
    });
    recordOfficePostReturnSectionRenderStart({
      owner: "office_hub",
      focusCycle: 2,
      section: "summary",
    });
    recordOfficePostReturnLayoutCommit({
      owner: "office_hub",
      focusCycle: 2,
      section: "summary",
    });
    recordOfficePostReturnSectionRenderDone({
      owner: "office_hub",
      focusCycle: 2,
      section: "summary",
    });
    recordOfficePostReturnIdleStart({ owner: "office_hub", focusCycle: 2 });
    recordOfficePostReturnIdleDone({ owner: "office_hub", focusCycle: 2 });
    recordOfficePostReturnChildMountDone({
      owner: "office_hub",
      focusCycle: 2,
      sections: "summary,directions,invites,members",
    });
    recordOfficeReentryFailure({
      error: new Error("office failed"),
      errorStage: "load_screen",
      extra: { owner: "office_hub" },
    });

    const events = getPlatformObservabilityEvents().map((event) => ({
      marker: event.event,
      result: event.result,
      errorStage: event.errorStage ?? null,
    }));

    expect(events.map((event) => event.marker)).toEqual([
      "office_reentry_start",
      "office_reentry_route_match",
      "office_reentry_component_enter",
      "office_reentry_mount",
      "office_reentry_effect_start",
      "office_reentry_effect_done",
      "office_reentry_render_success",
      "office_post_return_focus",
      "office_post_return_child_mount_start",
      "office_post_return_section_render_start",
      "office_post_return_layout_commit",
      "office_post_return_section_render_done",
      "office_post_return_idle_start",
      "office_post_return_idle_done",
      "office_post_return_child_mount_done",
      "office_reentry_failed",
    ]);
    expect(events.at(-1)).toMatchObject({
      marker: "office_reentry_failed",
      result: "error",
      errorStage: "load_screen",
    });
  });
});
