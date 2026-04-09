import {
  buildOfficeReentryBreadcrumbsText,
  recordOfficeNativeAnimationFrameDone,
  recordOfficeNativeAnimationFrameStart,
  recordOfficeNativeCallbackFailure,
  recordOfficeNativeContentSizeDone,
  recordOfficeNativeContentSizeStart,
  recordOfficeNativeFocusCallbackDone,
  recordOfficeNativeFocusCallbackStart,
  recordOfficeNativeInteractionDone,
  recordOfficeNativeInteractionStart,
  recordOfficeNativeKeyboardEvent,
  recordOfficeNativeLayoutDone,
  recordOfficeNativeLayoutStart,
  recordOfficePostReturnChildMountDone,
  recordOfficePostReturnChildMountStart,
  recordOfficePostReturnFocus,
  recordOfficePostReturnIdleDone,
  recordOfficePostReturnIdleStart,
  recordOfficePostReturnLayoutCommit,
  recordOfficePostReturnSectionRenderDone,
  recordOfficePostReturnSectionRenderStart,
  recordOfficePostReturnSubtreeDone,
  recordOfficePostReturnSubtreeFailure,
  recordOfficePostReturnSubtreeStart,
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
          marker: "office_native_layout_done",
          result: "success",
          extra: {
            route: "/office",
            owner: "office_hub",
            focusCycle: 3,
            callback: "section_layout:members",
            probe: "no_layout_callbacks",
          },
        },
      ]),
    ).toBe(
      "2026-04-09T10:00:00.000Z | office_native_layout_done | success | route=/office | owner=office_hub | focusCycle=3 | callback=section_layout:members | probe=no_layout_callbacks",
    );
  });

  it("records the expected office reentry marker sequence", () => {
    recordOfficeReentryStart({ owner: "office_index_route" });
    recordOfficeReentryComponentMount({ owner: "office_hub" });
    recordOfficeReentryEffectStart({ owner: "office_hub", mode: "initial" });
    recordOfficeReentryEffectDone({ owner: "office_hub", mode: "initial" });
    recordOfficeReentryRenderSuccess({ owner: "office_hub" });
    recordOfficePostReturnFocus({ owner: "office_hub", focusCycle: 2 });
    recordOfficeNativeFocusCallbackStart({
      owner: "office_hub",
      focusCycle: 2,
      callback: "useFocusEffect",
    });
    recordOfficePostReturnChildMountStart({
      owner: "office_hub",
      focusCycle: 2,
      sections: "summary,directions,invites,members",
    });
    recordOfficePostReturnSubtreeStart({
      owner: "office_hub",
      focusCycle: 2,
      subtree: "members_list",
      probe: "members",
    });
    recordOfficeNativeLayoutStart({
      owner: "office_hub",
      focusCycle: 2,
      callback: "section_layout:summary",
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
    recordOfficeNativeLayoutDone({
      owner: "office_hub",
      focusCycle: 2,
      callback: "section_layout:summary",
    });
    recordOfficePostReturnSubtreeDone({
      owner: "office_hub",
      focusCycle: 2,
      subtree: "members_list",
      probe: "members",
    });
    recordOfficeNativeContentSizeStart({
      owner: "office_hub",
      focusCycle: 2,
      callback: "scroll_view:onContentSizeChange",
    });
    recordOfficeNativeContentSizeDone({
      owner: "office_hub",
      focusCycle: 2,
      callback: "scroll_view:onContentSizeChange",
    });
    recordOfficeNativeAnimationFrameStart({
      owner: "office_hub",
      focusCycle: 2,
      callback: "requestAnimationFrame",
    });
    recordOfficeNativeAnimationFrameDone({
      owner: "office_hub",
      focusCycle: 2,
      callback: "requestAnimationFrame",
    });
    recordOfficeNativeInteractionStart({
      owner: "office_hub",
      focusCycle: 2,
      callback: "InteractionManager.runAfterInteractions",
    });
    recordOfficeNativeInteractionDone({
      owner: "office_hub",
      focusCycle: 2,
      callback: "InteractionManager.runAfterInteractions",
    });
    recordOfficeNativeKeyboardEvent({
      owner: "office_hub",
      focusCycle: 2,
      callback: "Keyboard.keyboardDidShow",
    });
    recordOfficePostReturnIdleStart({ owner: "office_hub", focusCycle: 2 });
    recordOfficePostReturnIdleDone({ owner: "office_hub", focusCycle: 2 });
    recordOfficePostReturnChildMountDone({
      owner: "office_hub",
      focusCycle: 2,
      sections: "summary,directions,invites,members",
    });
    recordOfficeNativeFocusCallbackDone({
      owner: "office_hub",
      focusCycle: 2,
      callback: "useFocusEffect",
    });
    recordOfficePostReturnSubtreeFailure({
      error: new Error("members subtree failed"),
      errorStage: "subtree_boundary",
      extra: {
        owner: "office_hub",
        focusCycle: 2,
        subtree: "members_list",
      },
    });
    recordOfficeNativeCallbackFailure({
      error: new Error("layout callback failed"),
      errorStage: "layout",
      extra: {
        owner: "office_hub",
        focusCycle: 2,
        callback: "section_layout:summary",
      },
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
      "office_native_focus_callback_start",
      "office_post_return_child_mount_start",
      "office_post_return_subtree_start",
      "office_native_layout_start",
      "office_post_return_section_render_start",
      "office_post_return_layout_commit",
      "office_post_return_section_render_done",
      "office_native_layout_done",
      "office_post_return_subtree_done",
      "office_native_content_size_start",
      "office_native_content_size_done",
      "office_native_animation_frame_start",
      "office_native_animation_frame_done",
      "office_native_interaction_start",
      "office_native_interaction_done",
      "office_native_keyboard_event",
      "office_post_return_idle_start",
      "office_post_return_idle_done",
      "office_post_return_child_mount_done",
      "office_native_focus_callback_done",
      "office_post_return_subtree_failed",
      "office_native_callback_failed",
      "office_reentry_failed",
    ]);
    expect(events.at(-1)).toMatchObject({
      marker: "office_reentry_failed",
      result: "error",
      errorStage: "load_screen",
    });
  });
});
