import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";

import { recordPlatformObservability } from "../observability/platformObservability";

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

type OfficeReentryBreadcrumbInput = {
  marker: OfficeReentryMarker;
  result?: unknown;
  errorStage?: unknown;
  errorClass?: unknown;
  errorMessage?: unknown;
  extra?: Record<string, unknown>;
};

const OFFICE_REENTRY_BREADCRUMBS_KEY = "rik_office_reentry_breadcrumbs_v1";
const MAX_BREADCRUMBS = 80;
const BREADCRUMB_BATCH_SIZE = 5;
const BREADCRUMB_FLUSH_INTERVAL_MS = 2_000;
const OFFICE_ROUTE = "/office";
const OFFICE_POST_RETURN_PROBES: readonly OfficePostReturnProbe[] = [
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

export type OfficeBreadcrumbBatcherFlushReason =
  | "background"
  | "clear"
  | "dispose"
  | "manual"
  | "route_exit"
  | "threshold"
  | "timer";

type OfficeBreadcrumbBatcherSubscription = { remove: () => void };

export type OfficeBreadcrumbBatcherOptions<TEntry> = {
  batchSize: number;
  flushIntervalMs: number;
  writeBatch: (items: TEntry[]) => Promise<void>;
  shouldFlushAfterItem?: (item: TEntry) => boolean;
  subscribeToFinalFlush?: (
    flush: (reason: OfficeBreadcrumbBatcherFlushReason) => void,
  ) => OfficeBreadcrumbBatcherSubscription | null;
};

export type OfficeBreadcrumbBatcher<TEntry> = {
  push: (items: TEntry[]) => Promise<void>;
  flushNow: (reason?: OfficeBreadcrumbBatcherFlushReason) => Promise<void>;
  dispose: (reason?: OfficeBreadcrumbBatcherFlushReason) => Promise<void>;
  getPendingCount: () => number;
};

let officePostReturnProbe: OfficePostReturnProbe[] = ["all"];
let pendingOfficeRouteReturnReceipt: Record<string, unknown> | null = null;
let recentOfficeRouteReturnReceipt: Record<string, unknown> | null = null;

function trimText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeEntry(
  input: OfficeReentryBreadcrumbInput,
): OfficeReentryBreadcrumb {
  return {
    at: new Date().toISOString(),
    marker: input.marker,
    result: trimText(input.result ?? "success"),
    errorStage: trimText(input.errorStage),
    errorClass: trimText(input.errorClass),
    errorMessage: trimText(input.errorMessage),
    extra: input.extra,
  };
}

async function readRawBreadcrumbs(): Promise<OfficeReentryBreadcrumb[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFICE_REENTRY_BREADCRUMBS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) => item && typeof item === "object",
    ) as OfficeReentryBreadcrumb[];
  } catch {
    return [];
  }
}

async function writeRawBreadcrumbs(items: OfficeReentryBreadcrumb[]) {
  try {
    await AsyncStorage.setItem(
      OFFICE_REENTRY_BREADCRUMBS_KEY,
      JSON.stringify(items.slice(-MAX_BREADCRUMBS)),
    );
  } catch {
    // Office re-entry diagnostics must never destabilize navigation.
  }
}

/**
 * Batched breadcrumb write queue.
 *
 * CRITICAL (P0): Each enqueueWrite used to do its own AsyncStorage.getItem +
 * AsyncStorage.setItem cycle (2 native bridge calls). During a back transition
 * from an Office child route, 6-10 markers fire in the same React cleanup tick,
 * producing 12-20 serialized native bridge calls while the native view hierarchy
 * is being torn down. The last call could hit a deallocated native module →
 * SIGABRT (Signal 6).
 *
 * Fix: Collect markers into `pendingBatch`, then flush on bounded policy:
 * 5 entries, 2 seconds, AppState background, or route-exit markers.
 */
function shouldFlushAfterMarker(marker: OfficeReentryMarker) {
  return (
    marker.endsWith("_unmount") ||
    marker.endsWith("_before_remove") ||
    marker.endsWith("_blur")
  );
}

export function createOfficeBreadcrumbBatcher<TEntry>(
  options: OfficeBreadcrumbBatcherOptions<TEntry>,
): OfficeBreadcrumbBatcher<TEntry> {
  let pendingBatch: TEntry[] = [];
  let writeQueue = Promise.resolve();
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let finalFlushSubscription: OfficeBreadcrumbBatcherSubscription | null = null;

  function clearFlushTimer() {
    if (flushTimer != null) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  }

  function removeFinalFlushSubscription() {
    finalFlushSubscription?.remove();
    finalFlushSubscription = null;
  }

  function ensureFinalFlushSubscription() {
    if (finalFlushSubscription || !options.subscribeToFinalFlush) return;
    try {
      finalFlushSubscription = options.subscribeToFinalFlush((reason) => {
        void flushNow(reason);
      });
    } catch {
      // Breadcrumb persistence must never destabilize Office navigation.
    }
  }

  function scheduleTimedFlush() {
    if (flushTimer != null) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushNow("timer");
    }, options.flushIntervalMs);
    const maybeNodeTimer = flushTimer as { unref?: () => void };
    maybeNodeTimer.unref?.();
  }

  function flushNow(
    _reason: OfficeBreadcrumbBatcherFlushReason = "manual",
  ): Promise<void> {
    clearFlushTimer();
    writeQueue = writeQueue
      .catch(() => undefined)
      .then(async () => {
        const batch = pendingBatch;
        pendingBatch = [];
        if (!batch.length) return;
        try {
          await options.writeBatch(batch);
        } catch {
          // A diagnostics flush failure must not poison future Office batches.
        } finally {
          if (!pendingBatch.length) {
            removeFinalFlushSubscription();
          }
        }
      });

    return writeQueue;
  }

  function push(items: TEntry[]): Promise<void> {
    if (!items.length) return writeQueue;

    ensureFinalFlushSubscription();
    pendingBatch.push(...items);

    const shouldFinalFlush = items.some((item) =>
      options.shouldFlushAfterItem?.(item),
    );
    if (shouldFinalFlush || pendingBatch.length >= options.batchSize) {
      return flushNow(shouldFinalFlush ? "route_exit" : "threshold");
    }

    scheduleTimedFlush();
    return writeQueue;
  }

  async function dispose(
    reason: OfficeBreadcrumbBatcherFlushReason = "dispose",
  ): Promise<void> {
    clearFlushTimer();
    await flushNow(reason);
    removeFinalFlushSubscription();
  }

  return {
    dispose,
    flushNow,
    getPendingCount: () => pendingBatch.length,
    push,
  };
}

const officeBreadcrumbBatcher =
  createOfficeBreadcrumbBatcher<OfficeReentryBreadcrumb>({
    batchSize: BREADCRUMB_BATCH_SIZE,
    flushIntervalMs: BREADCRUMB_FLUSH_INTERVAL_MS,
    shouldFlushAfterItem: (entry) => shouldFlushAfterMarker(entry.marker),
    subscribeToFinalFlush: (flush) =>
      AppState.addEventListener("change", (nextState) => {
        if (nextState !== "active") {
          flush("background");
        }
      }),
    writeBatch: async (batch) => {
      const current = await readRawBreadcrumbs();
      current.push(...batch);
      await writeRawBreadcrumbs(current);
    },
  });

export function flushOfficeReentryBreadcrumbWrites() {
  return officeBreadcrumbBatcher.flushNow();
}

function enqueueWrite(inputs: OfficeReentryBreadcrumbInput[]) {
  const entries = inputs.map(normalizeEntry);
  return officeBreadcrumbBatcher.push(entries);
}

export function recordOfficeReentryBreadcrumbs(
  inputs: OfficeReentryBreadcrumbInput[],
) {
  void enqueueWrite(inputs);
}

export async function recordOfficeReentryBreadcrumbsAsync(
  inputs: OfficeReentryBreadcrumbInput[],
) {
  enqueueWrite(inputs);
  await flushOfficeReentryBreadcrumbWrites();
}

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
    result:
      input.result === "error" ||
      input.result === "cache_hit" ||
      input.result === "joined_inflight" ||
      input.result === "queued_rerun" ||
      input.result === "skipped"
        ? input.result
        : "success",
    errorStage: trimText(input.errorStage) ?? undefined,
    errorClass: trimText(input.errorClass) ?? undefined,
    errorMessage: trimText(input.errorMessage) ?? undefined,
    extra,
  });
  recordOfficeReentryBreadcrumbs([{ ...input, extra }]);
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
  const errorClass =
    params.error instanceof Error ? params.error.name : undefined;
  const errorMessage =
    params.error instanceof Error
      ? params.error.message
      : String(params.error ?? "office_warehouse_entry_failed");

  recordOfficeReentryMarker({
    marker: "office_warehouse_entry_failed",
    result: "error",
    errorStage: params.errorStage,
    errorClass,
    errorMessage,
    extra: params.extra,
  });
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
  const errorClass =
    params.error instanceof Error ? params.error.name : undefined;
  const errorMessage =
    params.error instanceof Error
      ? params.error.message
      : String(params.error ?? "office_back_path_failed");

  recordOfficeReentryMarker({
    marker: "office_back_path_failed",
    result: "error",
    errorStage: params.errorStage,
    errorClass,
    errorMessage,
    extra: params.extra,
  });
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
  const errorClass =
    params.error instanceof Error ? params.error.name : undefined;
  const errorMessage =
    params.error instanceof Error
      ? params.error.message
      : String(params.error ?? "office_reentry_failed");

  recordOfficeReentryMarker({
    marker: "office_reentry_failed",
    result: "error",
    errorStage: params.errorStage,
    errorClass,
    errorMessage,
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
  const errorClass =
    params.error instanceof Error ? params.error.name : undefined;
  const errorMessage =
    params.error instanceof Error
      ? params.error.message
      : String(params.error ?? "office_post_return_subtree_failed");

  recordOfficeReentryMarker({
    marker: "office_post_return_subtree_failed",
    result: "error",
    errorStage: params.errorStage,
    errorClass,
    errorMessage,
    extra: params.extra,
  });
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
  const errorClass =
    params.error instanceof Error ? params.error.name : undefined;
  const errorMessage =
    params.error instanceof Error
      ? params.error.message
      : String(params.error ?? "office_native_callback_failed");

  recordOfficeReentryMarker({
    marker: "office_native_callback_failed",
    result: "error",
    errorStage: params.errorStage,
    errorClass,
    errorMessage,
    extra: params.extra,
  });
}

export function recordOfficePostReturnFailure(params: {
  error: unknown;
  errorStage: string;
  extra?: Record<string, unknown>;
}) {
  const errorClass =
    params.error instanceof Error ? params.error.name : undefined;
  const errorMessage =
    params.error instanceof Error
      ? params.error.message
      : String(params.error ?? "office_post_return_failed");

  recordOfficeReentryMarker({
    marker: "office_post_return_failed",
    result: "error",
    errorStage: params.errorStage,
    errorClass,
    errorMessage,
    extra: params.extra,
  });
}

export async function getOfficeReentryBreadcrumbs() {
  await flushOfficeReentryBreadcrumbWrites();
  return await readRawBreadcrumbs();
}

export async function clearOfficeReentryBreadcrumbs() {
  await officeBreadcrumbBatcher.dispose("clear");
  try {
    await AsyncStorage.removeItem(OFFICE_REENTRY_BREADCRUMBS_KEY);
  } catch {
    // Ignore diagnostics cleanup failures.
  }
}

function normalizeOfficePostReturnProbeToken(
  value: unknown,
): OfficePostReturnProbe | null {
  const token = String(value ?? "")
    .trim()
    .toLowerCase() as OfficePostReturnProbe;

  return OFFICE_POST_RETURN_PROBES.includes(token) ? token : null;
}

export function normalizeOfficePostReturnProbe(
  value: unknown,
): OfficePostReturnProbe[] | null {
  if (value == null) return null;

  const parts = Array.isArray(value)
    ? value
    : String(value)
        .split(",")
        .map((item) => item.trim());
  const normalized = Array.from(
    new Set(
      parts
        .flatMap((item) => String(item).split(","))
        .map((item) => normalizeOfficePostReturnProbeToken(item))
        .filter((item): item is OfficePostReturnProbe => Boolean(item)),
    ),
  );

  return normalized.length ? normalized : ["all"];
}

export function getOfficePostReturnProbe() {
  return officePostReturnProbe;
}

export function setOfficePostReturnProbe(
  value: unknown,
): OfficePostReturnProbe[] {
  officePostReturnProbe = normalizeOfficePostReturnProbe(value) ?? ["all"];
  return officePostReturnProbe;
}

export function markPendingOfficeRouteReturnReceipt(
  extra?: Record<string, unknown>,
) {
  const receipt = { ...(extra ?? {}) };
  pendingOfficeRouteReturnReceipt = receipt;
  recentOfficeRouteReturnReceipt = receipt;
}

export function consumePendingOfficeRouteReturnReceipt() {
  const next = pendingOfficeRouteReturnReceipt;
  pendingOfficeRouteReturnReceipt = null;
  if (next) {
    recentOfficeRouteReturnReceipt = next;
  }
  return next;
}

export function peekPendingOfficeRouteReturnReceipt() {
  return pendingOfficeRouteReturnReceipt ?? recentOfficeRouteReturnReceipt;
}

function isSameOfficeRouteReturnReceipt(
  left: Record<string, unknown> | null | undefined,
  right: Record<string, unknown> | null | undefined,
) {
  if (!left || !right) return false;
  return (
    left === right ||
    (left.sourceRoute === right.sourceRoute &&
      left.target === right.target &&
      left.method === right.method)
  );
}

export function clearPendingOfficeRouteReturnReceipt(
  receipt?: Record<string, unknown> | null,
) {
  const target = receipt ?? recentOfficeRouteReturnReceipt;
  if (!target) {
    pendingOfficeRouteReturnReceipt = null;
    recentOfficeRouteReturnReceipt = null;
    return;
  }

  if (isSameOfficeRouteReturnReceipt(pendingOfficeRouteReturnReceipt, target)) {
    pendingOfficeRouteReturnReceipt = null;
  }
  if (isSameOfficeRouteReturnReceipt(recentOfficeRouteReturnReceipt, target)) {
    recentOfficeRouteReturnReceipt = null;
  }
}

export function formatOfficePostReturnProbe(
  value: readonly OfficePostReturnProbe[] | null | undefined,
) {
  const normalized = Array.from(
    new Set(
      (value ?? []).filter((item): item is OfficePostReturnProbe =>
        Boolean(item),
      ),
    ),
  );

  return normalized.length ? normalized.join(",") : "all";
}

export function buildOfficeReentryBreadcrumbsText(
  items: OfficeReentryBreadcrumb[],
) {
  return items
    .map((item) => {
      const parts = [item.at, item.marker, item.result ?? "unknown-result"];
      if (item.errorStage) parts.push(`stage=${item.errorStage}`);
      if (item.errorClass) parts.push(`class=${item.errorClass}`);
      if (item.errorMessage) parts.push(`error=${item.errorMessage}`);
      if (item.extra?.route) parts.push(`route=${String(item.extra.route)}`);
      if (item.extra?.owner) parts.push(`owner=${String(item.extra.owner)}`);
      if (item.extra?.mode) parts.push(`mode=${String(item.extra.mode)}`);
      if (item.extra?.focusCycle != null)
        parts.push(`focusCycle=${String(item.extra.focusCycle)}`);
      if (item.extra?.section)
        parts.push(`section=${String(item.extra.section)}`);
      if (item.extra?.sections)
        parts.push(`sections=${String(item.extra.sections)}`);
      if (item.extra?.callback)
        parts.push(`callback=${String(item.extra.callback)}`);
      if (item.extra?.subtree)
        parts.push(`subtree=${String(item.extra.subtree)}`);
      if (item.extra?.identity)
        parts.push(`identity=${String(item.extra.identity)}`);
      if (item.extra?.pathname)
        parts.push(`pathname=${String(item.extra.pathname)}`);
      if (item.extra?.segments)
        parts.push(`segments=${String(item.extra.segments)}`);
      if (item.extra?.wrappedRoute)
        parts.push(`wrappedRoute=${String(item.extra.wrappedRoute)}`);
      if (item.extra?.routeWrapper)
        parts.push(`routeWrapper=${String(item.extra.routeWrapper)}`);
      if (item.extra?.sourceRoute)
        parts.push(`sourceRoute=${String(item.extra.sourceRoute)}`);
      if (item.extra?.target) parts.push(`target=${String(item.extra.target)}`);
      if (item.extra?.method) parts.push(`method=${String(item.extra.method)}`);
      if (item.extra?.handler)
        parts.push(`handler=${String(item.extra.handler)}`);
      if (item.extra?.action) parts.push(`action=${String(item.extra.action)}`);
      if (item.extra?.phase) parts.push(`phase=${String(item.extra.phase)}`);
      if (item.extra?.source) parts.push(`source=${String(item.extra.source)}`);
      if (item.extra?.writeTarget)
        parts.push(`writeTarget=${String(item.extra.writeTarget)}`);
      if (item.extra?.hadOpenUi != null)
        parts.push(`hadOpenUi=${String(item.extra.hadOpenUi)}`);
      if (item.extra?.visibleScope)
        parts.push(`visibleScope=${String(item.extra.visibleScope)}`);
      if (item.extra?.skippedScope)
        parts.push(`skippedScope=${String(item.extra.skippedScope)}`);
      if (item.extra?.tab) parts.push(`tab=${String(item.extra.tab)}`);
      if (item.extra?.reason) parts.push(`reason=${String(item.extra.reason)}`);
      if (item.extra?.probe) parts.push(`probe=${String(item.extra.probe)}`);
      return parts.join(" | ");
    })
    .join("\n");
}
