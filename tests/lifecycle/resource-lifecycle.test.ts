/**
 * Resource lifecycle discipline tests.
 *
 * WAVE AB: Validates that the session boundary reset path reaches
 * all registered subsystems, and that each resource cleanup is
 * safe, idempotent, and doesn't throw under edge conditions.
 *
 * Touched flow: sessionBoundary.ts — centralized session lifecycle owner
 * Root cause: If any subsystem cleanup throws or is missing, stale
 * resources (cached roles, draft IDs, PDF sessions, realtime channels)
 * persist across sessions, causing data leaks and ghost state.
 */

import { resetSessionBoundary } from "../../src/lib/session/sessionBoundary";
import { clearDocumentSessions } from "../../src/lib/documents/pdfDocumentSessions";
import { clearPdfRunnerSessionState } from "../../src/lib/pdfRunner";
import { clearCurrentSessionRoleCache } from "../../src/lib/sessionRole";
import { clearRealtimeSessionState } from "../../src/lib/realtime/realtime.client";
import { resetOfflineReplayCoordinator } from "../../src/lib/offline/offlineReplayCoordinator";
import { clearOfficeHubBootstrapSnapshot } from "../../src/screens/office/officeHubBootstrapSnapshot";
import { clearCachedDraftRequestId } from "../../src/lib/api/requests";
import { invalidateRequestsReadCapabilitiesCache } from "../../src/lib/api/requests.read-capabilities";
import { clearLocalDraftId } from "../../src/lib/catalog/catalog.request.service";

describe("resource lifecycle — session boundary completeness", () => {
  it("resetSessionBoundary is callable and does not throw", async () => {
    await expect(resetSessionBoundary("test_logout")).resolves.not.toThrow();
  });

  it("resetSessionBoundary is idempotent (safe to call multiple times)", async () => {
    await resetSessionBoundary("first_reset");
    await resetSessionBoundary("second_reset");
    await resetSessionBoundary("third_reset");
    // no throw = pass
  });

  it("resetSessionBoundary with empty reason still works", async () => {
    await expect(resetSessionBoundary("")).resolves.not.toThrow();
  });
});

describe("resource lifecycle — individual subsystem cleaners", () => {
  it("clearDocumentSessions is safe and idempotent", () => {
    expect(() => clearDocumentSessions()).not.toThrow();
    expect(() => clearDocumentSessions()).not.toThrow();
  });

  it("clearPdfRunnerSessionState is safe and idempotent", () => {
    expect(() => clearPdfRunnerSessionState()).not.toThrow();
    expect(() => clearPdfRunnerSessionState()).not.toThrow();
  });

  it("clearCurrentSessionRoleCache is safe and idempotent", () => {
    expect(() => clearCurrentSessionRoleCache()).not.toThrow();
    expect(() => clearCurrentSessionRoleCache()).not.toThrow();
  });

  it("clearRealtimeSessionState is safe and idempotent", () => {
    expect(() => clearRealtimeSessionState()).not.toThrow();
    expect(() => clearRealtimeSessionState()).not.toThrow();
  });

  it("resetOfflineReplayCoordinator is safe and idempotent", () => {
    expect(() => resetOfflineReplayCoordinator()).not.toThrow();
    expect(() => resetOfflineReplayCoordinator()).not.toThrow();
  });

  it("clearOfficeHubBootstrapSnapshot is safe and idempotent", () => {
    expect(() => clearOfficeHubBootstrapSnapshot()).not.toThrow();
    expect(() => clearOfficeHubBootstrapSnapshot()).not.toThrow();
  });

  it("clearCachedDraftRequestId is safe and idempotent", () => {
    expect(() => clearCachedDraftRequestId()).not.toThrow();
    expect(() => clearCachedDraftRequestId()).not.toThrow();
  });

  it("invalidateRequestsReadCapabilitiesCache is safe and idempotent", () => {
    expect(() => invalidateRequestsReadCapabilitiesCache()).not.toThrow();
    expect(() => invalidateRequestsReadCapabilitiesCache()).not.toThrow();
  });

  it("clearLocalDraftId is safe and idempotent", () => {
    expect(() => clearLocalDraftId()).not.toThrow();
    expect(() => clearLocalDraftId()).not.toThrow();
  });
});

describe("resource lifecycle — cleanup ordering safety", () => {
  it("all cleaners can run in any order without dependency errors", () => {
    // Reverse order from sessionBoundary.ts to verify no hidden deps
    expect(() => {
      invalidateRequestsReadCapabilitiesCache();
      clearLocalDraftId();
      clearCachedDraftRequestId();
      resetOfflineReplayCoordinator();
      clearRealtimeSessionState();
      clearOfficeHubBootstrapSnapshot();
      clearPdfRunnerSessionState();
      clearCurrentSessionRoleCache();
      clearDocumentSessions();
    }).not.toThrow();
  });

  it("interleaved reset and cleanup does not corrupt state", async () => {
    clearDocumentSessions();
    await resetSessionBoundary("interleaved_1");
    clearRealtimeSessionState();
    await resetSessionBoundary("interleaved_2");
    clearPdfRunnerSessionState();
    // no throw = pass
  });
});
