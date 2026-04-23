import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { BusyLike } from "../../src/lib/pdfRunner";
import {
  normalizeBuyerPdfBusy,
  resolveBuyerPdfBusyBoundary,
  useBuyerDocuments,
} from "../../src/screens/buyer/useBuyerDocuments";
import { useBuyerProposalAttachments } from "../../src/screens/buyer/useBuyerProposalAttachments";

const mockPush = jest.fn();
const mockPrepareAndPreviewPdfDocument = jest.fn();
const mockGenerateBuyerProposalPdfDocument = jest.fn();
const mockGetLatestCanonicalProposalAttachment = jest.fn();
const mockEnsureProposalAttachmentUrl = jest.fn();
const mockOpenAppAttachment = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: (...args: unknown[]) => mockPush(...args),
  }),
}));

jest.mock("../../src/lib/documents/pdfDocumentActions", () => ({
  getPdfFlowErrorMessage: (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback,
  prepareAndPreviewPdfDocument: (...args: unknown[]) =>
    mockPrepareAndPreviewPdfDocument(...args),
}));

jest.mock("../../src/screens/buyer/buyerProposalPdf.service", () => ({
  generateBuyerProposalPdfDocument: (...args: unknown[]) =>
    mockGenerateBuyerProposalPdfDocument(...args),
}));

jest.mock("../../src/lib/api/proposalAttachments.service", () => ({
  ensureProposalAttachmentUrl: (...args: unknown[]) =>
    mockEnsureProposalAttachmentUrl(...args),
  getLatestCanonicalProposalAttachment: (...args: unknown[]) =>
    mockGetLatestCanonicalProposalAttachment(...args),
  listCanonicalProposalAttachments: jest.fn(),
  toProposalAttachmentLegacyRow: (row: unknown) => row,
}));

jest.mock("../../src/lib/documents/attachmentOpener", () => ({
  openAppAttachment: (...args: unknown[]) => mockOpenAppAttachment(...args),
}));

jest.mock("../../src/screens/buyer/buyer.attachments.mutation", () => ({
  attachFileToProposalAction: jest.fn(),
}));

type BuyerDocumentsHarnessResult = ReturnType<typeof useBuyerDocuments> | null;
type BuyerProposalAttachmentsHarnessResult = ReturnType<
  typeof useBuyerProposalAttachments
> | null;

const SUPABASE_STUB = {} as SupabaseClient;

const createBusyOwner = (overrides: Partial<BusyLike> = {}): BusyLike => ({
  run: async <T,>(fn: () => Promise<T>) => await fn(),
  show: jest.fn(),
  hide: jest.fn(),
  isBusy: jest.fn(() => false),
  ...overrides,
});

async function renderBuyerDocumentsHarness(busy: unknown) {
  const capturedRef: { current: BuyerDocumentsHarnessResult } = { current: null };

  function Harness() {
    capturedRef.current = useBuyerDocuments({
      busy,
      supabase: SUPABASE_STUB,
    });
    return null;
  }

  await act(async () => {
    TestRenderer.create(React.createElement(Harness));
  });

  const captured = capturedRef.current;
  if (!captured) {
    throw new Error("Buyer documents hook did not initialize");
  }

  return captured;
}

async function renderBuyerProposalAttachmentsHarness(busy: unknown) {
  const capturedRef: { current: BuyerProposalAttachmentsHarnessResult } = { current: null };

  function Harness() {
    capturedRef.current = useBuyerProposalAttachments({
      supabase: SUPABASE_STUB,
      pickFileAny: async () => null,
      uploadProposalAttachment: async () => {},
      alert: jest.fn(),
      busy,
    });
    return null;
  }

  await act(async () => {
    TestRenderer.create(React.createElement(Harness));
  });

  const captured = capturedRef.current;
  if (!captured) {
    throw new Error("Buyer proposal attachments hook did not initialize");
  }

  return captured;
}

describe("buyer.pdf.busy boundary phase 1 contract", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockPrepareAndPreviewPdfDocument.mockReset();
    mockGenerateBuyerProposalPdfDocument.mockReset();
    mockGetLatestCanonicalProposalAttachment.mockReset();
    mockEnsureProposalAttachmentUrl.mockReset();
    mockOpenAppAttachment.mockReset();
    mockPrepareAndPreviewPdfDocument.mockResolvedValue(undefined);
    mockGenerateBuyerProposalPdfDocument.mockResolvedValue({
      uri: "file://proposal.pdf",
      title: "Proposal",
      fileName: "proposal.pdf",
      documentType: "proposal",
      source: "generated",
      originModule: "buyer",
      mimeType: "application/pdf",
    });
    mockGetLatestCanonicalProposalAttachment.mockResolvedValue({
      row: { id: "att-1" },
    });
    mockEnsureProposalAttachmentUrl.mockResolvedValue(
      "https://example.com/proposal.pdf",
    );
  });

  it("classifies null and undefined as missing instead of drifting into empty payload", () => {
    expect(
      resolveBuyerPdfBusyBoundary({
        busy: null,
        flowKey: "pdf:buyer:test",
      }),
    ).toEqual({
      kind: "missing",
      flowKey: "pdf:buyer:test",
    });

    expect(
      resolveBuyerPdfBusyBoundary({
        busy: undefined,
        flowKey: "pdf:buyer:test",
      }),
    ).toEqual({
      kind: "missing",
      flowKey: "pdf:buyer:test",
    });
  });

  it("keeps an empty payload distinct from missing", () => {
    expect(
      resolveBuyerPdfBusyBoundary({
        busy: {},
        flowKey: "pdf:buyer:test",
      }),
    ).toEqual({
      kind: "invalid",
      flowKey: "pdf:buyer:test",
      reason: "empty_payload",
      errorMessage: "Buyer PDF busy contract is empty",
    });
  });

  it("rejects a partial manual busy payload instead of masking it as loading", () => {
    expect(
      resolveBuyerPdfBusyBoundary({
        busy: {
          show: jest.fn(),
        },
        flowKey: "pdf:buyer:test",
      }),
    ).toEqual({
      kind: "invalid",
      flowKey: "pdf:buyer:test",
      reason: "incomplete_manual_contract",
      errorMessage:
        "Buyer PDF busy manual contract requires both show and hide handlers",
    });
  });

  it("classifies a valid idle contract as ready", () => {
    const busy = createBusyOwner();
    const state = resolveBuyerPdfBusyBoundary({
      busy,
      flowKey: "pdf:buyer:test",
    });

    expect(state).toMatchObject({
      kind: "ready",
      flowKey: "pdf:buyer:test",
      busy: {
        run: busy.run,
        show: busy.show,
        hide: busy.hide,
        isBusy: busy.isBusy,
      },
    });
    expect(normalizeBuyerPdfBusy({ busy, flowKey: "pdf:buyer:test" })).toEqual(
      expect.objectContaining({
        run: busy.run,
        show: busy.show,
        hide: busy.hide,
        isBusy: busy.isBusy,
      }),
    );
  });

  it("keeps loading distinct from invalid when the busy owner is active", () => {
    const busy = createBusyOwner({
      isBusy: jest.fn(() => true),
    });

    expect(
      resolveBuyerPdfBusyBoundary({
        busy,
        flowKey: "pdf:buyer:test",
      }),
    ).toMatchObject({
      kind: "loading",
      flowKey: "pdf:buyer:test",
      busy: expect.objectContaining({
        run: busy.run,
        show: busy.show,
        hide: busy.hide,
        isBusy: busy.isBusy,
      }),
    });
  });

  it("surfaces terminal busy-state inspection failures explicitly", () => {
    const busy = createBusyOwner({
      isBusy: jest.fn(() => {
        throw new Error("busy state unavailable");
      }),
    });

    expect(
      resolveBuyerPdfBusyBoundary({
        busy,
        flowKey: "pdf:buyer:test",
      }),
    ).toEqual({
      kind: "terminal",
      flowKey: "pdf:buyer:test",
      errorMessage: "busy state unavailable",
    });
    expect(normalizeBuyerPdfBusy({ busy, flowKey: "pdf:buyer:test" })).toBeUndefined();
  });

  it("keeps the proposal PDF success path unchanged for a valid busy contract", async () => {
    const busy = createBusyOwner();
    const documents = await renderBuyerDocumentsHarness(busy);

    await act(async () => {
      await documents.openProposalPdf("proposal-42");
    });

    expect(mockPrepareAndPreviewPdfDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "pdf:proposal:proposal-42",
        busy: expect.objectContaining({
          run: busy.run,
          show: busy.show,
          hide: busy.hide,
          isBusy: busy.isBusy,
        }),
      }),
    );
  });

  it("does not forward an invalid busy payload as if it were ready", async () => {
    const documents = await renderBuyerDocumentsHarness({
      show: jest.fn(),
    });

    await act(async () => {
      await documents.openProposalPdf("proposal-43");
    });

    expect(mockPrepareAndPreviewPdfDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "pdf:proposal:proposal-43",
        busy: undefined,
      }),
    );
  });

  it("keeps the attachment PDF success path unchanged for a valid busy contract", async () => {
    const busy = createBusyOwner();
    const attachments = await renderBuyerProposalAttachmentsHarness(busy);

    await act(async () => {
      await attachments.openPropAttachment({
        id: "att-1",
        proposal_id: "proposal-99",
        file_name: "proposal.pdf",
      });
    });

    expect(mockPrepareAndPreviewPdfDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "pdf:buyer:attachment:att-1",
        busy: expect.objectContaining({
          run: busy.run,
          show: busy.show,
          hide: busy.hide,
          isBusy: busy.isBusy,
        }),
      }),
    );
    expect(mockOpenAppAttachment).not.toHaveBeenCalled();
  });
});
