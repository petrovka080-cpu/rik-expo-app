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

import { clearDocumentSessions } from "../documents/pdfDocumentSessions";
import { clearPdfRunnerSessionState } from "../pdfRunner";
import { clearCurrentSessionRoleCache } from "../sessionRole";
import { clearRealtimeSessionState } from "../realtime/realtime.client";
import { resetOfflineReplayCoordinator } from "../offline/offlineReplayCoordinator";
import { resetQueryCache } from "../query/queryClient";
import { clearOfficeHubBootstrapSnapshot } from "../../screens/office/officeHubBootstrapSnapshot";
import { clearCachedDraftRequestId } from "../api/requests";
import { invalidateRequestsReadCapabilitiesCache } from "../api/requests.read-capabilities";
import { clearLocalDraftId } from "../catalog/catalog.request.service";
import { clearAppCache } from "../cache/clearAppCache";
import { recordPlatformObservability } from "../observability/platformObservability";

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
  // --- Synchronous resets (module-level singletons) ---
  clearDocumentSessions();
  clearCurrentSessionRoleCache();
  clearPdfRunnerSessionState();
  clearOfficeHubBootstrapSnapshot();
  resetOfflineReplayCoordinator();
  clearRealtimeSessionState();
  resetQueryCache();

  // --- Session-bound draft/capability caches (NEW in Wave H) ---
  clearCachedDraftRequestId();
  clearLocalDraftId();
  invalidateRequestsReadCapabilitiesCache();

  // --- Async cache purge ---
  try {
    await clearAppCache({ mode: "session", owner: `session_boundary:${reason}` });
  } catch (purgeError) {
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
}
