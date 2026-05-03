/* eslint-disable @typescript-eslint/no-require-imports -- Lazy requires keep heavy session cleanup modules out of auth startup. */
/**
 * Session Boundary — centralized session lifecycle owner.
 *
 * WAVE H: All session-bound state cleanup MUST go through this module.
 * No scattered cleanup calls should exist outside this boundary.
 *
 * This module is the SINGLE source of truth for:
 * - session reset / logout cleanup
 * - session-bound cache invalidation
 * - cross-module state cleanup on auth boundary
 *
 * Every subsystem that owns session-bound state registers its cleaner here.
 * `_layout.tsx` calls `resetSessionBoundary(reason)` — nothing else.
 */

type SessionBoundaryCleaners = {
  clearDocumentSessions: () => void;
  clearPdfRunnerSessionState: () => void;
  clearCurrentSessionRoleCache: () => void;
  clearRealtimeSessionState: () => void;
  resetOfflineReplayCoordinator: () => void;
  resetQueryCache: () => void;
  clearOfficeHubBootstrapSnapshot: () => void;
  clearCachedDraftRequestId: () => void;
  invalidateRequestsReadCapabilitiesCache: () => void;
  clearLocalDraftId: () => void;
  clearAppCache: (options: {
    mode: "session";
    owner: string;
  }) => Promise<void>;
};

function loadSessionBoundaryCleaners(): SessionBoundaryCleaners {
  const { clearDocumentSessions } =
    require("../documents/pdfDocumentSessions") as typeof import("../documents/pdfDocumentSessions");
  const { clearPdfRunnerSessionState } =
    require("../pdfRunner") as typeof import("../pdfRunner");
  const { clearCurrentSessionRoleCache } =
    require("../sessionRole") as typeof import("../sessionRole");
  const { clearRealtimeSessionState } =
    require("../realtime/realtime.client") as typeof import("../realtime/realtime.client");
  const { resetOfflineReplayCoordinator } =
    require("../offline/offlineReplayCoordinator") as typeof import("../offline/offlineReplayCoordinator");
  const { resetQueryCache } =
    require("../query/queryClient") as typeof import("../query/queryClient");
  const { clearOfficeHubBootstrapSnapshot } =
    require("../../screens/office/officeHubBootstrapSnapshot") as typeof import("../../screens/office/officeHubBootstrapSnapshot");
  const { clearCachedDraftRequestId } =
    require("../api/requests") as typeof import("../api/requests");
  const { invalidateRequestsReadCapabilitiesCache } =
    require("../api/requests.read-capabilities") as typeof import("../api/requests.read-capabilities");
  const { clearLocalDraftId } =
    require("../catalog/catalog.request.service") as typeof import("../catalog/catalog.request.service");
  const { clearAppCache } =
    require("../cache/clearAppCache") as typeof import("../cache/clearAppCache");

  return {
    clearDocumentSessions,
    clearPdfRunnerSessionState,
    clearCurrentSessionRoleCache,
    clearRealtimeSessionState,
    resetOfflineReplayCoordinator,
    resetQueryCache,
    clearOfficeHubBootstrapSnapshot,
    clearCachedDraftRequestId,
    invalidateRequestsReadCapabilitiesCache,
    clearLocalDraftId,
    clearAppCache,
  };
}

function recordSessionBoundaryPurgeFailure(reason: string, purgeError: unknown) {
  const { recordPlatformObservability } =
    require("../observability/platformObservability") as typeof import("../observability/platformObservability");

  recordPlatformObservability({
    screen: "request",
    surface: "session_boundary",
    category: "ui",
    event: "session_cache_purge_failed",
    result: "error",
    errorStage: "clear_app_cache",
    errorClass: purgeError instanceof Error ? purgeError.name : "Unknown",
    errorMessage: purgeError instanceof Error ? purgeError.message : String(purgeError),
    extra: {
      owner: "session_boundary",
      reason,
    },
  });
}

/**
 * Reset all session-bound state at auth boundary.
 *
 * Called on:
 * - terminal sign out (SIGNED_OUT event)
 * - bootstrap with no session
 *
 * Guarantees:
 * - No stale user data survives across sessions
 * - No prior-session draft IDs leak to next user
 * - All query/realtime/cache/role state is invalidated
 * - All subsystem cleaners run in a single predictable path
 */
export async function resetSessionBoundary(reason: string): Promise<void> {
  const cleaners = loadSessionBoundaryCleaners();

  // --- Synchronous resets (module-level singletons) ---
  cleaners.clearDocumentSessions();
  cleaners.clearCurrentSessionRoleCache();
  cleaners.clearPdfRunnerSessionState();
  cleaners.clearOfficeHubBootstrapSnapshot();
  cleaners.resetOfflineReplayCoordinator();
  cleaners.clearRealtimeSessionState();
  cleaners.resetQueryCache();

  // --- Session-bound draft/capability caches (NEW in Wave H) ---
  cleaners.clearCachedDraftRequestId();
  cleaners.clearLocalDraftId();
  cleaners.invalidateRequestsReadCapabilitiesCache();

  // --- Async cache purge ---
  try {
    await cleaners.clearAppCache({ mode: "session", owner: `session_boundary:${reason}` });
  } catch (purgeError) {
    recordSessionBoundaryPurgeFailure(reason, purgeError);
  }
}
