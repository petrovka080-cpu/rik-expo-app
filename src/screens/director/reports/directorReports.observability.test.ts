/**
 * directorReports.observability.test.ts
 *
 * Tests that each lifecycle event emitter:
 * - Calls logger.* with correct tag
 * - Calls recordPlatformObservability with correct event name and screen
 */

import { logger } from "../../../lib/logger";
import { recordPlatformObservability } from "../../../lib/observability/platformObservability";
import {
  emitQueryStart,
  emitQuerySuccess,
  emitQueryError,
  emitQueryAbort,
  emitRefreshStart,
  emitRefreshSuccess,
  emitRefreshError,
  emitFiltersChanged,
  emitCommitOptions,
  emitCommitReport,
  emitCommitDiscipline,
  emitOpenReports,
} from "./directorReports.observability";

jest.mock("../../../lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../../../lib/observability/platformObservability", () => ({
  recordPlatformObservability: jest.fn(),
}));

const mockLogger = logger as jest.Mocked<typeof logger>;
const mockObs = recordPlatformObservability as jest.MockedFunction<typeof recordPlatformObservability>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("query lifecycle events", () => {
  it("emitQueryStart calls logger.info and recordPlatformObservability", () => {
    emitQueryStart({ key: "k1", objectName: "Obj1", tab: "materials" });
    expect(mockLogger.info).toHaveBeenCalledWith("director_reports", "query_start", expect.objectContaining({ key: "k1" }));
    expect(mockObs).toHaveBeenCalledWith(expect.objectContaining({
      screen: "director",
      event: "director_reports_query_start",
    }));
  });

  it("emitQuerySuccess records duration and result size", () => {
    emitQuerySuccess({ key: "k1", durationMs: 150, resultSize: 42 });
    expect(mockLogger.info).toHaveBeenCalledWith("director_reports", "query_success", expect.objectContaining({ durationMs: 150 }));
    expect(mockObs).toHaveBeenCalledWith(expect.objectContaining({
      event: "director_reports_query_success",
      durationMs: 150,
      rowCount: 42,
    }));
  });

  it("emitQueryError calls logger.error", () => {
    emitQueryError({ key: "k1", durationMs: 200, errorMessage: "timeout" });
    expect(mockLogger.error).toHaveBeenCalledWith("director_reports", "query_error", expect.objectContaining({ errorMessage: "timeout" }));
    expect(mockObs).toHaveBeenCalledWith(expect.objectContaining({
      event: "director_reports_query_error",
      result: "error",
    }));
  });
});

describe("abort event", () => {
  it("emitQueryAbort calls logger.warn with reason", () => {
    emitQueryAbort({ key: "k1", reason: "param_change" });
    expect(mockLogger.warn).toHaveBeenCalledWith("director_reports", "query_abort", expect.objectContaining({ reason: "param_change" }));
    expect(mockObs).toHaveBeenCalledWith(expect.objectContaining({
      event: "director_reports_query_abort",
      result: "skipped",
      extra: expect.objectContaining({ guardReason: "param_change" }),
    }));
  });
});

describe("refresh lifecycle events", () => {
  it("emitRefreshStart", () => {
    emitRefreshStart({ key: "r1" });
    expect(mockLogger.info).toHaveBeenCalledWith("director_reports", "refresh_start", expect.any(Object));
    expect(mockObs).toHaveBeenCalledWith(expect.objectContaining({ event: "director_reports_refresh_start" }));
  });

  it("emitRefreshSuccess", () => {
    emitRefreshSuccess({ key: "r1", durationMs: 300, resultSize: 10 });
    expect(mockObs).toHaveBeenCalledWith(expect.objectContaining({
      event: "director_reports_refresh_success",
      durationMs: 300,
    }));
  });

  it("emitRefreshError", () => {
    emitRefreshError({ key: "r1", errorMessage: "network" });
    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockObs).toHaveBeenCalledWith(expect.objectContaining({
      event: "director_reports_refresh_error",
      result: "error",
    }));
  });
});

describe("filter change event", () => {
  it("emitFiltersChanged records prev and next", () => {
    emitFiltersChanged({ prevObjectName: "Obj1", nextObjectName: "Obj2" });
    expect(mockLogger.info).toHaveBeenCalledWith("director_reports", "filters_changed", expect.objectContaining({
      prevObjectName: "Obj1",
      nextObjectName: "Obj2",
    }));
    expect(mockObs).toHaveBeenCalledWith(expect.objectContaining({
      event: "director_reports_filters_changed",
      surface: "reports_filters",
    }));
  });
});

describe("commit events", () => {
  it("emitCommitOptions", () => {
    emitCommitOptions({ key: "c1", itemCount: 5, fromCache: true });
    expect(mockObs).toHaveBeenCalledWith(expect.objectContaining({
      event: "director_reports_commit_options",
      rowCount: 5,
    }));
  });

  it("emitCommitReport", () => {
    emitCommitReport({ key: "c1", itemCount: 20 });
    expect(mockObs).toHaveBeenCalledWith(expect.objectContaining({
      event: "director_reports_commit_report",
      rowCount: 20,
    }));
  });

  it("emitCommitDiscipline", () => {
    emitCommitDiscipline({ key: "c1", itemCount: 8 });
    expect(mockObs).toHaveBeenCalledWith(expect.objectContaining({
      event: "director_reports_commit_discipline",
      rowCount: 8,
    }));
  });
});

describe("open reports event", () => {
  it("emitOpenReports", () => {
    emitOpenReports({ key: "o1", objectName: null });
    expect(mockLogger.info).toHaveBeenCalledWith("director_reports", "open_reports", expect.any(Object));
    expect(mockObs).toHaveBeenCalledWith(expect.objectContaining({
      event: "director_reports_open",
      surface: "reports_open",
    }));
  });
});
