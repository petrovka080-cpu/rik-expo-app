/**
 * directorReports.scopeLoader.ts
 *
 * Reusable request-slot lifecycle utilities for Director Reports scope loading.
 *
 * Extracted from useDirectorReportsController (lines 44-167) to reduce the
 * controller's size and make the request-slot pattern testable in isolation.
 *
 * Rules:
 * - No React imports
 * - No UI state management
 * - Pure request lifecycle utilities
 */

import type { MutableRefObject } from "react";
import { abortController } from "../../../lib/requestCancellation";
import { recordPlatformObservability } from "../../../lib/observability/platformObservability";

import { emitQueryAbort } from "./directorReports.observability";

/**
 * Represents an active director reports request with its abort controller.
 */
export type DirectorReportsRequestSlot = {
  key: string;
  reqId: number;
  controller: AbortController;
};

/**
 * Start a new director reports request, aborting any previous one.
 * Returns the new request slot.
 */
export const startDirectorReportsRequest = (
  ref: MutableRefObject<DirectorReportsRequestSlot | null>,
  key: string,
  reqId: number,
  reason: string,
): DirectorReportsRequestSlot => {
  if (ref.current && !ref.current.controller.signal.aborted) {
    emitQueryAbort({ key: ref.current.key, reason });
  }
  abortController(ref.current?.controller, reason);
  const slot: DirectorReportsRequestSlot = {
    key,
    reqId,
    controller: new AbortController(),
  };
  ref.current = slot;
  return slot;
};

/**
 * Check if a request slot is still the active one and not aborted.
 */
export const isActiveDirectorReportsRequest = (
  ref: MutableRefObject<DirectorReportsRequestSlot | null>,
  slot: DirectorReportsRequestSlot,
): boolean => ref.current === slot && !slot.controller.signal.aborted;

/**
 * Clear the request slot if it matches the given slot.
 */
export const clearDirectorReportsRequest = (
  ref: MutableRefObject<DirectorReportsRequestSlot | null>,
  slot: DirectorReportsRequestSlot,
): void => {
  if (ref.current === slot) ref.current = null;
};

/**
 * Safely extract an error message from unknown error values.
 */
export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) return message;
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message = String(record.message ?? "").trim();
    if (message) return message;
  }

  const raw = String(error ?? "").trim();
  return raw || fallback;
};

/**
 * Record a director reports warning with structured observability.
 */
export const recordDirectorReportsWarning = (
  event: string,
  error: unknown,
  extra?: Record<string, unknown>,
): void => {
  const message = getErrorMessage(error, event);
  if (__DEV__) console.warn("[director_reports.controller]", { event, message, ...extra });
  recordPlatformObservability({
    screen: "director",
    surface: "reports",
    category: "ui",
    event,
    result: "error",
    fallbackUsed: true,
    errorClass: error instanceof Error ? error.name : undefined,
    errorMessage: message,
    extra: {
      module: "useDirectorReportsController",
      route: "/director",
      role: "director",
      owner: "reports_controller",
      severity: "warn",
      ...extra,
    },
  });
};
