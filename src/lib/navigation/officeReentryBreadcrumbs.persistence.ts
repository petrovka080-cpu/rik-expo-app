import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";

import { safeJsonParse } from "../format";
import { recordPlatformObservability } from "../observability/platformObservability";
import {
  BREADCRUMB_BATCH_SIZE,
  BREADCRUMB_FLUSH_INTERVAL_MS,
  MAX_BREADCRUMBS,
  OFFICE_REENTRY_BREADCRUMBS_KEY,
  type OfficeReentryBreadcrumb,
  type OfficeReentryBreadcrumbInput,
  normalizeOfficeReentryBreadcrumb,
} from "./officeReentryBreadcrumbs.contract";
import {
  createOfficeBreadcrumbBatcher,
  shouldFlushAfterOfficeMarker,
} from "./officeReentryBreadcrumbBatcher";

function recordOfficeReentryPersistenceFailure(params: {
  event: string;
  error: unknown;
  errorStage: string;
}) {
  const errorClass = params.error instanceof Error ? params.error.name : null;
  const errorMessage =
    params.error instanceof Error
      ? params.error.message
      : String(params.error ?? params.event);

  recordPlatformObservability({
    screen: "office",
    surface: "office_reentry",
    category: "ui",
    event: params.event,
    result: "error",
    errorStage: params.errorStage,
    errorClass: errorClass ?? undefined,
    errorMessage,
    sourceKind: "async_storage:office_reentry_breadcrumbs",
  });
}

async function readRawBreadcrumbs(): Promise<OfficeReentryBreadcrumb[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFICE_REENTRY_BREADCRUMBS_KEY);
    if (!raw) return [];
    const parsedResult = safeJsonParse<unknown>(raw, []);
    if (parsedResult.ok === false) throw parsedResult.error;
    const parsed = parsedResult.value;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) => item && typeof item === "object",
    ) as OfficeReentryBreadcrumb[];
  } catch (error) {
    recordOfficeReentryPersistenceFailure({
      event: "office_reentry_breadcrumb_read_failed",
      error,
      errorStage: "office_reentry_breadcrumb_read",
    });
    return [];
  }
}

async function writeRawBreadcrumbs(items: OfficeReentryBreadcrumb[]) {
  try {
    await AsyncStorage.setItem(
      OFFICE_REENTRY_BREADCRUMBS_KEY,
      JSON.stringify(items.slice(-MAX_BREADCRUMBS)),
    );
  } catch (error) {
    recordOfficeReentryPersistenceFailure({
      event: "office_reentry_breadcrumb_write_failed",
      error,
      errorStage: "office_reentry_breadcrumb_write",
    });
  }
}

async function removeRawBreadcrumbs() {
  try {
    await AsyncStorage.removeItem(OFFICE_REENTRY_BREADCRUMBS_KEY);
  } catch (error) {
    recordOfficeReentryPersistenceFailure({
      event: "office_reentry_breadcrumb_clear_failed",
      error,
      errorStage: "office_reentry_breadcrumb_clear",
    });
  }
}

const officeBreadcrumbBatcher =
  createOfficeBreadcrumbBatcher<OfficeReentryBreadcrumb>({
    batchSize: BREADCRUMB_BATCH_SIZE,
    flushIntervalMs: BREADCRUMB_FLUSH_INTERVAL_MS,
    shouldFlushAfterItem: (entry) => shouldFlushAfterOfficeMarker(entry.marker),
    subscribeToFinalFlush: (flush) =>
      AppState.addEventListener("change", (nextState) => {
        if (nextState !== "active") {
          flush("background");
        }
      }),
    onUnexpectedError: ({ error, stage }) => {
      recordOfficeReentryPersistenceFailure({
        event:
          stage === "subscribe_final_flush"
            ? "office_reentry_breadcrumb_subscribe_failed"
            : "office_reentry_breadcrumb_batch_flush_failed",
        error,
        errorStage: stage,
      });
    },
    writeBatch: async (batch) => {
      const current = await readRawBreadcrumbs();
      current.push(...batch);
      await writeRawBreadcrumbs(current);
    },
  });

function enqueueWrite(inputs: OfficeReentryBreadcrumbInput[]) {
  const entries = inputs.map(normalizeOfficeReentryBreadcrumb);
  return officeBreadcrumbBatcher.push(entries);
}

export function flushOfficeReentryBreadcrumbWrites() {
  return officeBreadcrumbBatcher.flushNow();
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

export async function getOfficeReentryBreadcrumbs() {
  await flushOfficeReentryBreadcrumbWrites();
  return await readRawBreadcrumbs();
}

export async function clearOfficeReentryBreadcrumbs() {
  await officeBreadcrumbBatcher.dispose("clear");
  await removeRawBreadcrumbs();
}
