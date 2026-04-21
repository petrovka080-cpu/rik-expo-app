import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { useBuyerAccountingModal } from "../../src/screens/buyer/hooks/useBuyerAccountingModal";
import {
  repoGetLatestProposalPdfAttachment,
  repoGetProposalItemsForAccounting,
  repoGetSupplierCardByName,
} from "../../src/screens/buyer/buyer.repo";
import { reportAndSwallow } from "../../src/lib/observability/catchDiscipline";
import { recordPlatformObservability } from "../../src/lib/observability/platformObservability";

jest.mock("../../src/screens/buyer/buyer.repo", () => ({
  repoGetLatestProposalPdfAttachment: jest.fn(),
  repoGetProposalItemsForAccounting: jest.fn(),
  repoGetSupplierCardByName: jest.fn(),
}));

jest.mock("../../src/lib/observability/catchDiscipline", () => ({
  reportAndSwallow: jest.fn(),
}));

jest.mock("../../src/lib/observability/platformObservability", () => ({
  recordPlatformObservability: jest.fn(),
}));

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

const createDeferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
};

const flushAsync = async (times = 4) => {
  for (let index = 0; index < times; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

const mockRepoGetLatestProposalPdfAttachment =
  repoGetLatestProposalPdfAttachment as jest.MockedFunction<
    typeof repoGetLatestProposalPdfAttachment
  >;
const mockRepoGetProposalItemsForAccounting =
  repoGetProposalItemsForAccounting as jest.MockedFunction<
    typeof repoGetProposalItemsForAccounting
  >;
const mockRepoGetSupplierCardByName =
  repoGetSupplierCardByName as jest.MockedFunction<
    typeof repoGetSupplierCardByName
  >;
const mockReportAndSwallow =
  reportAndSwallow as jest.MockedFunction<typeof reportAndSwallow>;
const mockRecordPlatformObservability =
  recordPlatformObservability as jest.MockedFunction<
    typeof recordPlatformObservability
  >;

describe("useBuyerAccountingModal async ownership", () => {
  beforeEach(() => {
    const runtime = globalThis as typeof globalThis & { __DEV__?: boolean };
    runtime.__DEV__ = false;
    jest.clearAllMocks();
  });

  it("keeps only the latest modal open request as the active owner", async () => {
    const latestOne = createDeferred<{ id: string; file_name: string } | null>();
    const latestTwo = createDeferred<{ id: string; file_name: string } | null>();
    const itemsTwo = createDeferred<{ supplier: string; qty: number; price: number }[]>();
    const supplierTwo = createDeferred<{
      name: string;
      inn: string | null;
      bank_account: string | null;
      phone: string | null;
      email: string | null;
    } | null>();
    const prefillSignals: AbortSignal[] = [];

    mockRepoGetLatestProposalPdfAttachment.mockImplementation(
      async (_supabase, proposalId: string) => {
        if (proposalId === "proposal-1") return latestOne.promise;
        if (proposalId === "proposal-2") return latestTwo.promise;
        throw new Error(`Unexpected proposal ${proposalId}`);
      },
    );
    mockRepoGetProposalItemsForAccounting.mockImplementation(
      (_supabase, proposalId: string, options?: { signal?: AbortSignal | null }) => {
        const signal = options?.signal ?? new AbortController().signal;
        prefillSignals.push(signal);
        if (proposalId === "proposal-1") {
          return new Promise((_, reject) => {
            signal.addEventListener(
              "abort",
              () => reject(signal.reason ?? new Error("aborted")),
              { once: true },
            );
          });
        }
        if (proposalId === "proposal-2") return itemsTwo.promise;
        throw new Error(`Unexpected proposal ${proposalId}`);
      },
    );
    mockRepoGetSupplierCardByName.mockImplementation(
      async (_supabase, supplierName: string) => {
        if (supplierName === "Supplier Two") return supplierTwo.promise;
        throw new Error(`Unexpected supplier ${supplierName}`);
      },
    );

    const setPropDocBusy = jest.fn();
    const setPropDocAttached = jest.fn();
    const setInvAmount = jest.fn();
    const setAcctSupp = jest.fn();
    const setAcctProposalId = jest.fn();
    const setInvNumber = jest.fn();
    const setInvDate = jest.fn();
    const setInvCurrency = jest.fn();
    const setInvFile = jest.fn();
    const openAccountingSheet = jest.fn();

    let api: ReturnType<typeof useBuyerAccountingModal> | null = null;
    function Harness() {
      api = useBuyerAccountingModal({
        supabase: {} as never,
        buildProposalPdfHtml: jest.fn(async () => "<html />"),
        uploadProposalAttachment: jest.fn(async () => undefined),
        setPropDocBusy,
        setPropDocAttached,
        setInvAmount,
        setAcctSupp,
        setAcctProposalId,
        setInvNumber,
        setInvDate,
        setInvCurrency,
        setInvFile,
        openAccountingSheet,
      });
      return null;
    }

    act(() => {
      TestRenderer.create(<Harness />);
    });

    act(() => {
      api!.openAccountingModal("proposal-1");
    });
    await flushAsync(1);

    act(() => {
      api!.openAccountingModal("proposal-2");
    });
    await flushAsync(1);

    latestTwo.resolve({ id: "att-2", file_name: "proposal-2.html" });
    itemsTwo.resolve([{ supplier: "Supplier Two", qty: 2, price: 10 }]);
    supplierTwo.resolve({
      name: "Supplier Two",
      inn: "123",
      bank_account: "bank-2",
      phone: null,
      email: null,
    });
    latestOne.resolve({ id: "att-1", file_name: "proposal-1.html" });
    await flushAsync();

    expect(prefillSignals).toHaveLength(2);
    expect(prefillSignals[0]?.aborted).toBe(true);
    expect(prefillSignals[1]?.aborted).toBe(false);
    expect(setPropDocAttached.mock.calls.at(-1)?.[0]).toEqual({ name: "proposal-2.html" });
    expect(setInvAmount.mock.calls.at(-1)?.[0]).toBe("20");
    expect(setAcctSupp.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        name: "Supplier Two",
        inn: "123",
        bank: "bank-2",
      }),
    );
    expect(mockReportAndSwallow).not.toHaveBeenCalled();
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "buyer",
        surface: "accounting_modal",
        result: "skipped",
      }),
    );
  });

  it("aborts active reads on unmount and drops late commits", async () => {
    const latest = createDeferred<{ id: string; file_name: string } | null>();
    let prefillSignal: AbortSignal | null | undefined;
    mockRepoGetLatestProposalPdfAttachment.mockReturnValue(latest.promise);
    mockRepoGetProposalItemsForAccounting.mockImplementation(
      (_supabase, _proposalId: string, options?: { signal?: AbortSignal | null }) => {
        prefillSignal = options?.signal ?? null;
        return new Promise((_, reject) => {
          prefillSignal?.addEventListener(
            "abort",
            () => reject(prefillSignal?.reason ?? new Error("aborted")),
            { once: true },
          );
        });
      },
    );
    mockRepoGetSupplierCardByName.mockResolvedValue(null);

    const setPropDocBusy = jest.fn();
    const setPropDocAttached = jest.fn();
    const setInvAmount = jest.fn();
    const setAcctSupp = jest.fn();
    const setAcctProposalId = jest.fn();
    const setInvNumber = jest.fn();
    const setInvDate = jest.fn();
    const setInvCurrency = jest.fn();
    const setInvFile = jest.fn();
    const openAccountingSheet = jest.fn();

    let api: ReturnType<typeof useBuyerAccountingModal> | null = null;
    function Harness() {
      api = useBuyerAccountingModal({
        supabase: {} as never,
        buildProposalPdfHtml: jest.fn(async () => "<html />"),
        uploadProposalAttachment: jest.fn(async () => undefined),
        setPropDocBusy,
        setPropDocAttached,
        setInvAmount,
        setAcctSupp,
        setAcctProposalId,
        setInvNumber,
        setInvDate,
        setInvCurrency,
        setInvFile,
        openAccountingSheet,
      });
      return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<Harness />);
    });

    act(() => {
      api!.openAccountingModal("proposal-1");
    });
    await flushAsync(1);

    setPropDocBusy.mockClear();
    setPropDocAttached.mockClear();
    setInvAmount.mockClear();
    setAcctSupp.mockClear();

    act(() => {
      renderer.unmount();
    });
    latest.resolve({ id: "att-1", file_name: "proposal-1.html" });
    await flushAsync();

    expect(prefillSignal?.aborted).toBe(true);
    expect(setPropDocBusy).not.toHaveBeenCalled();
    expect(setPropDocAttached).not.toHaveBeenCalled();
    expect(setInvAmount).not.toHaveBeenCalled();
    expect(setAcctSupp).not.toHaveBeenCalled();
    expect(mockReportAndSwallow).not.toHaveBeenCalled();
  });
});
