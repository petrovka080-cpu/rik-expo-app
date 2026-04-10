import {
  buildOfficeReentryBreadcrumbsText,
  recordOfficeBackPathFailure,
  recordOfficeBootstrapInitialDone,
  recordOfficeBootstrapInitialStart,
  recordOfficeChildBeforeRemove,
  recordOfficeChildEntryFocus,
  recordOfficeChildEntryMount,
  recordOfficeChildUnmount,
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
  recordOfficeIndexAfterReturnFocus,
  recordOfficeIndexAfterReturnMount,
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
  recordOfficeRouteScopeActive,
  recordOfficeRouteScopeInactive,
  recordOfficeRouteScopeSkipReason,
  recordOfficeLayoutBeforeRemove,
  recordOfficeTabOwnerBlur,
  recordOfficeTabOwnerFocus,
  recordOfficeTabOwnerUnmount,
  recordOfficeWarehouseBeforeRemove,
  recordOfficeWarehouseEntryFailure,
  recordOfficeWarehouseEntryFocusDone,
  recordOfficeWarehouseEntryFocusStart,
  recordOfficeWarehouseEntryMountDone,
  recordOfficeWarehouseEntryMountStart,
  recordOfficeWarehouseRuntimeStateWriteSkipped,
  recordOfficeWarehouseUnmount,
  recordTabWarehouseEntryMountDone,
  recordTabWarehouseEntryMountStart,
  recordWarehouseRouteOwnerBlur,
  recordWarehouseRouteOwnerFocus,
  recordWarehouseRouteOwnerIdentity,
  recordWarehouseRouteOwnerMount,
  recordWarehouseRouteOwnerUnmount,
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

  it("formats office route scope diagnostics on inactive paths", () => {
    expect(
      buildOfficeReentryBreadcrumbsText([
        {
          at: "2026-04-09T10:07:00.000Z",
          marker: "office_route_scope_inactive",
          result: "skipped",
          extra: {
            route: "/office",
            owner: "office_index_route",
            pathname: "/office/warehouse",
            segments: "(tabs)/office/warehouse",
            reason: "non_exact_path:/office/warehouse",
            routeWrapper: "office_owned_screen_entry",
          },
        },
      ]),
    ).toBe(
      "2026-04-09T10:07:00.000Z | office_route_scope_inactive | skipped | route=/office | owner=office_index_route | pathname=/office/warehouse | segments=(tabs)/office/warehouse | routeWrapper=office_owned_screen_entry | reason=non_exact_path:/office/warehouse",
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

  it("formats office warehouse runtime write suppression diagnostics", () => {
    expect(
      buildOfficeReentryBreadcrumbsText([
        {
          at: "2026-04-09T10:08:00.000Z",
          marker: "office_warehouse_runtime_state_write_skipped",
          result: "skipped",
          extra: {
            route: "/office/warehouse",
            owner: "warehouseman_fio",
            source: "mount_bootstrap",
            writeTarget: "bootstrap_state",
            visibleScope: "local_state",
            skippedScope: "shared_store",
            reason: "mount_bootstrap_local_only",
          },
        },
      ]),
    ).toBe(
      "2026-04-09T10:08:00.000Z | office_warehouse_runtime_state_write_skipped | skipped | route=/office/warehouse | owner=warehouseman_fio | source=mount_bootstrap | writeTarget=bootstrap_state | visibleScope=local_state | skippedScope=shared_store | reason=mount_bootstrap_local_only",
    );
  });

  it("formats office child and tab-owner diagnostics", () => {
    expect(
      buildOfficeReentryBreadcrumbsText([
        {
          at: "2026-04-10T09:00:00.000Z",
          marker: "office_child_entry_mount",
          result: "success",
          extra: {
            route: "/office/foreman",
            owner: "office_foreman_route",
            identity: "office_foreman_route:abc123",
            pathname: "/office/foreman",
            segments: "(tabs)/office/foreman",
            routeWrapper: "office_child_screen_entry",
            wrappedRoute: "/foreman",
          },
        },
        {
          at: "2026-04-10T09:01:00.000Z",
          marker: "office_tab_owner_blur",
          result: "success",
          extra: {
            route: "/(tabs)",
            owner: "office_tab_owner",
            pathname: "/profile",
            segments: "(tabs)/profile",
            routeWrapper: "tabs_root_entry",
            reason: "left_office_subtree:/profile",
            target: "/office",
          },
        },
      ]),
    ).toBe(
      "2026-04-10T09:00:00.000Z | office_child_entry_mount | success | route=/office/foreman | owner=office_foreman_route | identity=office_foreman_route:abc123 | pathname=/office/foreman | segments=(tabs)/office/foreman | wrappedRoute=/foreman | routeWrapper=office_child_screen_entry\n2026-04-10T09:01:00.000Z | office_tab_owner_blur | success | route=/(tabs) | owner=office_tab_owner | pathname=/profile | segments=(tabs)/profile | routeWrapper=tabs_root_entry | target=/office | reason=left_office_subtree:/profile",
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

  it("records the expected office warehouse child-entry overlay sequence", () => {
    recordOfficeWarehouseEntryMountStart({
      owner: "office_warehouse_route",
      route: "/office/warehouse",
      identity: "office_warehouse_route:ghi789",
      pathname: "/office/warehouse",
      segments: "(tabs)/office/warehouse",
      routeWrapper: "office_child_screen_entry",
      wrappedRoute: "/warehouse",
    });
    recordOfficeChildEntryMount({
      owner: "office_warehouse_route",
      route: "/office/warehouse",
      identity: "office_warehouse_route:ghi789",
      pathname: "/office/warehouse",
      segments: "(tabs)/office/warehouse",
      routeWrapper: "office_child_screen_entry",
      wrappedRoute: "/warehouse",
    });
    recordOfficeWarehouseEntryMountDone({
      owner: "office_warehouse_route",
      route: "/office/warehouse",
      identity: "office_warehouse_route:ghi789",
      pathname: "/office/warehouse",
      segments: "(tabs)/office/warehouse",
      routeWrapper: "office_child_screen_entry",
      wrappedRoute: "/warehouse",
    });
    recordOfficeWarehouseEntryFocusStart({
      owner: "office_warehouse_route",
      route: "/office/warehouse",
      identity: "office_warehouse_route:ghi789",
      pathname: "/office/warehouse",
      segments: "(tabs)/office/warehouse",
      routeWrapper: "office_child_screen_entry",
      wrappedRoute: "/warehouse",
    });
    recordOfficeChildEntryFocus({
      owner: "office_warehouse_route",
      route: "/office/warehouse",
      identity: "office_warehouse_route:ghi789",
      pathname: "/office/warehouse",
      segments: "(tabs)/office/warehouse",
      routeWrapper: "office_child_screen_entry",
      wrappedRoute: "/warehouse",
    });
    recordOfficeWarehouseEntryFocusDone({
      owner: "office_warehouse_route",
      route: "/office/warehouse",
      identity: "office_warehouse_route:ghi789",
      pathname: "/office/warehouse",
      segments: "(tabs)/office/warehouse",
      routeWrapper: "office_child_screen_entry",
      wrappedRoute: "/warehouse",
    });
    recordOfficeWarehouseEntryFailure({
      error: new Error("office warehouse failed"),
      errorStage: "entry_boundary",
      extra: {
        owner: "office_warehouse_route",
        route: "/office/warehouse",
      },
    });

    expect(getPlatformObservabilityEvents().map((event) => event.event)).toEqual([
      "office_warehouse_entry_mount_start",
      "office_child_entry_mount",
      "office_warehouse_entry_mount_done",
      "office_warehouse_entry_focus_start",
      "office_child_entry_focus",
      "office_warehouse_entry_focus_done",
      "office_warehouse_entry_failed",
    ]);
  });

  it("records the expected top-level warehouse parity mount sequence", () => {
    recordTabWarehouseEntryMountStart({
      owner: "warehouse_tab_route",
      route: "/warehouse",
      identity: "warehouse_tab_route:def456",
      pathname: "/warehouse",
      segments: "(tabs)/warehouse",
      routeWrapper: "tab_owned_screen_entry",
    });
    recordWarehouseRouteOwnerMount({
      owner: "warehouse_tab_route",
      route: "/warehouse",
      identity: "warehouse_tab_route:def456",
      pathname: "/warehouse",
      segments: "(tabs)/warehouse",
      routeWrapper: "tab_owned_screen_entry",
    });
    recordTabWarehouseEntryMountDone({
      owner: "warehouse_tab_route",
      route: "/warehouse",
      identity: "warehouse_tab_route:def456",
      pathname: "/warehouse",
      segments: "(tabs)/warehouse",
      routeWrapper: "tab_owned_screen_entry",
    });

    expect(getPlatformObservabilityEvents().map((event) => event.event)).toEqual([
      "tab_warehouse_entry_mount_start",
      "warehouse_route_owner_mount",
      "tab_warehouse_entry_mount_done",
    ]);
  });

  it("records the expected office route ownership sequence", () => {
    recordOfficeRouteOwnerMount({
      owner: "office_index_route",
      route: "/office",
      identity: "office_index_route:abc123",
      pathname: "/office",
      segments: "(tabs)/office",
      routeWrapper: "office_owned_screen_entry",
    });
    recordOfficeRouteScopeActive({
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
      "office_route_owner_mount",
      "office_route_scope_active",
      "office_route_owner_identity",
      "office_route_replace_received",
      "office_route_owner_focus",
      "office_route_owner_blur",
      "office_route_owner_unmount",
    ]);
  });

  it("records the expected office warehouse return capture sequence", () => {
    recordOfficeWarehouseBeforeRemove({
      owner: "office_warehouse_route",
      route: "/office/warehouse",
      identity: "office_warehouse_route:ghi789",
      action: "GO_BACK",
      pathname: "/office/warehouse",
      segments: "(tabs)/office/warehouse",
      wrappedRoute: "/warehouse",
      routeWrapper: "office_child_screen_entry",
    });
    recordOfficeChildBeforeRemove({
      owner: "office_warehouse_route",
      route: "/office/warehouse",
      identity: "office_warehouse_route:ghi789",
      action: "GO_BACK",
      pathname: "/office/warehouse",
      segments: "(tabs)/office/warehouse",
      wrappedRoute: "/warehouse",
      routeWrapper: "office_child_screen_entry",
    });
    recordOfficeWarehouseUnmount({
      owner: "office_warehouse_route",
      route: "/office/warehouse",
      pathname: "/office",
      segments: "(tabs)/office",
      identity: "office_warehouse_route:ghi789",
      wrappedRoute: "/warehouse",
      routeWrapper: "office_child_screen_entry",
    });
    recordOfficeChildUnmount({
      owner: "office_warehouse_route",
      route: "/office/warehouse",
      pathname: "/office",
      segments: "(tabs)/office",
      identity: "office_warehouse_route:ghi789",
      wrappedRoute: "/warehouse",
      routeWrapper: "office_child_screen_entry",
    });
    recordOfficeIndexAfterReturnMount({
      owner: "office_index_route",
      route: "/office",
      pathname: "/office",
      segments: "(tabs)/office",
      sourceRoute: "/office/warehouse",
      target: "/office",
      method: "back",
      selectedMethod: "back",
    });
    recordOfficeIndexAfterReturnFocus({
      owner: "office_index_route",
      route: "/office",
      pathname: "/office",
      segments: "(tabs)/office",
      sourceRoute: "/office/warehouse",
      target: "/office",
      method: "back",
      selectedMethod: "back",
    });
    recordOfficeBackPathFailure({
      error: new Error("router back failed"),
      errorStage: "router_back_call",
      extra: {
        owner: "office_stack_layout",
        route: "/office/warehouse",
        method: "back",
        selectedMethod: "back",
        target: "/office",
      },
    });

    expect(getPlatformObservabilityEvents().map((event) => event.event)).toEqual([
      "office_warehouse_before_remove",
      "office_child_before_remove",
      "office_warehouse_unmount",
      "office_child_unmount",
      "office_index_after_return_mount",
      "office_index_after_return_focus",
      "office_back_path_failed",
    ]);
  });

  it("records comparative office child and owner teardown markers", () => {
    recordOfficeChildEntryMount({
      owner: "office_foreman_route",
      route: "/office/foreman",
      identity: "office_foreman_route:abc123",
      pathname: "/office/foreman",
      segments: "(tabs)/office/foreman",
      routeWrapper: "office_child_screen_entry",
      wrappedRoute: "/foreman",
    });
    recordOfficeChildEntryFocus({
      owner: "office_foreman_route",
      route: "/office/foreman",
      identity: "office_foreman_route:abc123",
      pathname: "/office/foreman",
      segments: "(tabs)/office/foreman",
      routeWrapper: "office_child_screen_entry",
      wrappedRoute: "/foreman",
    });
    recordOfficeChildBeforeRemove({
      owner: "office_foreman_route",
      route: "/office/foreman",
      identity: "office_foreman_route:abc123",
      pathname: "/office/foreman",
      segments: "(tabs)/office/foreman",
      routeWrapper: "office_child_screen_entry",
      wrappedRoute: "/foreman",
      action: "GO_BACK",
    });
    recordOfficeChildUnmount({
      owner: "office_foreman_route",
      route: "/office/foreman",
      identity: "office_foreman_route:abc123",
      pathname: "/office",
      segments: "(tabs)/office",
      routeWrapper: "office_child_screen_entry",
      wrappedRoute: "/foreman",
    });
    recordOfficeLayoutBeforeRemove({
      owner: "office_stack_layout",
      route: "/office/_layout",
      identity: "office_stack_layout:def456",
      pathname: "/office/foreman",
      segments: "(tabs)/office/foreman",
      routeWrapper: "office_stack_layout_entry",
      action: "GO_BACK",
    });
    recordOfficeTabOwnerFocus({
      owner: "office_tab_owner",
      route: "/(tabs)",
      identity: "office_tab_owner:ghi789",
      pathname: "/office",
      segments: "(tabs)/office",
      routeWrapper: "tabs_root_entry",
      target: "/office",
    });
    recordOfficeTabOwnerBlur({
      owner: "office_tab_owner",
      route: "/(tabs)",
      identity: "office_tab_owner:ghi789",
      pathname: "/profile",
      segments: "(tabs)/profile",
      routeWrapper: "tabs_root_entry",
      target: "/office",
      reason: "left_office_subtree:/profile",
    });
    recordOfficeTabOwnerUnmount({
      owner: "office_tab_owner",
      route: "/(tabs)",
      identity: "office_tab_owner:ghi789",
      pathname: "/profile",
      segments: "(tabs)/profile",
      routeWrapper: "tabs_root_entry",
      target: "/office",
    });

    expect(getPlatformObservabilityEvents().map((event) => event.event)).toEqual([
      "office_child_entry_mount",
      "office_child_entry_focus",
      "office_child_before_remove",
      "office_child_unmount",
      "office_layout_before_remove",
      "office_tab_owner_focus",
      "office_tab_owner_blur",
      "office_tab_owner_unmount",
    ]);
  });

  it("records office route scope passive sequence on non-office paths", () => {
    recordOfficeRouteScopeSkipReason({
      owner: "office_index_route",
      route: "/office",
      pathname: "/profile",
      segments: "(tabs)/profile",
      reason: "non_exact_path:/profile",
      routeWrapper: "office_owned_screen_entry",
    });
    recordOfficeRouteScopeInactive({
      owner: "office_index_route",
      route: "/office",
      pathname: "/profile",
      segments: "(tabs)/profile",
      reason: "non_exact_path:/profile",
      routeWrapper: "office_owned_screen_entry",
    });

    expect(getPlatformObservabilityEvents().map((event) => event.event)).toEqual([
      "office_route_scope_skip_reason",
      "office_route_scope_inactive",
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
