import React from "react";
import { Text, TextInput } from "react-native";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import ActivePaymentForm from "./ActivePaymentForm";
import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../../../lib/observability/platformObservability";

jest.mock("../../../lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const { supabase: mockSupabase } = jest.requireMock("../../../lib/supabaseClient") as {
  supabase: {
    from: jest.Mock;
  };
};

type QueryResult = {
  data: unknown;
  error: Error | null;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

const deferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
};

const flushAsync = async (times = 6) => {
  for (let index = 0; index < times; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

const waitForCondition = async (
  predicate: () => boolean,
  attempts = 20,
  debug?: () => unknown,
) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (predicate()) return;
    await flushAsync(2);
  }
  throw new Error(
    `Condition was not met in time: ${JSON.stringify(debug ? debug() : null)}`,
  );
};

const flattenText = (value: unknown): string => {
  if (Array.isArray(value)) return value.map(flattenText).join("");
  if (value == null || typeof value === "boolean") return "";
  return String(value);
};

const readTextByTestId = (renderer: ReactTestRenderer, testID: string) =>
  flattenText(renderer.root.findByProps({ testID }).props.children);

const readJsonByTestId = <T,>(renderer: ReactTestRenderer, testID: string): T =>
  JSON.parse(readTextByTestId(renderer, testID)) as T;

const baseCurrent = (overrides?: Record<string, unknown>) => ({
  proposal_id: "proposal-1",
  invoice_currency: "KGS",
  invoice_amount: 130,
  total_paid: 20,
  invoice_number: "INV-1",
  invoice_date: "2026-03-29",
  supplier: "Supplier",
  ...overrides,
});

function PaymentFormHarness(props: {
  current: ReturnType<typeof baseCurrent> | null;
  onAllocStatus?: jest.Mock;
  nonce?: number;
}) {
  const [supplierName, setSupplierName] = React.useState("");
  const [invoiceNo, setInvoiceNo] = React.useState("");
  const [invoiceDate, setInvoiceDate] = React.useState("2026-03-29");
  const [invMM, setInvMM] = React.useState("03");
  const [invDD, setInvDD] = React.useState("29");
  const [accountantFio, setAccountantFio] = React.useState("Р‘СѓС…РіР°Р»С‚РµСЂ");
  const [payKind, setPayKind] = React.useState<"bank" | "cash">("bank");
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");
  const [bankName, setBankName] = React.useState("");
  const [bik, setBik] = React.useState("");
  const [rs, setRs] = React.useState("");
  const [inn, setInn] = React.useState("");
  const [kpp, setKpp] = React.useState("");
  const [allocRows, setAllocRows] = React.useState<Array<{ proposal_item_id: string; amount: number }>>([]);
  const [allocStatus, setAllocStatus] = React.useState({ ok: true, sum: 0 });

  return (
    <>
      <ActivePaymentForm
        busyKey={null}
        isPayActiveTab
        payAccent={null}
        kbTypeNum="number-pad"
        current={props.current}
        supplierName={supplierName}
        invoiceNo={invoiceNo}
        invoiceDate={invoiceDate}
        INV_PREFIX="INV"
        invMM={invMM}
        invDD={invDD}
        setSupplierName={setSupplierName}
        setInvoiceNo={setInvoiceNo}
        setInvoiceDate={setInvoiceDate}
        setInvMM={setInvMM}
        setInvDD={setInvDD}
        clamp2={(value: string) => value}
        mmRef={React.createRef<TextInput>()}
        ddRef={React.createRef<TextInput>()}
        scrollInputIntoView={jest.fn()}
        accountantFio={accountantFio}
        setAccountantFio={setAccountantFio}
        payKind={payKind}
        setPayKind={setPayKind}
        amount={amount}
        setAmount={setAmount}
        note={note}
        setNote={setNote}
        bankName={bankName}
        setBankName={setBankName}
        bik={bik}
        setBik={setBik}
        rs={rs}
        setRs={setRs}
        inn={inn}
        setInn={setInn}
        kpp={kpp}
        setKpp={setKpp}
        allocRows={allocRows}
        setAllocRows={setAllocRows}
        onAllocStatus={(ok, sum) => {
          setAllocStatus({ ok, sum });
          props.onAllocStatus?.(ok, sum);
        }}
      />
      <Text testID="harness-amount">{amount}</Text>
      <Text testID="harness-alloc-rows">{JSON.stringify(allocRows)}</Text>
      <Text testID="harness-alloc-status">{JSON.stringify(allocStatus)}</Text>
      <Text testID="harness-render-nonce">{String(props.nonce ?? 0)}</Text>
    </>
  );
}

const configurePaymentQueries = (params: {
  itemResponse: (proposalId: string) => QueryResult | Promise<QueryResult>;
  allocationResponse: (proposalId: string) => QueryResult | Promise<QueryResult>;
}) => {
  const proposalItemsQuery = {
    proposalId: "",
    select: jest.fn(function select() {
      return proposalItemsQuery;
    }),
    eq: jest.fn(function eq(_column: string, proposalId: string) {
      proposalItemsQuery.proposalId = String(proposalId);
      return proposalItemsQuery;
    }),
    order: jest.fn().mockImplementation(() => Promise.resolve(params.itemResponse(proposalItemsQuery.proposalId))),
  };

  const allocationsQuery = {
    select: jest.fn(function select() {
      return allocationsQuery;
    }),
    eq: jest.fn().mockImplementation((_column: string, proposalId: string) =>
      Promise.resolve(params.allocationResponse(String(proposalId))),
    ),
  };

  mockSupabase.from.mockImplementation((table: string) => {
    if (table === "proposal_items") return proposalItemsQuery;
    if (table === "proposal_payment_allocations") return allocationsQuery;
    throw new Error(`Unexpected table ${table}`);
  });

  return { proposalItemsQuery, allocationsQuery };
};

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
    configurePaymentQueries({
      itemResponse: async () => ({
        data: null,
        error: new Error("proposal items failed"),
      }),
      allocationResponse: async () => ({
        data: null,
        error: new Error("allocation lookup failed"),
      }),
    });

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<PaymentFormHarness current={baseCurrent()} />);
    });
    await flushAsync();

    expect(() => renderer.root.findByProps({ testID: "payment-form-data-error" })).not.toThrow();

    const events = getPlatformObservabilityEvents();
    expect(events.some((event) => event.event === "proposal_items_load_failed")).toBe(true);
    expect(events.some((event) => event.event === "proposal_allocations_load_failed")).toBe(true);

    expect(readJsonByTestId<{ ok: boolean; sum: number }>(renderer, "harness-alloc-status")).toEqual({
      ok: false,
      sum: 0,
    });
  });

  it("opens, loads, and reaches ready state without stale placeholders", async () => {
    configurePaymentQueries({
      itemResponse: async () => ({
        data: [{ id: "item-1", name_human: "Ready item", qty: 1, price: 20, uom: "pcs", rik_code: "MAT-1" }],
        error: null,
      }),
      allocationResponse: async () => ({ data: [], error: null }),
    });

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<PaymentFormHarness current={baseCurrent({ total_paid: 0, invoice_amount: 20 })} />);
    });
    await waitForCondition(
      () => getPlatformObservabilityEvents().some((event) => event.event === "payment_form_ready"),
      20,
      () =>
        getPlatformObservabilityEvents().map((event) => ({
          event: event.event,
          result: event.result,
          errorMessage: event.errorMessage ?? null,
        })),
    );

    expect(readTextByTestId(renderer, "payment-form-rest")).toContain("20.00");
    expect(
      getPlatformObservabilityEvents().some(
        (event) => event.event === "payment_form_load" && event.result === "success",
      ),
    ).toBe(true);
  });

  it("cancels in-flight loads on immediate close without stale state updates", async () => {
    const itemDeferred = deferred<QueryResult>();
    const allocationDeferred = deferred<QueryResult>();

    configurePaymentQueries({
      itemResponse: () => itemDeferred.promise,
      allocationResponse: () => allocationDeferred.promise,
    });

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<PaymentFormHarness current={baseCurrent()} />);
    });
    await flushAsync(1);

    await act(async () => {
      renderer.unmount();
    });

    itemDeferred.resolve({
      data: [
        { id: "stale-item", name_human: "Stale item", qty: 1, price: 10, uom: "pcs", rik_code: "MAT-STALE" },
      ],
      error: null,
    });
    allocationDeferred.resolve({ data: [], error: null });
    await flushAsync();

    const events = getPlatformObservabilityEvents();
    expect(events.some((event) => event.event === "payment_form_request_canceled")).toBe(true);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("ignores stale responses after quick reopen and publishes only fresh rows", async () => {
    const itemDeferred1 = deferred<QueryResult>();
    const allocationDeferred1 = deferred<QueryResult>();
    const itemDeferred2 = deferred<QueryResult>();
    const allocationDeferred2 = deferred<QueryResult>();

    configurePaymentQueries({
      itemResponse: (proposalId) => {
        if (proposalId === "proposal-1") return itemDeferred1.promise;
        if (proposalId === "proposal-2") return itemDeferred2.promise;
        throw new Error(`Unexpected proposal for items: ${proposalId}`);
      },
      allocationResponse: (proposalId) => {
        if (proposalId === "proposal-1") return allocationDeferred1.promise;
        if (proposalId === "proposal-2") return allocationDeferred2.promise;
        throw new Error(`Unexpected proposal for allocations: ${proposalId}`);
      },
    });

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<PaymentFormHarness current={baseCurrent({ proposal_id: "proposal-1" })} />);
    });
    await flushAsync(1);

    await act(async () => {
      renderer.update(<PaymentFormHarness current={baseCurrent({ proposal_id: "proposal-2", invoice_number: "INV-2" })} />);
    });

    itemDeferred1.resolve({
      data: [{ id: "item-stale", name_human: "Stale item", qty: 1, price: 10, uom: "pcs", rik_code: "MAT-ST" }],
      error: null,
    });
    allocationDeferred1.resolve({ data: [], error: null });
    await flushAsync();

    itemDeferred2.resolve({
      data: [{ id: "item-fresh", name_human: "Fresh item", qty: 2, price: 25, uom: "pcs", rik_code: "MAT-FR" }],
      error: null,
    });
    allocationDeferred2.resolve({ data: [], error: null });
    await waitForCondition(
      () => getPlatformObservabilityEvents().some((event) => event.event === "payment_form_ready"),
      20,
      () =>
        getPlatformObservabilityEvents().map((event) => ({
          event: event.event,
          result: event.result,
          errorMessage: event.errorMessage ?? null,
        })),
    );

    await act(async () => {
      renderer.root.findByProps({ testID: "payment-form-mode-partial" }).props.onPress();
    });
    await flushAsync();

    const renderedText = renderer.root.findAllByType(Text).map((node) => flattenText(node.props.children));
    expect(renderedText.some((text) => text.includes("Fresh item"))).toBe(true);
    expect(renderedText.some((text) => text.includes("Stale item"))).toBe(false);

    const events = getPlatformObservabilityEvents();
    expect(events.some((event) => event.event === "payment_form_stale_response_ignored")).toBe(true);
  });

  it("keeps partial allocation totals and residuals deterministic", async () => {
    configurePaymentQueries({
      itemResponse: async () => ({
        data: [
          { id: "item-1", name_human: "Line one", qty: 2, price: 50, uom: "pcs", rik_code: "MAT-1" },
          { id: "item-2", name_human: "Line two", qty: 1, price: 30, uom: "pcs", rik_code: "MAT-2" },
        ],
        error: null,
      }),
      allocationResponse: async () => ({
        data: [{ proposal_item_id: "item-1", amount: 20, proposal_payments: { proposal_id: "proposal-1" } }],
        error: null,
      }),
    });

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<PaymentFormHarness current={baseCurrent()} />);
    });
    await waitForCondition(
      () => getPlatformObservabilityEvents().some((event) => event.event === "payment_form_ready"),
      20,
      () =>
        getPlatformObservabilityEvents().map((event) => ({
          event: event.event,
          result: event.result,
          errorMessage: event.errorMessage ?? null,
        })),
    );

    await act(async () => {
      renderer.root.findByProps({ testID: "payment-form-mode-partial" }).props.onPress();
    });
    await flushAsync();

    await act(async () => {
      renderer.root.findByProps({ testID: "payment-form-line-input-item-1" }).props.onChangeText("40");
    });
    await flushAsync();

    expect(readTextByTestId(renderer, "harness-amount")).toBe("40.00");
    expect(readJsonByTestId<Array<{ proposal_item_id: string; amount: number }>>(renderer, "harness-alloc-rows")).toEqual([
      { proposal_item_id: "item-1", amount: 40 },
    ]);
    expect(readJsonByTestId<{ ok: boolean; sum: number }>(renderer, "harness-alloc-status")).toEqual({
      ok: true,
      sum: 40,
    });
  });

  it("applies full allocation parity without changing formulas", async () => {
    configurePaymentQueries({
      itemResponse: async () => ({
        data: [
          { id: "item-1", name_human: "Line one", qty: 2, price: 50, uom: "pcs", rik_code: "MAT-1" },
          { id: "item-2", name_human: "Line two", qty: 1, price: 30, uom: "pcs", rik_code: "MAT-2" },
        ],
        error: null,
      }),
      allocationResponse: async () => ({
        data: [{ proposal_item_id: "item-1", amount: 20, proposal_payments: { proposal_id: "proposal-1" } }],
        error: null,
      }),
    });

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<PaymentFormHarness current={baseCurrent()} />);
    });
    await waitForCondition(
      () => getPlatformObservabilityEvents().some((event) => event.event === "payment_form_ready"),
      20,
      () =>
        getPlatformObservabilityEvents().map((event) => ({
          event: event.event,
          result: event.result,
          errorMessage: event.errorMessage ?? null,
        })),
    );

    await act(async () => {
      renderer.root.findByProps({ testID: "payment-form-mode-full" }).props.onPress();
    });
    await flushAsync();

    expect(readTextByTestId(renderer, "harness-amount")).toBe("110.00");
    expect(readJsonByTestId<Array<{ proposal_item_id: string; amount: number }>>(renderer, "harness-alloc-rows")).toEqual([
      { proposal_item_id: "item-1", amount: 80 },
      { proposal_item_id: "item-2", amount: 30 },
    ]);
  });

  it("clears partial allocation state deterministically", async () => {
    configurePaymentQueries({
      itemResponse: async () => ({
        data: [{ id: "item-1", name_human: "Line one", qty: 2, price: 50, uom: "pcs", rik_code: "MAT-1" }],
        error: null,
      }),
      allocationResponse: async () => ({ data: [], error: null }),
    });

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<PaymentFormHarness current={baseCurrent({ total_paid: 0, invoice_amount: 100 })} />);
    });
    await waitForCondition(
      () => getPlatformObservabilityEvents().some((event) => event.event === "payment_form_ready"),
      20,
      () =>
        getPlatformObservabilityEvents().map((event) => ({
          event: event.event,
          result: event.result,
          errorMessage: event.errorMessage ?? null,
        })),
    );

    await act(async () => {
      renderer.root.findByProps({ testID: "payment-form-mode-partial" }).props.onPress();
    });
    await flushAsync();

    await act(async () => {
      renderer.root.findByProps({ testID: "payment-form-line-input-item-1" }).props.onChangeText("35");
    });
    await flushAsync();

    await act(async () => {
      renderer.root.findByProps({ testID: "payment-form-clear" }).props.onPress();
    });
    await flushAsync();

    expect(readTextByTestId(renderer, "harness-amount")).toBe("");
    expect(readJsonByTestId<Array<{ proposal_item_id: string; amount: number }>>(renderer, "harness-alloc-rows")).toEqual([]);
    expect(readJsonByTestId<{ ok: boolean; sum: number }>(renderer, "harness-alloc-status")).toEqual({
      ok: false,
      sum: 0,
    });
  });

  it("does not refetch on parent rerender with the same proposal", async () => {
    const { proposalItemsQuery, allocationsQuery } = configurePaymentQueries({
      itemResponse: async () => ({
        data: [{ id: "item-1", name_human: "Line one", qty: 1, price: 20, uom: "pcs", rik_code: "MAT-1" }],
        error: null,
      }),
      allocationResponse: async () => ({ data: [], error: null }),
    });

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<PaymentFormHarness current={baseCurrent()} nonce={0} />);
    });
    await waitForCondition(
      () => proposalItemsQuery.order.mock.calls.length === 1,
      20,
      () => ({
        events: getPlatformObservabilityEvents().map((event) => ({
          event: event.event,
          result: event.result,
          errorMessage: event.errorMessage ?? null,
        })),
        orderCalls: proposalItemsQuery.order.mock.calls.length,
        allocationCalls: allocationsQuery.eq.mock.calls.length,
      }),
    );

    await act(async () => {
      renderer.update(<PaymentFormHarness current={baseCurrent({ invoice_number: "INV-RERENDER" })} nonce={1} />);
    });
    await flushAsync();

    expect(proposalItemsQuery.order).toHaveBeenCalledTimes(1);
    expect(allocationsQuery.eq).toHaveBeenCalledTimes(1);
  });
});
