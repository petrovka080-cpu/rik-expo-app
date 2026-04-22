import type { RequestLookupRow } from "../../src/lib/api/director_reports.shared";

const mockFetchObjectsByIds = jest.fn();
const mockFetchObjectTypeNamesByCode = jest.fn();
const mockFetchSystemNamesByCode = jest.fn();
const mockRecordDirectorReportsTransportWarning = jest.fn();

jest.mock("../../src/lib/api/director_reports.naming", () => ({
  fetchObjectsByIds: (...args: unknown[]) => mockFetchObjectsByIds(...args),
  fetchObjectTypeNamesByCode: (...args: unknown[]) => mockFetchObjectTypeNamesByCode(...args),
  fetchSystemNamesByCode: (...args: unknown[]) => mockFetchSystemNamesByCode(...args),
}));

jest.mock("../../src/lib/api/director_reports.observability", () => ({
  recordDirectorReportsTransportWarning: (...args: unknown[]) =>
    mockRecordDirectorReportsTransportWarning(...args),
}));

const loadSubject = () =>
  require("../../src/lib/api/director_reports.transport.lookups") as typeof import("../../src/lib/api/director_reports.transport.lookups");

const buildRequest = (): RequestLookupRow => ({
  id: "REQ-1",
  request_no: "REQ-1",
  display_no: "REQ-1",
  status: "open",
  object_id: "OBJ-1",
  object_name: "Object 1",
  object_type_code: "TYPE-1",
  system_code: "SYS-1",
  level_code: null,
  zone_code: null,
  object: null,
  submitted_at: null,
  created_at: null,
  note: null,
  comment: null,
  item_count_total: null,
  item_count_active: null,
  item_qty_total: null,
  item_qty_active: null,
});

describe("director request context lookup batch reliability", () => {
  beforeEach(() => {
    jest.resetModules();
    mockFetchObjectsByIds.mockReset();
    mockFetchObjectTypeNamesByCode.mockReset();
    mockFetchSystemNamesByCode.mockReset();
    mockRecordDirectorReportsTransportWarning.mockReset();
  });

  it("returns all lookup maps unchanged when every lookup succeeds", async () => {
    mockFetchObjectsByIds.mockResolvedValue(new Map([["OBJ-1", "Object 1"]]));
    mockFetchObjectTypeNamesByCode.mockResolvedValue(new Map([["TYPE-1", "Type 1"]]));
    mockFetchSystemNamesByCode.mockResolvedValue(new Map([["SYS-1", "System 1"]]));

    const { loadDirectorRequestContextLookups } = loadSubject();
    const result = await loadDirectorRequestContextLookups({
      requests: [buildRequest()],
    });

    expect(Array.from(result.objectNameById.entries())).toEqual([["OBJ-1", "Object 1"]]);
    expect(Array.from(result.objectTypeNameByCode.entries())).toEqual([["TYPE-1", "Type 1"]]);
    expect(Array.from(result.systemNameByCode.entries())).toEqual([["SYS-1", "System 1"]]);
    expect(mockRecordDirectorReportsTransportWarning).not.toHaveBeenCalled();
  });

  it("degrades to an empty optional map when one lookup fails", async () => {
    mockFetchObjectsByIds.mockResolvedValue(new Map([["OBJ-1", "Object 1"]]));
    mockFetchObjectTypeNamesByCode.mockRejectedValue(new Error("type lookup down"));
    mockFetchSystemNamesByCode.mockResolvedValue(new Map([["SYS-1", "System 1"]]));

    const { loadDirectorRequestContextLookups } = loadSubject();
    const result = await loadDirectorRequestContextLookups({
      requests: [buildRequest()],
    });

    expect(Array.from(result.objectNameById.entries())).toEqual([["OBJ-1", "Object 1"]]);
    expect(Array.from(result.objectTypeNameByCode.entries())).toEqual([]);
    expect(Array.from(result.systemNameByCode.entries())).toEqual([["SYS-1", "System 1"]]);
    expect(mockRecordDirectorReportsTransportWarning).toHaveBeenCalledTimes(1);
    expect(mockRecordDirectorReportsTransportWarning).toHaveBeenCalledWith(
      "request_context_lookup_optional_failed",
      expect.objectContaining({ message: "type lookup down" }),
      expect.objectContaining({
        lookup: "objectTypeNameByCode",
        batchStatus: "degraded_success",
        objectIdCount: 1,
        objectTypeCodeCount: 1,
        systemCodeCount: 1,
      }),
    );
  });

  it("keeps resolving independent lookups when multiple optional members fail", async () => {
    mockFetchObjectsByIds.mockRejectedValue(new Error("object lookup down"));
    mockFetchObjectTypeNamesByCode.mockResolvedValue(new Map([["TYPE-1", "Type 1"]]));
    mockFetchSystemNamesByCode.mockRejectedValue(new Error("system lookup down"));

    const { loadDirectorRequestContextLookups } = loadSubject();
    const result = await loadDirectorRequestContextLookups({
      requests: [buildRequest()],
      extraObjectIds: ["OBJ-2"],
    });

    expect(Array.from(result.objectNameById.entries())).toEqual([]);
    expect(Array.from(result.objectTypeNameByCode.entries())).toEqual([["TYPE-1", "Type 1"]]);
    expect(Array.from(result.systemNameByCode.entries())).toEqual([]);
    expect(mockRecordDirectorReportsTransportWarning).toHaveBeenCalledTimes(2);
    expect(mockRecordDirectorReportsTransportWarning).toHaveBeenNthCalledWith(
      1,
      "request_context_lookup_optional_failed",
      expect.objectContaining({ message: "object lookup down" }),
      expect.objectContaining({
        lookup: "objectNameById",
        batchStatus: "degraded_success",
        objectIdCount: 2,
      }),
    );
    expect(mockRecordDirectorReportsTransportWarning).toHaveBeenNthCalledWith(
      2,
      "request_context_lookup_optional_failed",
      expect.objectContaining({ message: "system lookup down" }),
      expect.objectContaining({
        lookup: "systemNameByCode",
        systemCodeCount: 1,
      }),
    );
  });
});
