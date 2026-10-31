import { fetchRequestDetails, updateRequestMeta } from "./catalog.request.service";
import { mapRequestRow } from "../api/requests.parsers";
import { mapDetailsFromRow, mapSummaryFromRow } from "./catalog.request.mapping";
const mockUpdate = jest.fn(); const mockDetails = jest.fn();
jest.mock("./catalog.request.transport", () => ({
  updateCatalogRequestRow: (...args: unknown[]) => mockUpdate(...args),
  loadCatalogRequestDetailsRowById: (...args: unknown[]) => mockDetails(...args),
}));
jest.mock("../api/requests", () => ({ clearCachedDraftRequestId: () => {}, getOrCreateDraftRequestId: jest.fn() }));
const B = "22222222-2222-2222-2222-222222222222";
beforeEach(() => { mockUpdate.mockReset(); mockDetails.mockReset(); });
it.each(["REQUEST_LINKED_CONTRACT_COMPANY_UNPROVEN", "REQUEST_ACTOR_MFA_REQUIRED", "REQUEST_LIFECYCLE_IMMUTABLE", "permission denied", "timeout", "column unavailable"]) ("never masks whole-patch refusal %s with a base-only update", async message => {
  mockUpdate.mockResolvedValueOnce({ error: { code: "42501", message } }).mockResolvedValue({ error: null });
  await expect(updateRequestMeta("request-A", { comment: "new", subcontract_id: "link-B" })).rejects.toMatchObject({ code: "42501", message });
  expect(mockUpdate).toHaveBeenCalledTimes(1);
  expect(mockUpdate).toHaveBeenCalledWith("request-A", { comment: "new", subcontract_id: "link-B" });
});
it("saves the complete supported patch exactly once", async () => {
  mockUpdate.mockResolvedValue({ error: null });
  expect(await updateRequestMeta("request-A", { comment: "new", subcontract_id: "link-A" })).toBe(true);
  expect(mockUpdate).toHaveBeenCalledTimes(1);
});
it("retains company B in the unmocked creation parser, details and cold details select", async () => {
  const raw = { id: "request-A", company_id: B, status: "draft" };
  expect(mapRequestRow(raw)?.company_id).toBe(B);
  expect(mapDetailsFromRow(raw)?.company_id).toBe(B);
  expect(mapSummaryFromRow(raw)?.company_id).toBe(B);
  mockDetails.mockResolvedValue({ data: raw, error: null });
  expect((await fetchRequestDetails("request-A"))?.company_id).toBe(B);
  expect(mockDetails.mock.calls[0][0].split(",").map((s: string) => s.trim())).toContain("company_id");
  expect(mapRequestRow({ ...raw, company_id: null })?.company_id).toBeNull();
  expect(mapDetailsFromRow({ ...raw, company_id: null })?.company_id).toBeNull();
  expect(() => mapRequestRow({ ...raw, company_id: "first membership" })).toThrow("EXPLICIT_COMPANY_REQUIRED");
});
