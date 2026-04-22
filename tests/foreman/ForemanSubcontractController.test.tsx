import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Alert, View } from "react-native";

import ForemanSubcontractTab from "../../src/screens/foreman/ForemanSubcontractTab";
import { useForemanSubcontractUiStore } from "../../src/screens/foreman/foremanSubcontractUi.store";
import type { ReqItemRow } from "../../src/lib/catalog_api";
import type { Subcontract } from "../../src/screens/subcontracts/subcontracts.shared";

let mockLatestMainSectionsProps: React.ComponentProps<
  typeof import("../../src/screens/foreman/ForemanSubcontractTab.sections").ForemanSubcontractMainSections
> | null = null;
let mockLatestModalStackProps: React.ComponentProps<
  typeof import("../../src/screens/foreman/ForemanSubcontractTab.sections").ForemanSubcontractModalStack
> | null = null;

const mockGetUser = jest.fn();
const mockListForemanSubcontracts = jest.fn();
const mockListRequestItems = jest.fn();
const mockUpdateRequestMeta = jest.fn();
const mockSyncForemanAtomicDraft = jest.fn();
const mockFindLatestDraftRequestByLink = jest.fn();
const mockFetchForemanRequestDisplayLabel = jest.fn();
const mockReadForemanProfileName = jest.fn();
const mockFetchHistory = jest.fn();
const mockCloseHistory = jest.fn();
const mockPrepareAndPreviewPdf = jest.fn();
const mockRouterPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: (...args: unknown[]) => mockRouterPush(...args),
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 12, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  },
}));

jest.mock("../../src/lib/catalog_api", () => ({
  rikQuickSearch: jest.fn(async () => []),
  updateRequestMeta: (...args: unknown[]) => mockUpdateRequestMeta(...args),
  listRequestItems: (...args: unknown[]) => mockListRequestItems(...args),
}));

jest.mock("../../src/screens/foreman/foreman.draftSync.repository", () => ({
  mapReqItemsToDraftSyncLines: (items: ReqItemRow[]) =>
    (items || []).map((item) => ({
      request_item_id: item.id,
      rik_code: item.rik_code,
      qty: Number(item.qty ?? 0),
      note: item.note ?? null,
      app_code: item.app_code ?? null,
      kind: null,
      name_human: item.name_human,
      uom: item.uom,
    })),
  syncForemanAtomicDraft: (...args: unknown[]) => mockSyncForemanAtomicDraft(...args),
}));

jest.mock("../../src/screens/subcontracts/subcontracts.shared", () => ({
  fmtAmount: (value: unknown) => String(value ?? ""),
  listForemanSubcontracts: (...args: unknown[]) => mockListForemanSubcontracts(...args),
}));

jest.mock("../../src/screens/foreman/foreman.requests", () => ({
  fetchForemanRequestDisplayLabel: (...args: unknown[]) => mockFetchForemanRequestDisplayLabel(...args),
  findLatestDraftRequestByLink: (...args: unknown[]) => mockFindLatestDraftRequestByLink(...args),
}));

jest.mock("../../src/screens/foreman/foreman.dicts.repo", () => ({
  readForemanProfileName: (...args: unknown[]) => mockReadForemanProfileName(...args),
}));

jest.mock("../../src/screens/foreman/hooks/useForemanHistory", () => ({
  useForemanHistory: () => ({
    historyRequests: [],
    historyLoading: false,
    historyVisible: false,
    fetchHistory: (...args: unknown[]) => mockFetchHistory(...args),
    closeHistory: (...args: unknown[]) => mockCloseHistory(...args),
  }),
}));

jest.mock("../../src/lib/pdf/pdf.runner", () => ({
  prepareAndPreviewGeneratedPdfFromDescriptorFactory: (...args: unknown[]) =>
    mockPrepareAndPreviewPdf(...args),
}));

jest.mock("../../src/lib/documents/pdfDocument", () => ({
  buildPdfFileName: () => "file.pdf",
}));

jest.mock("../../src/screens/foreman/foreman.requestPdf.service", () => ({
  buildForemanRequestPdfDescriptor: jest.fn(async () => ({
    html: "<html></html>",
    title: "PDF",
    documentType: "request",
  })),
}));

jest.mock("../../src/screens/foreman/ForemanSubcontractTab.sections", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ForemanSubcontractMainSections: (props: Record<string, unknown>) => {
      mockLatestMainSectionsProps = props as React.ComponentProps<
        typeof import("../../src/screens/foreman/ForemanSubcontractTab.sections").ForemanSubcontractMainSections
      >;
      return React.createElement(View, { testID: "foreman-subcontract-main-sections" });
    },
    ForemanSubcontractModalStack: (props: Record<string, unknown>) => {
      mockLatestModalStackProps = props as React.ComponentProps<
        typeof import("../../src/screens/foreman/ForemanSubcontractTab.sections").ForemanSubcontractModalStack
      >;
      return React.createElement(View, { testID: "foreman-subcontract-modal-stack" });
    },
  };
});

const subcontract: Subcontract = {
  id: "sub-1",
  created_at: "2026-04-01T10:00:00.000Z",
  status: "approved",
  foreman_name: "Foreman One",
  contractor_org: "Acme Build",
  contractor_inn: null,
  contractor_rep: null,
  contractor_phone: "+996700000001",
  contract_number: "CNT-1",
  contract_date: "2026-04-01",
  object_name: "Object A",
  work_zone: "Level 1",
  work_type: "Ventilation",
  qty_planned: 12,
  uom: "m2",
  date_start: "2026-04-05",
  date_end: "2026-04-30",
  work_mode: "mixed",
  price_per_unit: 100,
  total_price: 1200,
  price_type: "by_volume",
  foreman_comment: null,
  director_comment: null,
};

const requestItems: ReqItemRow[] = [
  {
    id: "item-1",
    request_id: "req-7",
    rik_code: "R-1",
    name_human: "Cable",
    qty: 2,
    uom: "m",
    status: "draft",
    supplier_hint: null,
    app_code: null,
    note: null,
    line_no: 1,
  },
];

async function flushAsyncWork(cycles = 3) {
  for (let index = 0; index < cycles; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

describe("Foreman subcontract controller regression", () => {
  let renderer: TestRenderer.ReactTestRenderer | null = null;

  beforeEach(() => {
    mockLatestMainSectionsProps = null;
    mockLatestModalStackProps = null;
    mockGetUser.mockReset();
    mockListForemanSubcontracts.mockReset();
    mockListRequestItems.mockReset();
    mockUpdateRequestMeta.mockReset();
    mockSyncForemanAtomicDraft.mockReset();
    mockFindLatestDraftRequestByLink.mockReset();
    mockFetchForemanRequestDisplayLabel.mockReset();
    mockReadForemanProfileName.mockReset();
    mockFetchHistory.mockReset();
    mockCloseHistory.mockReset();
    mockPrepareAndPreviewPdf.mockReset();
    mockRouterPush.mockReset();

    useForemanSubcontractUiStore.setState({
      historyOpen: false,
      subcontractFlowOpen: false,
      subcontractFlowScreen: "details",
      selectedWorkType: null,
      dateTarget: null,
      selectedTemplateId: null,
    });

    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          user_metadata: { full_name: "Foreman One" },
        },
      },
    });
    mockListForemanSubcontracts.mockResolvedValue([subcontract]);
    mockFindLatestDraftRequestByLink.mockResolvedValue({
      id: "req-7",
      display_no: "REQ-7",
      request_no: null,
      status: "draft",
      subcontract_id: "sub-1",
      contractor_job_id: "sub-1",
      created_at: "2026-04-02T10:00:00.000Z",
    });
    mockListRequestItems.mockResolvedValue(requestItems);
    mockUpdateRequestMeta.mockResolvedValue(true);
    mockSyncForemanAtomicDraft.mockResolvedValue({
      request: {
        id: "req-7",
        display_no: "REQ-7",
      },
      items: requestItems,
      submitted: true,
      branchMeta: {
        rpcVersion: "v1",
      },
    });
    mockReadForemanProfileName.mockResolvedValue("Foreman One");
  });

  afterEach(async () => {
    if (!renderer) return;
    await act(async () => {
      renderer?.unmount();
    });
    renderer = null;
  });

  it("hydrates approved subcontract drafts without changing request/draft semantics", async () => {
    await act(async () => {
      renderer = TestRenderer.create(
        <ForemanSubcontractTab
          contentTopPad={16}
          onScroll={() => {}}
          dicts={{
            objOptions: [{ code: "OBJ", name: "Object A" }],
            lvlOptions: [{ code: "L1", name: "Level 1" }],
            sysOptions: [{ code: "SYS", name: "Ventilation" }],
          }}
        />,
      );
    });

    await flushAsyncWork();

    expect(mockLatestMainSectionsProps?.approvedContracts).toEqual([subcontract]);

    await act(async () => {
      await mockLatestMainSectionsProps?.onSelectApprovedContract?.(subcontract);
    });

    await flushAsyncWork();

    expect(mockLatestModalStackProps?.templateContract?.id).toBe("sub-1");
    expect(mockLatestModalStackProps?.displayNo).toBe("REQ-7");
    expect(mockLatestModalStackProps?.requestId).toBe("req-7");
    expect(mockLatestModalStackProps?.draftItems).toEqual(requestItems);
    expect(mockLatestModalStackProps?.subcontractDetailsVisible).toBe(true);
  });

  it("keeps display label stable when request-label refresh fails and preserves submit orchestration", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockFetchForemanRequestDisplayLabel.mockRejectedValue(new Error("request_no missing"));

    await act(async () => {
      renderer = TestRenderer.create(
        <ForemanSubcontractTab
          contentTopPad={16}
          onScroll={() => {}}
          dicts={{
            objOptions: [{ code: "OBJ", name: "Object A" }],
            lvlOptions: [{ code: "L1", name: "Level 1" }],
            sysOptions: [{ code: "SYS", name: "Ventilation" }],
          }}
        />,
      );
    });

    await flushAsyncWork();

    await act(async () => {
      await mockLatestMainSectionsProps?.onSelectApprovedContract?.(subcontract);
    });

    await flushAsyncWork(4);

    expect(mockLatestModalStackProps?.displayNo).toBe("REQ-7");
    expect(warnSpy).toHaveBeenCalledWith(
      "[ForemanSubcontractTab] request label refresh failed:",
      expect.any(Error),
    );

    await act(async () => {
      await mockLatestModalStackProps?.onSendToDirector?.();
    });

    await flushAsyncWork();

    expect(mockSyncForemanAtomicDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        mutationKind: "submit",
        submit: true,
        requestId: "req-7",
      }),
    );
    expect(alertSpy).toHaveBeenCalledWith("Успешно", "Заявка отправлена директору.");
    expect(mockLatestModalStackProps?.subcontractDetailsVisible).toBe(false);

    warnSpy.mockRestore();
    alertSpy.mockRestore();
  });
});
