export type OfficeReentryMarker =
  | "office_reentry_start"
  | "office_reentry_route_match"
  | "office_reentry_component_enter"
  | "office_reentry_mount"
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
  | "office_warehouse_entry_failed"
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
  | "office_back_path_failed"
  | "tab_warehouse_entry_mount_start"
  | "tab_warehouse_entry_mount_done"
  | "office_bootstrap_initial_start"
  | "office_bootstrap_initial_done"
  | "office_reentry_effect_start"
  | "office_reentry_effect_done"
  | "office_reentry_render_success"
  | "office_focus_refresh_skipped"
  | "office_focus_refresh_start"
  | "office_focus_refresh_done"
  | "office_focus_refresh_reason"
  | "office_loading_shell_enter"
  | "office_loading_shell_skipped_on_focus_return"
  | "office_reentry_failed"
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
  | "office_post_return_subtree_failed"
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
  | "office_native_callback_failed"
  | "office_post_return_failed";

export type OfficePostReturnProbe =
  | "all"
  | "header_meta"
  | "summary"
  | "directions"
  | "company_details"
  | "invites"
  | "members"
  | "no_scroll_callbacks"
  | "no_layout_callbacks"
  | "no_content_size_callbacks"
  | "no_keyboard_bridge"
  | "no_interaction_manager"
  | "no_animation_frame"
  | "no_focus_post_commit";

export type OfficePostReturnSubtree =
  | "layout_effect_mount"
  | "render_effect_mount"
  | "focus_effect_callback"
  | "idle_callback"
  | "scroll_view_layout"
  | "scroll_view_content"
  | "summary_header"
  | "summary_meta"
  | "summary_badges"
  | "directions_cards"
  | "company_details_rows"
  | "invites_handoff"
  | "invites_list"
  | "members_list"
  | "invite_modal_form";

export type OfficeReentryBreadcrumb = {
  at: string;
  marker: OfficeReentryMarker;
  result: string | null;
  errorStage?: string | null;
  errorClass?: string | null;
  errorMessage?: string | null;
  extra?: Record<string, unknown>;
};

export type OfficeReentryBreadcrumbInput = {
  marker: OfficeReentryMarker;
  result?: unknown;
  errorStage?: unknown;
  errorClass?: unknown;
  errorMessage?: unknown;
  extra?: Record<string, unknown>;
};

export type OfficeBreadcrumbBatcherFlushReason =
  | "background"
  | "clear"
  | "dispose"
  | "manual"
  | "route_exit"
  | "threshold"
  | "timer";

export type OfficeBreadcrumbBatcherSubscription = { remove: () => void };

export type OfficeBreadcrumbBatcherUnexpectedErrorStage =
  | "subscribe_final_flush"
  | "write_batch";

export type OfficeBreadcrumbBatcherOptions<TEntry> = {
  batchSize: number;
  flushIntervalMs: number;
  writeBatch: (items: TEntry[]) => Promise<void>;
  shouldFlushAfterItem?: (item: TEntry) => boolean;
  subscribeToFinalFlush?: (
    flush: (reason: OfficeBreadcrumbBatcherFlushReason) => void,
  ) => OfficeBreadcrumbBatcherSubscription | null;
  onUnexpectedError?: (params: {
    stage: OfficeBreadcrumbBatcherUnexpectedErrorStage;
    error: unknown;
  }) => void;
};

export type OfficeBreadcrumbBatcher<TEntry> = {
  push: (items: TEntry[]) => Promise<void>;
  flushNow: (reason?: OfficeBreadcrumbBatcherFlushReason) => Promise<void>;
  dispose: (reason?: OfficeBreadcrumbBatcherFlushReason) => Promise<void>;
  getPendingCount: () => number;
};

export const OFFICE_REENTRY_BREADCRUMBS_KEY =
  "rik_office_reentry_breadcrumbs_v1";
export const MAX_BREADCRUMBS = 80;
export const BREADCRUMB_BATCH_SIZE = 5;
export const BREADCRUMB_FLUSH_INTERVAL_MS = 2_000;
export const OFFICE_ROUTE = "/office";
export const OFFICE_POST_RETURN_PROBES: readonly OfficePostReturnProbe[] = [
  "all",
  "header_meta",
  "summary",
  "directions",
  "company_details",
  "invites",
  "members",
  "no_scroll_callbacks",
  "no_layout_callbacks",
  "no_content_size_callbacks",
  "no_keyboard_bridge",
  "no_interaction_manager",
  "no_animation_frame",
  "no_focus_post_commit",
];

export function trimOfficeReentryText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

export function normalizeOfficeReentryBreadcrumb(
  input: OfficeReentryBreadcrumbInput,
): OfficeReentryBreadcrumb {
  return {
    at: new Date().toISOString(),
    marker: input.marker,
    result: trimOfficeReentryText(input.result ?? "success"),
    errorStage: trimOfficeReentryText(input.errorStage),
    errorClass: trimOfficeReentryText(input.errorClass),
    errorMessage: trimOfficeReentryText(input.errorMessage),
    extra: input.extra,
  };
}

export function normalizeOfficeReentryObservabilityResult(
  value: unknown,
): "success" | "error" | "cache_hit" | "joined_inflight" | "queued_rerun" | "skipped" {
  return value === "error" ||
    value === "cache_hit" ||
    value === "joined_inflight" ||
    value === "queued_rerun" ||
    value === "skipped"
    ? value
    : "success";
}

export function buildOfficeReentryErrorDescriptor(
  error: unknown,
  fallbackMessage: string,
) {
  return {
    errorClass: error instanceof Error ? error.name : undefined,
    errorMessage:
      error instanceof Error ? error.message : String(error ?? fallbackMessage),
  };
}
