import { useCallback, useRef } from "react";
import { Alert, Platform } from "react-native";

import {
  AccountantPayInvoiceAtomicError,
  accountantLoadProposalFinancialState,
  accountantPayInvoiceAtomic,
} from "../../lib/api/accountant";
import { recordCatchDiscipline } from "../../lib/observability/catchDiscipline";
import { beginPlatformObservability } from "../../lib/observability/platformObservability";

type AllocRow = { proposal_item_id: string; amount: number };
type RowBase = {
  proposal_id?: string | number;
  invoice_amount?: number | null;
  total_paid?: number | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  invoice_currency?: string | null;
};

type Params<T extends RowBase> = {
  canAct: boolean;
  current: T | null;
  amount: string;
  accountantFio: string;
  payKind: "bank" | "cash";
  note: string;
  allocRows: AllocRow[];
  allocOk: boolean;
  purposePrefix: string;
  afterPaymentSync: (proposalId: string) => Promise<unknown>;
  closeCard: () => void;
  setCurrentPaymentId: (id: number | null) => void;
  setRows: React.Dispatch<React.SetStateAction<T[]>>;
  safeAlert: (title: string, msg: string) => void;
  errText: (e: unknown) => string;
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceCurrency?: string | null;
};

const EPS = 0.01;

type PaymentIntent = {
  signature: string;
  clientMutationId: string;
  serverState: Awaited<ReturnType<typeof accountantLoadProposalFinancialState>>;
};

const roundMoney = (value: unknown) => Math.round((Number(value) || 0) * 100) / 100;

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

const hashString32 = (input: string): string => {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
};

const makePaymentMutationId = (signature: string): string => {
  const cryptoLike =
    typeof globalThis !== "undefined"
      ? (globalThis as typeof globalThis & {
          crypto?: {
            randomUUID?: () => string;
          };
        }).crypto
      : undefined;
  const unique =
    typeof cryptoLike?.randomUUID === "function"
      ? cryptoLike.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `accountant-payment:${hashString32(signature)}:${unique}`;
};

const buildPaymentIntentSignature = (params: {
  proposalId: string;
  mode: "rest" | "partial_or_custom";
  requestedAmount: number;
  accountantFio: string;
  payKind: "bank" | "cash";
  purposePrefix: string;
  note: string;
  allocRows: AllocRow[];
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  invoiceCurrency?: string | null;
}) =>
  stableStringify({
    proposalId: params.proposalId,
    mode: params.mode,
    requestedAmount: roundMoney(params.requestedAmount),
    accountantFio: params.accountantFio.trim(),
    method: getPaymentMethodLabel(params.payKind),
    purpose: `${params.purposePrefix} ${params.note || ""}`.trim(),
    note: params.note?.trim() || null,
    allocations: (Array.isArray(params.allocRows) ? params.allocRows : [])
      .map((row) => ({
        proposal_item_id: String(row?.proposal_item_id ?? "").trim(),
        amount: roundMoney(row?.amount),
      }))
      .filter((row) => row.proposal_item_id && row.amount > 0)
      .sort((left, right) => left.proposal_item_id.localeCompare(right.proposal_item_id)),
    invoiceNumber: String(params.invoiceNumber ?? "").trim() || null,
    invoiceDate: String(params.invoiceDate ?? "").trim() || null,
    invoiceCurrency: String(params.invoiceCurrency ?? "").trim() || null,
  });

const paymentActionSourceKind = (proposalId: unknown) =>
  String(proposalId ?? "").trim() ? "proposal:payment_apply" : "payment:manual_form";

const getFinancialFailureMessage = (code: string | null | undefined) => {
  switch (String(code ?? "").trim()) {
    case "proposal_not_approved":
      return "Предложение не одобрено для оплаты.";
    case "approval_revoked":
      return "Одобрение или передача бухгалтеру были отозваны.";
    case "invalid_amount":
      return "Сумма оплаты должна быть больше нуля.";
    case "amount_exceeds_outstanding":
      return "Сумма оплаты превышает серверный остаток.";
    case "stale_financial_state":
      return "Финансовое состояние предложения изменилось до фиксации оплаты.";
    case "already_paid":
      return "Предложение уже полностью оплачено.";
    case "invalid_payable_amount":
      return "Серверное финансовое состояние предложения некорректно.";
    case "proposal_not_found":
      return "Предложение не найдено.";
    default:
      return "Сервер отклонил оплату по финансовому состоянию предложения.";
  }
};

const extractFailureCode = (error: unknown) =>
  error instanceof AccountantPayInvoiceAtomicError ? error.code : null;

const getPaymentMethodLabel = (payKind: "bank" | "cash") =>
  payKind === "bank" ? "Банк" : "Нал";

export function useAccountantPayActions<T extends RowBase>(p: Params<T>) {
  const pendingPaymentIntentRef = useRef<PaymentIntent | null>(null);

  const recordPaymentActionCatch = useCallback(
    (
      kind: "critical_fail" | "soft_failure" | "cleanup_only" | "degraded_fallback",
      event: string,
      error: unknown,
      extra?: Record<string, unknown>,
    ) => {
      const proposalId = String(p.current?.proposal_id ?? "").trim();
      recordCatchDiscipline({
        screen: "accountant",
        surface: "payment_form_apply",
        event,
        kind,
        error,
        category: "ui",
        sourceKind: paymentActionSourceKind(proposalId),
        errorStage: event,
        extra: {
          proposalId: proposalId || null,
          failureCode: extractFailureCode(error),
          ...extra,
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO(P1): review deps
    [p.current?.proposal_id],
  );

  const showPaymentFailure = useCallback(
    (title: string, e: unknown) => {
      const msg = p.errText(e);
      p.safeAlert(title, msg);
      if (__DEV__) console.error("[accountant.payment]", msg);
    },
    [p],
  );

  const showPaymentSyncWarning = useCallback(
    (e: unknown) => {
      p.safeAlert(
        "Оплата проведена, но обновление экрана не завершилось",
        `Платёж сохранён, но экран не обновился автоматически: ${p.errText(e)}`,
      );
      if (__DEV__) console.error("[accountant.payment.sync]", e);
    },
    [p],
  );

  const loadServerFinancialState = useCallback(async () => {
    const proposalId = String(p.current?.proposal_id ?? "").trim();
    if (!proposalId) throw new Error("Proposal id is required for payment.");
    return accountantLoadProposalFinancialState(proposalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO(P1): review deps
  }, [p.current?.proposal_id]);

  const commitPayment = useCallback(
    async (mode: "rest" | "partial_or_custom", requestedAmount: number) => {
      const proposalId = String(p.current?.proposal_id ?? "").trim();
      if (!proposalId) throw new Error("Proposal id is required for payment.");

      const intentSignature = buildPaymentIntentSignature({
        proposalId,
        mode,
        requestedAmount,
        accountantFio: p.accountantFio,
        payKind: p.payKind,
        purposePrefix: p.purposePrefix,
        note: p.note,
        allocRows: p.allocRows,
        invoiceNumber: p.invoiceNumber ?? p.current?.invoice_number ?? null,
        invoiceDate: p.invoiceDate ?? p.current?.invoice_date ?? null,
        invoiceCurrency: p.invoiceCurrency ?? p.current?.invoice_currency ?? null,
      });
      let pendingIntent = pendingPaymentIntentRef.current;
      const serverState =
        pendingIntent?.signature === intentSignature
          ? pendingIntent.serverState
          : await loadServerFinancialState();
      const outstanding = Number(serverState.totals.outstandingAmount ?? 0);
      if (!serverState.eligibility.paymentEligible) {
        throw new Error(getFinancialFailureMessage(serverState.eligibility.failureCode));
      }
      if (!requestedAmount || requestedAmount <= 0) {
        throw new Error("Сумма оплаты должна быть больше нуля.");
      }
      if (requestedAmount - outstanding > EPS) {
        throw new Error(getFinancialFailureMessage("amount_exceeds_outstanding"));
      }

      if (!pendingIntent || pendingIntent.signature !== intentSignature) {
        pendingIntent = {
          signature: intentSignature,
          clientMutationId: makePaymentMutationId(intentSignature),
          serverState,
        };
        pendingPaymentIntentRef.current = pendingIntent;
      }

      const observation = beginPlatformObservability({
        screen: "accountant",
        surface: "payment_form_apply",
        category: "ui",
        event: "payment_apply",
        sourceKind: paymentActionSourceKind(proposalId),
        trigger: mode === "rest" ? "pay_rest" : "add_payment",
        extra: {
          proposalId,
          mode,
          allocationCount: p.allocRows.length,
          requestedAmount,
          outstandingBefore: outstanding,
          serverPaymentEligible: serverState.eligibility.paymentEligible,
          serverFailureCode: serverState.eligibility.failureCode,
          clientMutationId: pendingIntent.clientMutationId,
        },
      });

      try {
        const payment = await accountantPayInvoiceAtomic({
          proposalId,
          amount: requestedAmount,
          accountantFio: p.accountantFio.trim(),
          purpose: `${p.purposePrefix} ${p.note || ""}`.trim(),
          method: getPaymentMethodLabel(p.payKind),
          clientMutationId: pendingIntent.clientMutationId,
          note: p.note?.trim() ? p.note.trim() : null,
          allocations: Array.isArray(p.allocRows) ? p.allocRows : [],
          invoiceNumber:
            String(p.invoiceNumber ?? p.current?.invoice_number ?? "")
              .trim() || null,
          invoiceDate:
            String(p.invoiceDate ?? p.current?.invoice_date ?? "")
              .trim() || null,
          invoiceCurrency:
            String(p.invoiceCurrency ?? p.current?.invoice_currency ?? "")
              .trim() || null,
          expectedTotalPaid: serverState.totals.totalPaid,
          expectedOutstanding: serverState.totals.outstandingAmount,
        });
        pendingPaymentIntentRef.current = null;

        p.setCurrentPaymentId(Number(payment.paymentId));

        try {
          await p.afterPaymentSync(proposalId);
        } catch (error) {
          recordPaymentActionCatch("soft_failure", "payment_apply_sync_failed", error, {
            mode,
            paymentId: payment.paymentId,
            requestedAmount,
            clientMutationId: payment.clientMutationId,
          });
          showPaymentSyncWarning(error);
          return;
        }

        p.setRows((prev) => prev.filter((row) => String(row.proposal_id) !== proposalId));
        observation.success({
          extra: {
            proposalId,
            mode,
            paymentId: payment.paymentId,
            clientMutationId: payment.clientMutationId,
            mutationOutcome: payment.outcome,
            idempotentReplay: payment.idempotentReplay,
            allocationCount: p.allocRows.length,
            requestedAmount,
            outstandingBefore: payment.totalsBefore.outstandingAmount,
            outstandingAfter: payment.totalsAfter.outstandingAmount,
            totalPaidAfter: payment.totalsAfter.totalPaid,
            paymentStatusAfter: payment.totalsAfter.paymentStatus,
          },
        });
        p.safeAlert("Оплата проведена", "Оплата успешно сохранена.");
        p.closeCard();
      } catch (error) {
        if (error instanceof AccountantPayInvoiceAtomicError) {
          pendingPaymentIntentRef.current = null;
        }
        observation.error(error, {
          errorStage: "payment_apply_failed",
          extra: {
            proposalId,
            mode,
            requestedAmount,
            clientMutationId: pendingIntent.clientMutationId,
            failureCode: extractFailureCode(error),
          },
        });
        throw error;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO(P1): review deps
    [
      loadServerFinancialState,
      p.accountantFio,
      p.afterPaymentSync,
      p.allocRows,
      p.closeCard,
      p.current?.invoice_currency,
      p.current?.invoice_date,
      p.current?.invoice_number,
      p.current?.proposal_id,
      p.invoiceCurrency,
      p.invoiceDate,
      p.invoiceNumber,
      p.note,
      p.payKind,
      p.purposePrefix,
      p.setCurrentPaymentId,
      p.setRows,
      p.safeAlert,
      recordPaymentActionCatch,
      showPaymentSyncWarning,
    ],
  );

  const payRest = useCallback(async () => {
    if (!p.canAct) {
      p.safeAlert("Нет доступа", "Нужна роль accountant.");
      return;
    }
    if (!p.current?.proposal_id) return;

    try {
      const fio = p.accountantFio.trim();
      if (!fio) {
        p.safeAlert("ФИО бухгалтера", "Поле обязательно");
        return;
      }

      const serverState = await loadServerFinancialState();
      const outstanding = Number(serverState.totals.outstandingAmount ?? 0);
      if (!serverState.eligibility.paymentEligible) {
        throw new Error(getFinancialFailureMessage(serverState.eligibility.failureCode));
      }
      if (!outstanding || outstanding <= 0) {
        p.safeAlert("Оплата", "Серверный остаток уже закрыт.");
        return;
      }

      await commitPayment("rest", outstanding);
    } catch (e: unknown) {
      recordPaymentActionCatch("critical_fail", "payment_apply_failed", e, {
        mode: "rest",
      });
      showPaymentFailure("Ошибка оплаты", e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO(P1): review deps
  }, [
    commitPayment,
    loadServerFinancialState,
    p.accountantFio,
    p.canAct,
    p.current?.proposal_id,
    p.safeAlert,
    recordPaymentActionCatch,
    showPaymentFailure,
  ]);

  const addPayment = useCallback(async () => {
    if (!p.canAct) {
      p.safeAlert("Нет доступа", "Нужна роль accountant.");
      return;
    }
    if (!p.current?.proposal_id) return;

    const val = Number(String(p.amount).replace(",", "."));
    if (!val || val <= 0) {
      p.safeAlert("Оплата", "Сумма оплаты должна быть больше 0.");
      return;
    }

    try {
      const fio = p.accountantFio.trim();
      if (!fio) {
        p.safeAlert("ФИО бухгалтера", "Поле обязательно");
        return;
      }

      const serverState = await loadServerFinancialState();
      const outstanding = Number(serverState.totals.outstandingAmount ?? 0);
      if (!serverState.eligibility.paymentEligible) {
        throw new Error(getFinancialFailureMessage(serverState.eligibility.failureCode));
      }

      if (outstanding > EPS && Math.abs(val - outstanding) <= EPS) {
        const ok =
          Platform.OS === "web"
            ? window.confirm(
                "Сумма равна серверному остатку. Провести оплату как полное закрытие?",
              )
            : await new Promise<boolean>((resolve) => {
                Alert.alert(
                  "Полная оплата",
                  "Сумма равна серверному остатку. Провести полное закрытие оплаты?",
                  [
                    { text: "Нет", style: "cancel", onPress: () => resolve(false) },
                    { text: "Да", style: "default", onPress: () => resolve(true) },
                  ],
                );
              });
        if (ok) {
          await commitPayment("rest", outstanding);
          return;
        }
      }

      await commitPayment("partial_or_custom", val);
    } catch (e: unknown) {
      recordPaymentActionCatch("critical_fail", "payment_apply_failed", e, {
        mode: "partial_or_custom",
      });
      showPaymentFailure("Ошибка оплаты", e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO(P1): review deps
  }, [
    commitPayment,
    loadServerFinancialState,
    p.accountantFio,
    p.amount,
    p.canAct,
    p.current?.proposal_id,
    p.safeAlert,
    recordPaymentActionCatch,
    showPaymentFailure,
  ]);

  const onPayConfirm = useCallback(async () => {
    const v = Number(String(p.amount).replace(",", "."));
    if (!v || v <= 0) {
      p.safeAlert("Оплата", "Сумма оплаты должна быть больше 0.");
      return;
    }
    if (!p.allocOk) {
      p.safeAlert(
        "Оплата",
        "Распределение невалидно: сумма должна быть больше нуля и не превышать остаток.",
      );
      return;
    }

    const ok =
      Platform.OS === "web"
        ? window.confirm(`Провести оплату на сумму ${v}?`)
        : await new Promise<boolean>((resolve) => {
            Alert.alert("Подтвердить оплату", `Сумма оплаты: ${v}. Продолжить?`, [
              { text: "Отмена", style: "cancel", onPress: () => resolve(false) },
              { text: "Оплатить", style: "default", onPress: () => resolve(true) },
            ]);
          });

    if (!ok) return;
    await addPayment();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO(P1): review deps
  }, [p.allocOk, p.amount, p.safeAlert, addPayment]);

  return { payRest, addPayment, onPayConfirm };
}
