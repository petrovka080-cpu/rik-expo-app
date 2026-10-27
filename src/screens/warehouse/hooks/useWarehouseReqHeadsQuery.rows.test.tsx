import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { apiFetchReqHeadsWindow } from "../warehouse.requests.read";
import { warehouseReqHeadsKeys } from "./warehouseReqHeads.query.key";
import { useWarehouseReqHeadsQuery } from "./useWarehouseReqHeadsQuery";

jest.mock("../warehouse.requests.read", () => ({
  apiFetchReqHeadsWindow: jest.fn(),
}));

const mockApiFetchReqHeadsWindow =
  apiFetchReqHeadsWindow as jest.MockedFunction<typeof apiFetchReqHeadsWindow>;

const createReqHeadsPage = () =>
  ({
    rows: [
      {
        request_id: "REQ-1",
        display_no: "REQ-1",
      },
    ],
    meta: {
      page: 0,
      pageSize: 80,
      pageOffset: 0,
      returnedRowCount: 1,
      totalRowCount: 1,
      hasMore: false,
      scopeKey: "test:req-heads",
      contractVersion: "v4",
      generatedAt: "2026-04-17T00:00:00.000Z",
      repairedMissingIdsCount: 0,
    },
    sourceMeta: {
      primaryOwner: "canonical_issue_queue_rpc",
      sourcePath: "canonical",
      fallbackUsed: false,
      sourceKind: "rpc:warehouse_issue_queue_scope_v4",
      contractVersion: "v4",
      reason: null,
    },
    integrityState: {
      mode: "healthy",
      failureClass: null,
      freshness: "fresh",
      reason: null,
      message: null,
      cacheUsed: false,
      cooldownActive: false,
      cooldownReason: null,
    },
    metrics: {
      stage_a_ms: 0,
      stage_b_ms: 0,
      fallback_missing_ids_count: 0,
      enriched_rows_count: 1,
      page0_required_repair: false,
    },
  }) as Awaited<ReturnType<typeof apiFetchReqHeadsWindow>>;

function Harness(props: {
  nonce: number;
  onSnapshot: (snapshot: ReturnType<typeof useWarehouseReqHeadsQuery>) => void;
}) {
  void props.nonce;
  const snapshot = useWarehouseReqHeadsQuery({
    supabase: {} as never,
    pageSize: 80,
    enabled: true,
  });
  props.onSnapshot(snapshot);
  return null;
}

describe("useWarehouseReqHeadsQuery rows identity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("keeps the flattened rows reference stable across unrelated renders", () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          gcTime: Infinity,
          retry: false,
        },
      },
    });
    queryClient.setQueryData(warehouseReqHeadsKeys.page(80), {
      pages: [createReqHeadsPage()],
      pageParams: [0],
    });
    const snapshots: ReturnType<typeof useWarehouseReqHeadsQuery>[] = [];

    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <QueryClientProvider client={queryClient}>
          <Harness
            nonce={0}
            onSnapshot={(snapshot) => snapshots.push(snapshot)}
          />
        </QueryClientProvider>,
      );
    });

    const firstRows = snapshots[snapshots.length - 1]?.rows;
    expect(firstRows).toHaveLength(1);

    act(() => {
      renderer.update(
        <QueryClientProvider client={queryClient}>
          <Harness
            nonce={1}
            onSnapshot={(snapshot) => snapshots.push(snapshot)}
          />
        </QueryClientProvider>,
      );
    });

    const latestRows = snapshots[snapshots.length - 1]?.rows;
    expect(latestRows).toBe(firstRows);
    expect(mockApiFetchReqHeadsWindow).not.toHaveBeenCalled();
    act(() => {
      renderer.unmount();
    });
    queryClient.clear();
  });
});
