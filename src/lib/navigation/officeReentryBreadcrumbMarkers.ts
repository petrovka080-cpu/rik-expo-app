import { recordPlatformObservability } from "../observability/platformObservability";
import {
  buildOfficeReentryErrorDescriptor,
  OFFICE_ROUTE,
  type OfficeReentryBreadcrumbInput,
  type OfficeReentryMarker,
  normalizeOfficeReentryObservabilityResult,
  trimOfficeReentryText,
} from "./officeReentryBreadcrumbs.contract";
import { recordOfficeReentryBreadcrumbs } from "./officeReentryBreadcrumbs.persistence";

function recordOfficeReentryMarker(input: OfficeReentryBreadcrumbInput) {
  const extra = {
    route: OFFICE_ROUTE,
    ...(input.extra ?? {}),
  };

  recordPlatformObservability({
    screen: "office",
    surface: "office_reentry",
    category: "ui",
    event: input.marker,
    result: normalizeOfficeReentryObservabilityResult(input.result),
    errorStage: trimOfficeReentryText(input.errorStage) ?? undefined,
    errorClass: trimOfficeReentryText(input.errorClass) ?? undefined,
    errorMessage: trimOfficeReentryText(input.errorMessage) ?? undefined,
    extra,
  });
  recordOfficeReentryBreadcrumbs([{ ...input, extra }]);
}

function recordOfficeLifecycleMarker(params: {
  marker: Extract<
    OfficeReentryMarker,
    | "office_route_owner_mount"
    | "office_route_owner_unmount"
    | "office_route_owner_focus"
    | "office_route_owner_blur"
    | "office_route_scope_active"
    | "office_route_scope_inactive"
    | "office_route_scope_skip_reason"
    | "office_route_owner_identity"
    | "office_route_identity"
    | "office_child_entry_mount"
    | "office_child_entry_focus"
    | "office_child_before_remove"
    | "office_child_unmount"
    | "office_layout_before_remove"
    | "office_tab_owner_focus"
    | "office_tab_owner_blur"
    | "office_tab_owner_unmount"
    | "warehouse_route_owner_mount"
    | "warehouse_route_owner_unmount"
    | "warehouse_route_owner_focus"
    | "warehouse_route_owner_blur"
    | "warehouse_route_owner_identity"
    | "office_warehouse_entry_mount_start"
    | "office_warehouse_entry_mount_done"
    | "office_warehouse_entry_focus_start"
    | "office_warehouse_entry_focus_done"
    | "office_warehouse_scope_active"
    | "office_warehouse_scope_inactive"
    | "office_warehouse_scope_skip_reason"
    | "office_warehouse_before_remove"
    | "office_warehouse_unmount"
    | "office_warehouse_back_press_start"
    | "office_warehouse_back_press_done"
    | "office_warehouse_cleanup_start"
    | "office_warehouse_cleanup_done"
    | "office_warehouse_runtime_bootstrap_start"
    | "office_warehouse_runtime_bootstrap_done"
    | "office_warehouse_runtime_bootstrap_skipped"
    | "office_warehouse_runtime_commit_skipped"
    | "office_warehouse_runtime_state_write_accepted"
    | "office_warehouse_runtime_state_write_skipped"
    | "office_index_after_return_focus"
    | "office_index_after_return_mount"
    | "tab_warehouse_entry_mount_start"
    | "tab_warehouse_entry_mount_done"
    | "office_bootstrap_initial_start"
    | "office_bootstrap_initial_done"
    | "office_focus_refresh_skipped"
    | "office_focus_refresh_start"
    | "office_focus_refresh_done"
    | "office_focus_refresh_reason"
    | "office_loading_shell_enter"
    | "office_loading_shell_skipped_on_focus_return"
  >;
  extra?: Record<string, unknown>;
  result?: "success" | "skipped";
}) {
  recordOfficeReentryMarker({
    marker: params.marker,
    result: params.result ?? "success",
    extra: params.extra,
  });
}

function recordOfficePostReturnMarker(
  marker: Extract<
    OfficeReentryMarker,
    | "office_post_return_idle_start"
    | "office_post_return_idle_done"
    | "office_post_return_layout_commit"
    | "office_post_return_focus"
    | "office_post_return_child_mount_start"
    | "office_post_return_child_mount_done"
    | "office_post_return_section_render_start"
    | "office_post_return_section_render_done"
    | "office_post_return_subtree_start"
    | "office_post_return_subtree_done"
  >,
  extra?: Record<string, unknown>,
) {
  recordOfficeReentryMarker({
    marker,
    result: "success",
    extra,
  });
}

function recordOfficeNativeMarker(
  marker: Extract<
    OfficeReentryMarker,
    | "office_native_focus_callback_start"
    | "office_native_focus_callback_done"
    | "office_native_layout_start"
    | "office_native_layout_done"
    | "office_native_content_size_start"
    | "office_native_content_size_done"
    | "office_native_keyboard_event"
    | "office_native_interaction_start"
    | "office_native_interaction_done"
    | "office_native_animation_frame_start"
    | "office_native_animation_frame_done"
  >,
  extra?: Record<string, unknown>,
) {
  recordOfficeReentryMarker({
    marker,
    result: "success",
    extra,
  });
}

function buildOfficeErrorMarkerInput(params: {
  marker: Extract<
    OfficeReentryMarker,
    | "office_warehouse_entry_failed"
    | "office_back_path_failed"
    | "office_reentry_failed"
    | "office_post_return_subtree_failed"
    | "office_native_callback_failed"
    | "office_post_return_failed"
  >;
  error: unknown;
  errorStage: string;
  extra?: Record<string, unknown>;
  fallbackMessage: string;
}) {
  const { errorClass, errorMessage } = buildOfficeReentryErrorDescriptor(
    params.error,
    params.fallbackMessage,
  );
  return {
    marker: params.marker,
    result: "error" as const,
    errorStage: params.errorStage,
    errorClass,
    errorMessage,
    extra: params.extra,
  };
}

export function recordOfficeReentryStart(extra?: Record<string, unknown>) {
  recordOfficeReentryMarker({
    marker: "office_reentry_start",
    result: "success",
    extra,
  });
  recordOfficeReentryMarker({
    marker: "office_reentry_route_match",
    result: "success",
    extra,
  });
}

export function recordOfficeReentryComponentMount(
  extra?: Record<string, unknown>,
) {
  recordOfficeReentryMarker({
    marker: "office_reentry_component_enter",
    result: "success",
    extra,
  });
  recordOfficeReentryMarker({
    marker: "office_reentry_mount",
    result: "success",
    extra,
  });
}

export function recordOfficeReentryRenderSuccess(
  extra?: Record<string, unknown>,
) {
  recordOfficeReentryMarker({
    marker: "office_reentry_render_success",
    result: "success",
    extra,
  });
}

export function recordOfficeReentryEffectStart(
  extra?: Record<string, unknown>,
) {
  recordOfficeReentryMarker({
    marker: "office_reentry_effect_start",
    result: "success",
    extra,
  });
}

export function recordOfficeReentryEffectDone(extra?: Record<string, unknown>) {
  recordOfficeReentryMarker({
    marker: "office_reentry_effect_done",
    result: "success",
    extra,
  });
}

export function recordOfficeRouteOwnerMount(extra?: Record<string, unknown>) {
  recordOfficeLifecycleMarker({
    marker: "office_route_owner_mount",
    extra,
  });
}

export function recordOfficeRouteOwnerUnmount(extra?: Record<string, unknown>) {
  recordOfficeLifecycleMarker({
    marker: "office_route_owner_unmount",
    extra,
  });
}

export function recordOfficeRouteOwnerFocus(extra?: Record<string, unknown>) {
  recordOfficeLifecycleMarker({
    marker: "office_route_owner_focus",
    extra,
  });
}

export function recordOfficeRouteOwnerBlur(extra?: Record<string, unknown>) {
  recordOfficeLifecycleMarker({
    marker: "office_route_owner_blur",
    extra,
  });
}

export function recordOfficeRouteScopeActive(extra?: Record<string, unknown>) {
  recordOfficeLifecycleMarker({
    marker: "office_route_scope_active",
    extra,
  });
}

export function recordOfficeRouteScopeInactive(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_route_scope_inactive",
    extra,
    result: "skipped",
  });
}

export function recordOfficeRouteScopeSkipReason(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_route_scope_skip_reason",
    extra,
    result: "skipped",
  });
}

export function recordOfficeRouteOwnerIdentity(extra?: Record<string, unknown>) {
  recordOfficeLifecycleMarker({
    marker: "office_route_owner_identity",
    extra,
  });
}

export function recordOfficeRouteIdentity(extra?: Record<string, unknown>) {
  recordOfficeRouteOwnerIdentity(extra);
}

export function recordOfficeChildEntryMount(extra?: Record<string, unknown>) {
  recordOfficeLifecycleMarker({
    marker: "office_child_entry_mount",
    extra,
  });
}

export function recordOfficeChildEntryFocus(extra?: Record<string, unknown>) {
  recordOfficeLifecycleMarker({
    marker: "office_child_entry_focus",
    extra,
  });
}

export function recordOfficeChildBeforeRemove(extra?: Record<string, unknown>) {
  recordOfficeLifecycleMarker({
    marker: "office_child_before_remove",
    extra,
  });
}

export function recordOfficeChildUnmount(extra?: Record<string, unknown>) {
  recordOfficeLifecycleMarker({
    marker: "office_child_unmount",
    extra,
  });
}

export function recordOfficeLayoutBeforeRemove(extra?: Record<string, unknown>) {
  recordOfficeLifecycleMarker({
    marker: "office_layout_before_remove",
    extra,
  });
}

export function recordOfficeTabOwnerFocus(extra?: Record<string, unknown>) {
  recordOfficeLifecycleMarker({
    marker: "office_tab_owner_focus",
    extra,
  });
}

export function recordOfficeTabOwnerBlur(extra?: Record<string, unknown>) {
  recordOfficeLifecycleMarker({
    marker: "office_tab_owner_blur",
    extra,
  });
}

export function recordOfficeTabOwnerUnmount(extra?: Record<string, unknown>) {
  recordOfficeLifecycleMarker({
    marker: "office_tab_owner_unmount",
    extra,
  });
}

export function recordWarehouseRouteOwnerMount(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "warehouse_route_owner_mount",
    extra,
  });
}

export function recordWarehouseRouteOwnerUnmount(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "warehouse_route_owner_unmount",
    extra,
  });
}

export function recordWarehouseRouteOwnerFocus(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "warehouse_route_owner_focus",
    extra,
  });
}

export function recordWarehouseRouteOwnerBlur(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "warehouse_route_owner_blur",
    extra,
  });
}

export function recordWarehouseRouteOwnerIdentity(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "warehouse_route_owner_identity",
    extra,
  });
}

export function recordOfficeWarehouseEntryMountStart(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_warehouse_entry_mount_start",
    extra,
  });
}

export function recordOfficeWarehouseEntryMountDone(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_warehouse_entry_mount_done",
    extra,
  });
}

export function recordOfficeWarehouseEntryFocusStart(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_warehouse_entry_focus_start",
    extra,
  });
}

export function recordOfficeWarehouseEntryFocusDone(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_warehouse_entry_focus_done",
    extra,
  });
}

export function recordOfficeWarehouseScopeActive(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_warehouse_scope_active",
    extra,
  });
}

export function recordOfficeWarehouseScopeInactive(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_warehouse_scope_inactive",
    extra,
    result: "skipped",
  });
}

export function recordOfficeWarehouseScopeSkipReason(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_warehouse_scope_skip_reason",
    extra,
    result: "skipped",
  });
}

export function recordOfficeWarehouseEntryFailure(params: {
  error: unknown;
  errorStage: string;
  extra?: Record<string, unknown>;
}) {
  recordOfficeReentryMarker(
    buildOfficeErrorMarkerInput({
      marker: "office_warehouse_entry_failed",
      error: params.error,
      errorStage: params.errorStage,
      extra: params.extra,
      fallbackMessage: "office_warehouse_entry_failed",
    }),
  );
}

export function recordOfficeWarehouseBeforeRemove(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_warehouse_before_remove",
    extra,
  });
}

export function recordOfficeWarehouseUnmount(extra?: Record<string, unknown>) {
  recordOfficeLifecycleMarker({
    marker: "office_warehouse_unmount",
    extra,
  });
}

export function recordOfficeWarehouseBackPressStart(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_warehouse_back_press_start",
    extra,
  });
}

export function recordOfficeWarehouseBackPressDone(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_warehouse_back_press_done",
    extra,
  });
}

export function recordOfficeWarehouseCleanupStart(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_warehouse_cleanup_start",
    extra,
  });
}

export function recordOfficeWarehouseCleanupDone(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_warehouse_cleanup_done",
    extra,
  });
}

export function recordOfficeWarehouseRuntimeBootstrapStart(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_warehouse_runtime_bootstrap_start",
    extra,
  });
}

export function recordOfficeWarehouseRuntimeBootstrapDone(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_warehouse_runtime_bootstrap_done",
    extra,
  });
}

export function recordOfficeWarehouseRuntimeBootstrapSkipped(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_warehouse_runtime_bootstrap_skipped",
    extra,
    result: "skipped",
  });
}

export function recordOfficeWarehouseRuntimeCommitSkipped(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_warehouse_runtime_commit_skipped",
    extra,
    result: "skipped",
  });
}

export function recordOfficeWarehouseRuntimeStateWriteAccepted(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_warehouse_runtime_state_write_accepted",
    extra,
  });
}

export function recordOfficeWarehouseRuntimeStateWriteSkipped(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_warehouse_runtime_state_write_skipped",
    extra,
    result: "skipped",
  });
}

export function recordOfficeIndexAfterReturnFocus(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_index_after_return_focus",
    extra,
  });
}

export function recordOfficeIndexAfterReturnMount(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_index_after_return_mount",
    extra,
  });
}

export function recordOfficeBackPathFailure(params: {
  error: unknown;
  errorStage: string;
  extra?: Record<string, unknown>;
}) {
  recordOfficeReentryMarker(
    buildOfficeErrorMarkerInput({
      marker: "office_back_path_failed",
      error: params.error,
      errorStage: params.errorStage,
      extra: params.extra,
      fallbackMessage: "office_back_path_failed",
    }),
  );
}

export function recordTabWarehouseEntryMountStart(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "tab_warehouse_entry_mount_start",
    extra,
  });
}

export function recordTabWarehouseEntryMountDone(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "tab_warehouse_entry_mount_done",
    extra,
  });
}

export function recordOfficeBootstrapInitialStart(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_bootstrap_initial_start",
    extra,
  });
}

export function recordOfficeBootstrapInitialDone(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_bootstrap_initial_done",
    extra,
  });
}

export function recordOfficeFocusRefreshSkipped(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_focus_refresh_skipped",
    extra,
    result: "skipped",
  });
}

export function recordOfficeFocusRefreshStart(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_focus_refresh_start",
    extra,
  });
}

export function recordOfficeFocusRefreshDone(extra?: Record<string, unknown>) {
  recordOfficeLifecycleMarker({
    marker: "office_focus_refresh_done",
    extra,
  });
}

export function recordOfficeFocusRefreshReason(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_focus_refresh_reason",
    extra,
  });
}

export function recordOfficeLoadingShellEnter(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_loading_shell_enter",
    extra,
  });
}

export function recordOfficeLoadingShellSkippedOnFocusReturn(
  extra?: Record<string, unknown>,
) {
  recordOfficeLifecycleMarker({
    marker: "office_loading_shell_skipped_on_focus_return",
    extra,
    result: "skipped",
  });
}

export function recordOfficeReentryFailure(params: {
  error: unknown;
  errorStage: string;
  extra?: Record<string, unknown>;
}) {
  recordOfficeReentryMarker(
    buildOfficeErrorMarkerInput({
      marker: "office_reentry_failed",
      error: params.error,
      errorStage: params.errorStage,
      extra: params.extra,
      fallbackMessage: "office_reentry_failed",
    }),
  );
}

export function recordOfficePostReturnFocus(extra?: Record<string, unknown>) {
  recordOfficePostReturnMarker("office_post_return_focus", extra);
}

export function recordOfficePostReturnIdleStart(
  extra?: Record<string, unknown>,
) {
  recordOfficePostReturnMarker("office_post_return_idle_start", extra);
}

export function recordOfficePostReturnIdleDone(
  extra?: Record<string, unknown>,
) {
  recordOfficePostReturnMarker("office_post_return_idle_done", extra);
}

export function recordOfficePostReturnLayoutCommit(
  extra?: Record<string, unknown>,
) {
  recordOfficePostReturnMarker("office_post_return_layout_commit", extra);
}

export function recordOfficePostReturnChildMountStart(
  extra?: Record<string, unknown>,
) {
  recordOfficePostReturnMarker("office_post_return_child_mount_start", extra);
}

export function recordOfficePostReturnChildMountDone(
  extra?: Record<string, unknown>,
) {
  recordOfficePostReturnMarker("office_post_return_child_mount_done", extra);
}

export function recordOfficePostReturnSectionRenderStart(
  extra?: Record<string, unknown>,
) {
  recordOfficePostReturnMarker(
    "office_post_return_section_render_start",
    extra,
  );
}

export function recordOfficePostReturnSectionRenderDone(
  extra?: Record<string, unknown>,
) {
  recordOfficePostReturnMarker("office_post_return_section_render_done", extra);
}

export function recordOfficePostReturnSubtreeStart(
  extra?: Record<string, unknown>,
) {
  recordOfficePostReturnMarker("office_post_return_subtree_start", extra);
}

export function recordOfficePostReturnSubtreeDone(
  extra?: Record<string, unknown>,
) {
  recordOfficePostReturnMarker("office_post_return_subtree_done", extra);
}

export function recordOfficePostReturnSubtreeFailure(params: {
  error: unknown;
  errorStage: string;
  extra?: Record<string, unknown>;
}) {
  recordOfficeReentryMarker(
    buildOfficeErrorMarkerInput({
      marker: "office_post_return_subtree_failed",
      error: params.error,
      errorStage: params.errorStage,
      extra: params.extra,
      fallbackMessage: "office_post_return_subtree_failed",
    }),
  );
}

export function recordOfficeNativeFocusCallbackStart(
  extra?: Record<string, unknown>,
) {
  recordOfficeNativeMarker("office_native_focus_callback_start", extra);
}

export function recordOfficeNativeFocusCallbackDone(
  extra?: Record<string, unknown>,
) {
  recordOfficeNativeMarker("office_native_focus_callback_done", extra);
}

export function recordOfficeNativeLayoutStart(extra?: Record<string, unknown>) {
  recordOfficeNativeMarker("office_native_layout_start", extra);
}

export function recordOfficeNativeLayoutDone(extra?: Record<string, unknown>) {
  recordOfficeNativeMarker("office_native_layout_done", extra);
}

export function recordOfficeNativeContentSizeStart(
  extra?: Record<string, unknown>,
) {
  recordOfficeNativeMarker("office_native_content_size_start", extra);
}

export function recordOfficeNativeContentSizeDone(
  extra?: Record<string, unknown>,
) {
  recordOfficeNativeMarker("office_native_content_size_done", extra);
}

export function recordOfficeNativeKeyboardEvent(
  extra?: Record<string, unknown>,
) {
  recordOfficeNativeMarker("office_native_keyboard_event", extra);
}

export function recordOfficeNativeInteractionStart(
  extra?: Record<string, unknown>,
) {
  recordOfficeNativeMarker("office_native_interaction_start", extra);
}

export function recordOfficeNativeInteractionDone(
  extra?: Record<string, unknown>,
) {
  recordOfficeNativeMarker("office_native_interaction_done", extra);
}

export function recordOfficeNativeAnimationFrameStart(
  extra?: Record<string, unknown>,
) {
  recordOfficeNativeMarker("office_native_animation_frame_start", extra);
}

export function recordOfficeNativeAnimationFrameDone(
  extra?: Record<string, unknown>,
) {
  recordOfficeNativeMarker("office_native_animation_frame_done", extra);
}

export function recordOfficeNativeCallbackFailure(params: {
  error: unknown;
  errorStage: string;
  extra?: Record<string, unknown>;
}) {
  recordOfficeReentryMarker(
    buildOfficeErrorMarkerInput({
      marker: "office_native_callback_failed",
      error: params.error,
      errorStage: params.errorStage,
      extra: params.extra,
      fallbackMessage: "office_native_callback_failed",
    }),
  );
}

export function recordOfficePostReturnFailure(params: {
  error: unknown;
  errorStage: string;
  extra?: Record<string, unknown>;
}) {
  recordOfficeReentryMarker(
    buildOfficeErrorMarkerInput({
      marker: "office_post_return_failed",
      error: params.error,
      errorStage: params.errorStage,
      extra: params.extra,
      fallbackMessage: "office_post_return_failed",
    }),
  );
}
