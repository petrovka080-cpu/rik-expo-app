import React from "react";
import { Text, TextInput } from "react-native";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import ActivePaymentForm from "./ActivePaymentForm";
import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../../../lib/observability/platformObservability";

const mockAccountantLoadProposalFinancialState = jest.fn();

jest.mock("../../../lib/api/accountant", () => ({
  accountantLoadProposalFinancialState: (...args: unknown[]) =>
    mockAccountantLoadProposalFinancialState(...args),
}));

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

const collectRenderedCopy = (renderer: ReactTestRenderer) => {
  const textCopy = renderer.root
    .findAllByType(Text)
    .map((node) => flattenText(node.props.children))
    .filter(Boolean);
  const placeholderCopy = renderer.root
    .findAllByType(TextInput)
    .map((node) => String(node.props.placeholder ?? "").trim())
    .filter(Boolean);

  return [...textCopy, ...placeholderCopy];
};

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

const baseFinancialState = (overrides?: Record<string, unknown>) => ({
  proposalId: "proposal-1",
  proposalStatus: "Утверждено",
  sentToAccountantAt: "2026-03-30T10:00:00.000Z",
  supplier: "Supplier",
  invoice: {
    number: "INV-1",
    date: "2026-03-29",
    currency: "KGS",
    payableSource: "proposal_items_total",
  },
  totals: {
    payableAmount: 130,
    totalPaid: 20,
    outstandingAmount: 110,
    paymentsCount: 1,
    paymentStatus: "Частично оплачено",
    lastPaidAt: "2026-03-30T10:00:00.000Z",
  },
  eligibility: {
    approved: true,
    sentToAccountant: true,
    paymentEligible: true,
    failureCode: null,
  },
  allocationSummary: {
    paidKnownSum: 20,
    paidUnassigned: 0,
    allocationCount: 2,
  },
  items: [
    {
      proposalItemId: "item-1",
      nameHuman: "Line one",
      uom: "pcs",
      qty: 2,
      price: 50,
      rikCode: "MAT-1",
      lineTotal: 100,
      paidTotal: 20,
      outstanding: 80,
    },
    {
      proposalItemId: "item-2",
      nameHuman: "Line two",
      uom: "pcs",
      qty: 1,
      price: 30,
      rikCode: "MAT-2",
      lineTotal: 30,
      paidTotal: 0,
      outstanding: 30,
    },
  ],
  meta: {
    sourceKind: "rpc:accountant_proposal_financial_state_v1",
    backendTruth: true,
    legacyTotalPaid: 20,
    legacyPaymentStatus: "Частично оплачено",
  },
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
  const [accountantFio, setAccountantFio] = React.useState("Бухгалтер");
  const [payKind, setPayKind] = React.useState<"bank" | "cash">("bank");
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");
  const [bankName, setBankName] = React.useState("");
  const [bik, setBik] = React.useState("");
  const [rs, setRs] = React.useState("");
  const [inn, setInn] = React.useState("");
  const [kpp, setKpp] = React.useState("");
  const [allocRows, setAllocRows] = React.useState<
    { proposal_item_id: string; amount: number }[]
  >([]);
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

describe("ActivePaymentForm", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    const runtime = globalThis as typeof globalThis & { __DEV__?: boolean };
    runtime.__DEV__ = false;
    resetPlatformObservabilityEvents();
    mockAccountantLoadProposalFinancialState.mockReset();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("shows a visible payment data error when server financial state load fails", async () => {
    mockAccountantLoadProposalFinancialState.mockRejectedValue(
      new Error("server financial state failed"),
    );

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<PaymentFormHarness current={baseCurrent()} />);
    });
    await flushAsync();

    expect(() =>
      renderer.root.findByProps({ testID: "payment-form-data-error" }),
    ).not.toThrow();

    const events = getPlatformObservabilityEvents();
    expect(
      events.some((event) => event.event === "proposal_financial_state_load_failed"),
    ).toBe(true);
    expect(
      readJsonByTestId<{ ok: boolean; sum: number }>(renderer, "harness-alloc-status"),
    ).toEqual({
      ok: false,
      sum: 0,
    });
  });

  it("opens, loads, and reaches ready state without stale placeholders", async () => {
    mockAccountantLoadProposalFinancialState.mockResolvedValue(
      baseFinancialState({
        totals: {
          payableAmount: 20,
          totalPaid: 0,
          outstandingAmount: 20,
          paymentsCount: 0,
          paymentStatus: "К оплате",
          lastPaidAt: null,
        },
        allocationSummary: { paidKnownSum: 0, paidUnassigned: 0, allocationCount: 1 },
        items: [
          {
            proposalItemId: "item-1",
            nameHuman: "Ready item",
            uom: "pcs",
            qty: 1,
            price: 20,
            rikCode: "MAT-1",
            lineTotal: 20,
            paidTotal: 0,
            outstanding: 20,
          },
        ],
      }),
    );

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <PaymentFormHarness current={baseCurrent({ total_paid: 0, invoice_amount: 20 })} />,
      );
    });
    await waitForCondition(
      () =>
        getPlatformObservabilityEvents().some(
          (event) => event.event === "payment_form_ready",
        ),
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

  it("promotes canonical server outstanding over stale current row math", async () => {
    mockAccountantLoadProposalFinancialState.mockResolvedValue(
      baseFinancialState({
        totals: {
          payableAmount: 130,
          totalPaid: 95,
          outstandingAmount: 35,
          paymentsCount: 2,
          paymentStatus: "Частично оплачено",
          lastPaidAt: "2026-03-30T10:00:00.000Z",
        },
        eligibility: {
          approved: true,
          sentToAccountant: true,
          paymentEligible: true,
          failureCode: null,
        },
        allocationSummary: {
          paidKnownSum: 90,
          paidUnassigned: 5,
          allocationCount: 2,
        },
      }),
    );

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <PaymentFormHarness current={baseCurrent({ invoice_amount: 999, total_paid: 0 })} />,
      );
    });
    await waitForCondition(
      () =>
        getPlatformObservabilityEvents().some(
          (event) => event.event === "payment_form_ready",
        ),
      20,
    );

    expect(readTextByTestId(renderer, "payment-form-rest")).toContain("35.00");
  });

  it("renders readable payment form copy without mojibake markers", async () => {
    mockAccountantLoadProposalFinancialState.mockResolvedValue(
      baseFinancialState({
        allocationSummary: {
          paidKnownSum: 15,
          paidUnassigned: 5,
          allocationCount: 2,
        },
      }),
    );

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<PaymentFormHarness current={baseCurrent()} />);
    });
    await waitForCondition(
      () =>
        getPlatformObservabilityEvents().some(
          (event) => event.event === "payment_form_ready",
        ),
      20,
    );

    await act(async () => {
      renderer.root.findByProps({ testID: "payment-form-mode-partial" }).props.onPress();
    });
    await flushAsync();

    const copy = collectRenderedCopy(renderer).join("\n");

    expect(copy).toContain("ФИО бухгалтера *");
    expect(copy).toContain("Номер счёта (инвойса) *");
    expect(copy).toContain("Сегодня");
    expect(copy).toContain("Вчера");
    expect(copy).toContain("Банк");
    expect(copy).toContain("Нал");
    expect(copy).toContain("Остаток к оплате");
    expect(copy).toContain("Оплатить полностью");
    expect(copy).toContain("Оплатить частично");
    expect(copy).toContain("Распределение по позициям");
    expect(copy).toContain("Сумма к оплате (авто):");
    expect(copy).toContain("Не распределено ранее:");
    expect(copy).toContain("Очистить");
    expect(copy).toContain("Остаток по позиции:");
    expect(copy).toContain("Этим платежом по позиции");
    expect(copy).toContain("Оплачено до:");
    expect(copy).toContain("Остаток после:");
    expect(copy).toContain("Комментарий");
    expect(copy).toContain("БИК");
    expect(copy).toContain("Р/С");
    expect(copy).toContain("ИНН");
    expect(copy).toContain("КПП");
    expect(copy).toContain(
      "Сумма оплаты берётся автоматически из распределения по позициям.",
    );
    expect(copy).not.toMatch(/Рџ|РЎ|Рќ|вЂ|Г—|вќ|СЃ|С‡|СЏ/);
  });

  it("cancels in-flight loads on immediate close without stale state updates", async () => {
    const financialStateDeferred = deferred<ReturnType<typeof baseFinancialState>>();
    mockAccountantLoadProposalFinancialState.mockReturnValue(financialStateDeferred.promise);

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<PaymentFormHarness current={baseCurrent()} />);
    });
    await flushAsync(1);

    await act(async () => {
      renderer.unmount();
    });

    financialStateDeferred.resolve(baseFinancialState());
    await flushAsync();

    const events = getPlatformObservabilityEvents();
    expect(
      events.some((event) => event.event === "payment_form_request_canceled"),
    ).toBe(true);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("ignores stale responses after quick reopen and publishes only fresh rows", async () => {
    const financialStateDeferred1 = deferred<ReturnType<typeof baseFinancialState>>();
    const financialStateDeferred2 = deferred<ReturnType<typeof baseFinancialState>>();

    mockAccountantLoadProposalFinancialState.mockImplementation((proposalId: string) => {
      if (proposalId === "proposal-1") return financialStateDeferred1.promise;
      if (proposalId === "proposal-2") return financialStateDeferred2.promise;
      throw new Error(`Unexpected proposal ${proposalId}`);
    });

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <PaymentFormHarness current={baseCurrent({ proposal_id: "proposal-1" })} />,
      );
    });
    await flushAsync(1);

    await act(async () => {
      renderer.update(
        <PaymentFormHarness
          current={baseCurrent({ proposal_id: "proposal-2", invoice_number: "INV-2" })}
        />,
      );
    });

    financialStateDeferred1.resolve(
      baseFinancialState({
        proposalId: "proposal-1",
        items: [
          {
            proposalItemId: "item-stale",
            nameHuman: "Stale item",
            uom: "pcs",
            qty: 1,
            price: 10,
            rikCode: "MAT-ST",
            lineTotal: 10,
            paidTotal: 0,
            outstanding: 10,
          },
        ],
      }),
    );
    await flushAsync();

    financialStateDeferred2.resolve(
      baseFinancialState({
        proposalId: "proposal-2",
        invoice: {
          number: "INV-2",
          date: "2026-03-29",
          currency: "KGS",
          payableSource: "proposal_items_total",
        },
        items: [
          {
            proposalItemId: "item-fresh",
            nameHuman: "Fresh item",
            uom: "pcs",
            qty: 2,
            price: 25,
            rikCode: "MAT-FR",
            lineTotal: 50,
            paidTotal: 0,
            outstanding: 50,
          },
        ],
      }),
    );
    await waitForCondition(
      () =>
        getPlatformObservabilityEvents().some(
          (event) => event.event === "payment_form_ready",
        ),
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

    const renderedText = renderer.root
      .findAllByType(Text)
      .map((node) => flattenText(node.props.children));
    expect(renderedText.some((text) => text.includes("Fresh item"))).toBe(true);
    expect(renderedText.some((text) => text.includes("Stale item"))).toBe(false);

    const events = getPlatformObservabilityEvents();
    expect(
      events.some((event) => event.event === "payment_form_stale_response_ignored"),
    ).toBe(true);
  });

  it("keeps partial allocation totals and residuals deterministic", async () => {
    mockAccountantLoadProposalFinancialState.mockResolvedValue(baseFinancialState());

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<PaymentFormHarness current={baseCurrent()} />);
    });
    await waitForCondition(
      () =>
        getPlatformObservabilityEvents().some(
          (event) => event.event === "payment_form_ready",
        ),
      20,
    );

    await act(async () => {
      renderer.root.findByProps({ testID: "payment-form-mode-partial" }).props.onPress();
    });
    await flushAsync();

    await act(async () => {
      renderer.root
        .findByProps({ testID: "payment-form-line-input-item-1" })
        .props.onChangeText("40");
    });
    await flushAsync();

    expect(readTextByTestId(renderer, "harness-amount")).toBe("40.00");
    expect(
      readJsonByTestId<{ proposal_item_id: string; amount: number }[]>(
        renderer,
        "harness-alloc-rows",
      ),
    ).toEqual([{ proposal_item_id: "item-1", amount: 40 }]);
    expect(
      readJsonByTestId<{ ok: boolean; sum: number }>(
        renderer,
        "harness-alloc-status",
      ),
    ).toEqual({
      ok: true,
      sum: 40,
    });
  });

  it("applies full allocation parity without changing formulas", async () => {
    mockAccountantLoadProposalFinancialState.mockResolvedValue(baseFinancialState());

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<PaymentFormHarness current={baseCurrent()} />);
    });
    await waitForCondition(
      () =>
        getPlatformObservabilityEvents().some(
          (event) => event.event === "payment_form_ready",
        ),
      20,
    );

    await act(async () => {
      renderer.root.findByProps({ testID: "payment-form-mode-full" }).props.onPress();
    });
    await flushAsync();

    expect(readTextByTestId(renderer, "harness-amount")).toBe("110.00");
    expect(
      readJsonByTestId<{ proposal_item_id: string; amount: number }[]>(
        renderer,
        "harness-alloc-rows",
      ),
    ).toEqual([
      { proposal_item_id: "item-1", amount: 80 },
      { proposal_item_id: "item-2", amount: 30 },
    ]);
  });

  it("clears partial allocation state deterministically", async () => {
    mockAccountantLoadProposalFinancialState.mockResolvedValue(
      baseFinancialState({
        totals: {
          payableAmount: 100,
          totalPaid: 0,
          outstandingAmount: 100,
          paymentsCount: 0,
          paymentStatus: "К оплате",
          lastPaidAt: null,
        },
        allocationSummary: { paidKnownSum: 0, paidUnassigned: 0, allocationCount: 1 },
        items: [
          {
            proposalItemId: "item-1",
            nameHuman: "Line one",
            uom: "pcs",
            qty: 2,
            price: 50,
            rikCode: "MAT-1",
            lineTotal: 100,
            paidTotal: 0,
            outstanding: 100,
          },
        ],
      }),
    );

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <PaymentFormHarness current={baseCurrent({ total_paid: 0, invoice_amount: 100 })} />,
      );
    });
    await waitForCondition(
      () =>
        getPlatformObservabilityEvents().some(
          (event) => event.event === "payment_form_ready",
        ),
      20,
    );

    await act(async () => {
      renderer.root.findByProps({ testID: "payment-form-mode-partial" }).props.onPress();
    });
    await flushAsync();

    await act(async () => {
      renderer.root
        .findByProps({ testID: "payment-form-line-input-item-1" })
        .props.onChangeText("35");
    });
    await flushAsync();

    await act(async () => {
      renderer.root.findByProps({ testID: "payment-form-clear" }).props.onPress();
    });
    await flushAsync();

    expect(readTextByTestId(renderer, "harness-amount")).toBe("");
    expect(
      readJsonByTestId<{ proposal_item_id: string; amount: number }[]>(
        renderer,
        "harness-alloc-rows",
      ),
    ).toEqual([]);
    expect(
      readJsonByTestId<{ ok: boolean; sum: number }>(
        renderer,
        "harness-alloc-status",
      ),
    ).toEqual({
      ok: false,
      sum: 0,
    });
  });

  it("does not refetch on parent rerender with the same proposal", async () => {
    mockAccountantLoadProposalFinancialState.mockResolvedValue(
      baseFinancialState({
        totals: {
          payableAmount: 20,
          totalPaid: 0,
          outstandingAmount: 20,
          paymentsCount: 0,
          paymentStatus: "К оплате",
          lastPaidAt: null,
        },
        allocationSummary: { paidKnownSum: 0, paidUnassigned: 0, allocationCount: 1 },
        items: [
          {
            proposalItemId: "item-1",
            nameHuman: "Line one",
            uom: "pcs",
            qty: 1,
            price: 20,
            rikCode: "MAT-1",
            lineTotal: 20,
            paidTotal: 0,
            outstanding: 20,
          },
        ],
      }),
    );

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<PaymentFormHarness current={baseCurrent()} nonce={0} />);
    });
    await waitForCondition(
      () => mockAccountantLoadProposalFinancialState.mock.calls.length === 1,
      20,
      () => ({
        calls: mockAccountantLoadProposalFinancialState.mock.calls.length,
        events: getPlatformObservabilityEvents().map((event) => ({
          event: event.event,
          result: event.result,
        })),
      }),
    );

    await act(async () => {
      renderer.update(
        <PaymentFormHarness
          current={baseCurrent({ invoice_number: "INV-RERENDER" })}
          nonce={1}
        />,
      );
    });
    await flushAsync();

    expect(mockAccountantLoadProposalFinancialState).toHaveBeenCalledTimes(1);
  });
});
