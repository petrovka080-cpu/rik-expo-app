import React from "react";
import { Text, TextInput } from "react-native";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import ActivePaymentForm from "./ActivePaymentForm";
import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../../../lib/observability/platformObservability";

const mockSupabase = {
  from: jest.fn(),
};

jest.mock("../../../lib/supabaseClient", () => ({
  supabase: mockSupabase,
}));

const flushAsync = async (times = 4) => {
  for (let index = 0; index < times; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

const flattenText = (value: unknown): string => {
  if (Array.isArray(value)) return value.map(flattenText).join("");
  if (value == null || typeof value === "boolean") return "";
  return String(value);
};

const baseProps = () => ({
  busyKey: null,
  isPayActiveTab: true,
  payAccent: null,
  kbTypeNum: "number-pad" as const,
  current: {
    proposal_id: "proposal-1",
    invoice_currency: "KGS",
    invoice_amount: 1000,
    total_paid: 0,
    invoice_number: "INV-1",
    invoice_date: "2026-03-29",
    supplier: "Supplier",
  },
  supplierName: "",
  invoiceNo: "",
  invoiceDate: "2026-03-29",
  INV_PREFIX: "INV",
  invMM: "03",
  invDD: "29",
  setSupplierName: jest.fn(),
  setInvoiceNo: jest.fn(),
  setInvoiceDate: jest.fn(),
  setInvMM: jest.fn(),
  setInvDD: jest.fn(),
  clamp2: (value: string) => value,
  mmRef: React.createRef<TextInput>(),
  ddRef: React.createRef<TextInput>(),
  scrollInputIntoView: jest.fn(),
  accountantFio: "Бухгалтер",
  setAccountantFio: jest.fn(),
  payKind: "bank" as const,
  setPayKind: jest.fn(),
  amount: "",
  setAmount: jest.fn(),
  note: "",
  setNote: jest.fn(),
  bankName: "",
  setBankName: jest.fn(),
  bik: "",
  setBik: jest.fn(),
  rs: "",
  setRs: jest.fn(),
  inn: "",
  setInn: jest.fn(),
  kpp: "",
  setKpp: jest.fn(),
  allocRows: [] as Array<{ proposal_item_id: string; amount: number }>,
  setAllocRows: jest.fn(),
  onAllocStatus: jest.fn(),
});

describe("ActivePaymentForm", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    const runtime = globalThis as typeof globalThis & { __DEV__?: boolean };
    runtime.__DEV__ = false;
    resetPlatformObservabilityEvents();
    mockSupabase.from.mockReset();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("shows a visible payment data error and keeps allocation status non-ready when loads fail", async () => {
    const proposalItemsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: null,
        error: new Error("proposal items failed"),
      }),
    };
    const allocationsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: null,
        error: new Error("allocation lookup failed"),
      }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "proposal_items") return proposalItemsQuery;
      if (table === "proposal_payment_allocations") return allocationsQuery;
      throw new Error(`Unexpected table ${table}`);
    });

    const props = baseProps();
    let renderer!: ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<ActivePaymentForm {...props} />);
    });
    await flushAsync();

    const renderedText = renderer.root.findAllByType(Text).map((node) => flattenText(node.props.children));
    expect(
      renderedText.some((text) => text.includes("Не удалось подготовить данные для оплаты")),
    ).toBe(true);

    const events = getPlatformObservabilityEvents();
    expect(events.some((event) => event.event === "proposal_items_load_failed")).toBe(true);
    expect(events.some((event) => event.event === "proposal_allocations_load_failed")).toBe(true);

    expect(props.onAllocStatus).toHaveBeenCalled();
    expect(props.onAllocStatus.mock.calls.at(-1)).toEqual([false, 0]);
  });
});
