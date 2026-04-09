import {
  buildOfficeReentryBreadcrumbsText,
  recordOfficeBootstrapInitialDone,
  recordOfficeBootstrapInitialStart,
  recordOfficeFocusRefreshDone,
  recordOfficeFocusRefreshReason,
  recordOfficeFocusRefreshSkipped,
  recordOfficeFocusRefreshStart,
  recordOfficeLoadingShellEnter,
  recordOfficeLoadingShellSkippedOnFocusReturn,
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
  recordOfficeRouteOwnerIdentity,
  recordOfficeRouteOwnerBlur,
  recordOfficeRouteOwnerFocus,
  recordOfficeRouteOwnerMount,
  recordOfficeRouteOwnerUnmount,
  recordOfficeRouteReplaceReceived,
  recordWarehouseRouteOwnerBlur,
  recordWarehouseRouteOwnerFocus,
  recordWarehouseRouteOwnerIdentity,
  recordWarehouseRouteOwnerMount,
  recordWarehouseRouteOwnerUnmount,
  recordWarehouseReturnToOfficeDone,
  recordWarehouseReturnToOfficeStart,
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
            reason: "ttl_fresh",
            probe: "no_layout_callbacks",
          },
        },
      ]),
    ).toBe(
      "2026-04-09T10:00:00.000Z | office_native_layout_done | success | route=/office | owner=office_hub | focusCycle=3 | callback=section_layout:members | reason=ttl_fresh | probe=no_layout_callbacks",
    );
  });

  it("formats route-owner diagnostics with identity context", () => {
    expect(
      buildOfficeReentryBreadcrumbsText([
        {
          at: "2026-04-09T10:05:00.000Z",
          marker: "office_route_owner_identity",
          result: "success",
          extra: {
            route: "/office",
            owner: "office_index_route",
            identity: "office_index_route:abc123",
            pathname: "/office",
            segments: "(tabs)/office",
            routeWrapper: "office_owned_screen_entry",
          },
        },
      ]),
    ).toBe(
      "2026-04-09T10:05:00.000Z | office_route_owner_identity | success | route=/office | owner=office_index_route | identity=office_index_route:abc123 | pathname=/office | segments=(tabs)/office | routeWrapper=office_owned_screen_entry",
    );
  });

  it("formats warehouse route-owner diagnostics without cross-owner wrapped route", () => {
    expect(
      buildOfficeReentryBreadcrumbsText([
        {
          at: "2026-04-09T10:06:00.000Z",
          marker: "warehouse_route_owner_identity",
          result: "success",
          extra: {
            route: "/warehouse",
            owner: "warehouse_tab_route",
            identity: "warehouse_tab_route:def456",
            pathname: "/warehouse",
            segments: "(tabs)/warehouse",
            routeWrapper: "tab_owned_screen_entry",
          },
        },
      ]),
    ).toBe(
      "2026-04-09T10:06:00.000Z | warehouse_route_owner_identity | success | route=/warehouse | owner=warehouse_tab_route | identity=warehouse_tab_route:def456 | pathname=/warehouse | segments=(tabs)/warehouse | routeWrapper=tab_owned_screen_entry",
    );
  });

  it("records the expected warehouse route ownership sequence", () => {
    recordWarehouseRouteOwnerMount({
      owner: "warehouse_tab_route",
      route: "/warehouse",
      identity: "warehouse_tab_route:def456",
      pathname: "/warehouse",
      segments: "(tabs)/warehouse",
      routeWrapper: "tab_owned_screen_entry",
    });
    recordWarehouseRouteOwnerIdentity({
      owner: "warehouse_tab_route",
      route: "/warehouse",
      identity: "warehouse_tab_route:def456",
      pathname: "/warehouse",
      segments: "(tabs)/warehouse",
      routeWrapper: "tab_owned_screen_entry",
    });
    recordWarehouseRouteOwnerFocus({
      owner: "warehouse_tab_route",
      route: "/warehouse",
      identity: "warehouse_tab_route:def456",
      pathname: "/warehouse",
      segments: "(tabs)/warehouse",
      routeWrapper: "tab_owned_screen_entry",
    });
    recordWarehouseRouteOwnerBlur({
      owner: "warehouse_tab_route",
      route: "/warehouse",
      identity: "warehouse_tab_route:def456",
      pathname: "/warehouse",
      segments: "(tabs)/warehouse",
      routeWrapper: "tab_owned_screen_entry",
    });
    recordWarehouseRouteOwnerUnmount({
      owner: "warehouse_tab_route",
      route: "/warehouse",
      identity: "warehouse_tab_route:def456",
      pathname: "/warehouse",
      segments: "(tabs)/warehouse",
      routeWrapper: "tab_owned_screen_entry",
    });

    expect(getPlatformObservabilityEvents().map((event) => event.event)).toEqual([
      "warehouse_route_owner_mount",
      "warehouse_route_owner_identity",
      "warehouse_route_owner_focus",
      "warehouse_route_owner_blur",
      "warehouse_route_owner_unmount",
    ]);
  });

  it("records the expected office route ownership sequence", () => {
    recordWarehouseReturnToOfficeStart({
      owner: "office_stack_layout",
      route: "/office/warehouse",
      sourceRoute: "/office/warehouse",
      target: "/office",
      method: "replace",
    });
    recordWarehouseReturnToOfficeDone({
      owner: "office_stack_layout",
      route: "/office/warehouse",
      sourceRoute: "/office/warehouse",
      target: "/office",
      method: "replace",
    });
    recordOfficeRouteOwnerMount({
      owner: "office_index_route",
      route: "/office",
      identity: "office_index_route:abc123",
      pathname: "/office",
      segments: "(tabs)/office",
      routeWrapper: "office_owned_screen_entry",
    });
    recordOfficeRouteOwnerIdentity({
      owner: "office_index_route",
      route: "/office",
      identity: "office_index_route:abc123",
      pathname: "/office",
      segments: "(tabs)/office",
      routeWrapper: "office_owned_screen_entry",
    });
    recordOfficeRouteReplaceReceived({
      owner: "office_index_route",
      route: "/office",
      identity: "office_index_route:abc123",
      pathname: "/office",
      segments: "(tabs)/office",
      sourceRoute: "/office/warehouse",
      target: "/office",
      reason: "warehouse_explicit_office_return",
    });
    recordOfficeRouteOwnerFocus({
      owner: "office_index_route",
      route: "/office",
      identity: "office_index_route:abc123",
      pathname: "/office",
      segments: "(tabs)/office",
      routeWrapper: "office_owned_screen_entry",
    });
    recordOfficeRouteOwnerBlur({
      owner: "office_index_route",
      route: "/office",
      identity: "office_index_route:abc123",
      pathname: "/office",
      segments: "(tabs)/office",
      routeWrapper: "office_owned_screen_entry",
    });
    recordOfficeRouteOwnerUnmount({
      owner: "office_index_route",
      route: "/office",
      identity: "office_index_route:abc123",
      pathname: "/office",
      segments: "(tabs)/office",
      routeWrapper: "office_owned_screen_entry",
    });

    expect(getPlatformObservabilityEvents().map((event) => event.event)).toEqual([
      "warehouse_return_to_office_start",
      "warehouse_return_to_office_done",
      "office_route_owner_mount",
      "office_route_owner_identity",
      "office_route_replace_received",
      "office_route_owner_focus",
      "office_route_owner_blur",
      "office_route_owner_unmount",
    ]);
  });

  it("records the expected office reentry marker sequence", () => {
    recordOfficeReentryStart({ owner: "office_index_route" });
    recordOfficeReentryComponentMount({ owner: "office_hub" });
    recordOfficeBootstrapInitialStart({
      owner: "office_hub",
      mode: "initial",
      reason: "mount_bootstrap",
    });
    recordOfficeReentryEffectStart({ owner: "office_hub", mode: "initial" });
    recordOfficeLoadingShellEnter({
      owner: "office_hub",
      mode: "initial",
      reason: "mount_bootstrap",
    });
    recordOfficeReentryEffectDone({ owner: "office_hub", mode: "initial" });
    recordOfficeBootstrapInitialDone({
      owner: "office_hub",
      mode: "initial",
      reason: "mount_bootstrap",
    });
    recordOfficeReentryRenderSuccess({ owner: "office_hub" });
    recordOfficePostReturnFocus({ owner: "office_hub", focusCycle: 2 });
    recordOfficeFocusRefreshReason({
      owner: "office_hub",
      focusCycle: 2,
      reason: "ttl_fresh",
    });
    recordOfficeLoadingShellSkippedOnFocusReturn({
      owner: "office_hub",
      focusCycle: 2,
      reason: "ttl_fresh",
    });
    recordOfficeFocusRefreshSkipped({
      owner: "office_hub",
      focusCycle: 2,
      reason: "ttl_fresh",
    });
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
    recordOfficeFocusRefreshReason({
      owner: "office_hub",
      focusCycle: 3,
      mode: "focus_refresh",
      reason: "stale_ttl",
    });
    recordOfficeLoadingShellSkippedOnFocusReturn({
      owner: "office_hub",
      focusCycle: 3,
      mode: "focus_refresh",
      reason: "stale_ttl",
    });
    recordOfficeFocusRefreshStart({
      owner: "office_hub",
      focusCycle: 3,
      mode: "focus_refresh",
      reason: "stale_ttl",
    });
    recordOfficeFocusRefreshDone({
      owner: "office_hub",
      focusCycle: 3,
      mode: "focus_refresh",
      reason: "stale_ttl",
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
      "office_bootstrap_initial_start",
      "office_reentry_effect_start",
      "office_loading_shell_enter",
      "office_reentry_effect_done",
      "office_bootstrap_initial_done",
      "office_reentry_render_success",
      "office_post_return_focus",
      "office_focus_refresh_reason",
      "office_loading_shell_skipped_on_focus_return",
      "office_focus_refresh_skipped",
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
      "office_focus_refresh_reason",
      "office_loading_shell_skipped_on_focus_return",
      "office_focus_refresh_start",
      "office_focus_refresh_done",
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
