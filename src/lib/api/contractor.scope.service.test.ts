import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../observability/platformObservability";
import { loadContractorInboxScope } from "./contractor.scope.service";

const buildInboxScopeEnvelope = () => ({
  document_type: "contractor_inbox_scope",
  version: "v1",
  rows: [
    {
      workItemId: "work-item-1",
      progressId: "progress-1",
      publicationState: "ready",
      identity: {
        contractorId: "contractor-1",
        contractorName: "Scoped Contractor",
        contractorInn: "12345678901234",
        contractNumber: "CTR-1",
        contractDate: "2026-03-30",
      },
      origin: {
        sourceKind: "foreman_subcontract_request",
        sourceRequestId: "request-1",
        sourceProposalId: null,
        sourceSubcontractId: "sub-1",
        directorApprovedAt: "2026-03-30T10:00:00.000Z",
      },
      work: {
        workItemId: "work-item-1",
        workName: "Scoped Work",
        workNameSource: "snapshot",
        quantity: 2,
        uom: "pcs",
        unitPrice: 100,
        totalAmount: 200,
        isMaterial: false,
      },
      location: {
        objectId: "object-1",
        objectName: "Object A",
        systemName: null,
        zoneName: null,
        floorName: null,
        locationDisplay: "Object A",
      },
      diagnostics: {
        sourceVersion: "v1",
        currentWorkState: "ready_current",
        contractorNameSource: "canonical_view",
        objectNameSource: "canonical_view",
        eligibility: {
          isApprovedWork: true,
          isCurrentVisibleWork: true,
          isLegacyHistoricalRow: false,
          hasHumanTitle: true,
          hasCurrentObjectContext: true,
        },
      },
    },
  ],
  meta: {
    rowsSource: "rpc_scope_v1",
    candidateView: "v_contractor_publication_candidates_v1",
    readyRows: 1,
    scopeReadyCandidates: 1,
    readyCurrentRows: 1,
    readyCurrentDegradedTitle: 0,
    legacyFilteredOut: 0,
    historicalExcluded: 0,
    invalidMissingContractor: 0,
    invalidMissingWorkSnapshot: 0,
    invalidMissingObjectSnapshot: 0,
    invalidMaterialOnly: 0,
  },
});

describe("contractor.scope.service", () => {
  beforeEach(() => {
    resetPlatformObservabilityEvents();
  });

  it("loads contractor inbox scope through the shared transport boundary when rpc depends on this.rest", async () => {
    const supabaseClient = {
      rest: { schema: "public" },
      rpc: jest.fn(function (this: { rest?: { schema?: string } }) {
        if (!this?.rest) {
          throw new TypeError("Cannot read properties of undefined (reading 'rest')");
        }
        return Promise.resolve({
          data: buildInboxScopeEnvelope(),
          error: null,
        });
      }),
    };

    const result = await loadContractorInboxScope({
      supabaseClient: supabaseClient as never,
      myContractorId: "contractor-1",
      isStaff: false,
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.workItemId).toBe("work-item-1");
    expect(result.meta.readyRows).toBe(1);
  });

  it("fails closed on the exact undefined rest regression path and records boundary failure", async () => {
    const supabaseClient = {
      rpc: jest.fn(function () {
        if (!(this as { rest?: unknown })?.rest) {
          throw new TypeError("Cannot read properties of undefined (reading 'rest')");
        }
        return Promise.resolve({
          data: buildInboxScopeEnvelope(),
          error: null,
        });
      }),
    };

    await expect(
      loadContractorInboxScope({
        supabaseClient: supabaseClient as never,
        myContractorId: "contractor-1",
        isStaff: false,
      }),
    ).rejects.toThrow("Cannot read properties of undefined (reading 'rest')");

    expect(getPlatformObservabilityEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          screen: "contractor",
          surface: "inbox_scope",
          event: "rpc_transport_boundary_fail",
          result: "error",
          errorStage: "rpc_transport_call",
          sourceKind: "rpc:contractor_inbox_scope_v1",
          extra: expect.objectContaining({
            owner: "contractor.scope.service",
            rpcName: "contractor_inbox_scope_v1",
          }),
        }),
        expect.objectContaining({
          screen: "contractor",
          surface: "inbox_scope",
          event: "load_inbox_scope",
          result: "error",
          errorStage: "contractor_inbox_scope_v1",
          sourceKind: "rpc:contractor_inbox_scope_v1",
        }),
      ]),
    );
  });
});
