import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { accountantLoadProposalFinancialState } from "../../lib/api/accountant";
import { recordCatchDiscipline } from "../../lib/observability/catchDiscipline";
import {
  beginPlatformObservability,
  recordPlatformObservability,
} from "../../lib/observability/platformObservability";
import {
  applyAllocationRow,
  buildAllocRowsSignature,
  buildFullAllocationRows,
  buildLineInputMap,
  derivePaymentFormState,
  getPaymentFormErrorMessage,
  nnum,
  round2,
  type AccountantPaymentAllocRow,
  type AccountantPaymentCurrentInvoice,
  type AccountantPaymentFormItem,
  type AccountantPaymentMode,
} from "./accountant.paymentForm.helpers";

type UseAccountantPaymentFormParams = {
  current: AccountantPaymentCurrentInvoice | null;
  amount: string;
  setAmount: React.Dispatch<React.SetStateAction<string>>;
  allocRows: AccountantPaymentAllocRow[];
  setAllocRows: React.Dispatch<React.SetStateAction<AccountantPaymentAllocRow[]>>;
  onAllocStatus?: (ok: boolean, sum: number) => void;
};

const getPaymentFormSourceKind = (proposalId: string) =>
  proposalId ? "proposal:payment_allocation_form" : "payment:manual_form";

const getFinancialEligibilityMessage = (failureCode: string | null) => {
  switch (String(failureCode ?? "").trim()) {
    case "proposal_not_approved":
      return "Предложение не одобрено для оплаты.";
    case "approval_revoked":
      return "Одобрение или передача бухгалтеру были отозваны.";
    case "already_paid":
      return "Предложение уже полностью оплачено.";
    case "invalid_payable_amount":
      return "Серверное финансовое состояние предложения некорректно.";
    case "proposal_not_found":
      return "Предложение не найдено.";
    default:
      return "Серверное финансовое состояние предложения недоступно для оплаты.";
  }
};

async function loadPaymentFormFinancialState(proposalId: string) {
  const financialState = await accountantLoadProposalFinancialState(proposalId);
  return {
    current: {
      proposal_id: financialState.proposalId,
      supplier: financialState.supplier,
      invoice_number: financialState.invoice.number,
      invoice_date: financialState.invoice.date,
      invoice_currency: financialState.invoice.currency,
      invoice_amount: financialState.totals.payableAmount,
      total_paid: financialState.totals.totalPaid,
    } satisfies AccountantPaymentCurrentInvoice,
    items: financialState.items.map(
      (item): AccountantPaymentFormItem => ({
        id: item.proposalItemId,
        name_human: item.nameHuman,
        uom: item.uom,
        qty: item.qty,
        price: item.price,
        rik_code: item.rikCode,
      }),
    ),
    paidByLineMap: new Map(
      financialState.items.map((item) => [item.proposalItemId, round2(item.paidTotal)]),
    ),
    paidKnownSum: round2(financialState.allocationSummary.paidKnownSum),
    paymentEligible: financialState.eligibility.paymentEligible,
    failureCode: financialState.eligibility.failureCode,
  };
}

export function useAccountantPaymentForm(params: UseAccountantPaymentFormParams) {
  const { current, amount, setAmount, allocRows, setAllocRows, onAllocStatus } = params;
  const proposalId = String(current?.proposal_id ?? "").trim();
  const sourceKind = getPaymentFormSourceKind(proposalId);
  const mountedRef = useRef(true);
  const requestSeqRef = useRef(0);
  const proposalIdRef = useRef(proposalId);
  const lastCommittedAllocSignatureRef = useRef("");
  const onAllocStatusRef = useRef(onAllocStatus);

  proposalIdRef.current = proposalId;

  const [mode, setMode] = useState<AccountantPaymentMode>("full");
  const [items, setItems] = useState<AccountantPaymentFormItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [allocationsError, setAllocationsError] = useState<string | null>(null);
  const [allocationUiError, setAllocationUiError] = useState<string | null>(null);
  const [financialCurrent, setFinancialCurrent] =
    useState<AccountantPaymentCurrentInvoice | null>(null);
  const [paidByLineMap, setPaidByLineMap] = useState<Map<string, number>>(new Map());
  const [paidKnownSum, setPaidKnownSum] = useState(0);
  const [lineInputs, setLineInputs] = useState<Record<string, string>>({});

  const effectiveCurrent = useMemo<AccountantPaymentCurrentInvoice | null>(
    () =>
      current || financialCurrent
        ? {
            ...(current ?? {}),
            ...(financialCurrent ?? {}),
          }
        : null,
    [current, financialCurrent],
  );

  const recordPaymentFormCatch = useCallback(
    (
      kind: "critical_fail" | "soft_failure" | "cleanup_only" | "degraded_fallback",
      event: string,
      error: unknown,
      extra?: Record<string, unknown>,
    ) => {
      recordCatchDiscipline({
        screen: "accountant",
        surface: "active_payment_form",
        event,
        kind,
        error,
        category: event.includes("callback") ? "ui" : "fetch",
        sourceKind,
        errorStage: event,
        extra: {
          proposalId: proposalId || null,
          ...extra,
        },
      });
    },
    [proposalId, sourceKind],
  );

  const paymentDataErrorMessage = useMemo(
    () => allocationUiError || allocationsError || itemsError || null,
    [allocationUiError, allocationsError, itemsError],
  );

  useEffect(() => {
    onAllocStatusRef.current = onAllocStatus;
  }, [onAllocStatus]);

  const derived = useMemo(
    () =>
      derivePaymentFormState({
        current: effectiveCurrent,
        proposalId,
        mode,
        items,
        paidByLineMap,
        paidKnownSum,
        allocRows,
        itemsLoading,
        paymentDataErrorMessage,
      }),
    [
      allocRows,
      effectiveCurrent,
      items,
      itemsLoading,
      mode,
      paidByLineMap,
      paidKnownSum,
      paymentDataErrorMessage,
      proposalId,
    ],
  );

  const loadState = proposalId
    ? itemsLoading
      ? "loading"
      : paymentDataErrorMessage
        ? "error"
        : "ready"
    : "idle";

  const commitAllocRows = useCallback(
    (
      nextRows: AccountantPaymentAllocRow[],
      options?: {
        nextInputs?: Record<string, string>;
      },
    ) => {
      lastCommittedAllocSignatureRef.current = buildAllocRowsSignature(nextRows);
      setAllocRows(nextRows);
      if (options?.nextInputs) {
        setLineInputs(options.nextInputs);
      }
    },
    [setAllocRows],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    recordPlatformObservability({
      screen: "accountant",
      surface: "payment_form",
      category: "ui",
      event: "payment_form_opened",
      result: "success",
      sourceKind,
      extra: {
        proposalId: proposalId || null,
      },
    });

    return () => {
      recordPlatformObservability({
        screen: "accountant",
        surface: "payment_form",
        category: "ui",
        event: "payment_form_closed",
        result: "success",
        sourceKind,
        extra: {
          proposalId: proposalId || null,
        },
      });
    };
  }, [proposalId, sourceKind]);

  useEffect(() => {
    setMode("full");
    setItems([]);
    setFinancialCurrent(null);
    setPaidByLineMap(new Map());
    setPaidKnownSum(0);
    setItemsLoading(false);
    setItemsError(null);
    setAllocationsError(null);
    setAllocationUiError(null);
    setLineInputs({});
    lastCommittedAllocSignatureRef.current = "";
    setAllocRows([]);
    setAmount("");
  }, [proposalId, setAllocRows, setAmount]);

  useEffect(() => {
    if (!proposalId) return;

    const requestId = requestSeqRef.current + 1;
    requestSeqRef.current = requestId;
    let completed = false;

    recordPlatformObservability({
      screen: "accountant",
      surface: "payment_form",
      category: "fetch",
      event: "payment_form_request_started",
      result: "success",
      sourceKind,
      extra: {
        proposalId,
        requestId,
      },
    });

    const observation = beginPlatformObservability({
      screen: "accountant",
      surface: "payment_form",
      category: "fetch",
      event: "payment_form_load",
      sourceKind,
      trigger: "open",
      extra: {
        proposalId,
        requestId,
      },
    });

    setItemsLoading(true);
    setItemsError(null);
    setAllocationsError(null);

    void (async () => {
      const financialStateResult = await loadPaymentFormFinancialState(proposalId);

      const isCurrentRequest =
        mountedRef.current &&
        proposalIdRef.current === proposalId &&
        requestSeqRef.current === requestId;

      if (!isCurrentRequest) {
        recordPlatformObservability({
          screen: "accountant",
          surface: "payment_form",
          category: "fetch",
          event: "payment_form_stale_response_ignored",
          result: "skipped",
          sourceKind,
          extra: {
            proposalId,
            requestId,
            guardReason: "stale_response_ignored",
          },
        });
        return;
      }

      const nextItems = financialStateResult.items;
      const nextFinancialCurrent = financialStateResult.current;
      const nextPaidByLineMap = financialStateResult.paidByLineMap;
      const nextPaidKnownSum = financialStateResult.paidKnownSum;
      const nextItemsError: string | null = null;
      const nextAllocationsError = financialStateResult.paymentEligible
        ? null
        : getFinancialEligibilityMessage(financialStateResult.failureCode);

      setItems(nextItems);
      setFinancialCurrent(nextFinancialCurrent);
      setPaidByLineMap(nextPaidByLineMap);
      setPaidKnownSum(nextPaidKnownSum);
      setItemsError(nextItemsError);
      setAllocationsError(nextAllocationsError);
      setItemsLoading(false);
      completed = true;

      if (!financialStateResult.paymentEligible) {
        const failure = new Error(
          nextAllocationsError ?? "Server financial state rejected payment eligibility.",
        );
        recordPaymentFormCatch(
          "critical_fail",
          "proposal_financial_state_ineligible",
          failure,
          {
            publishState: "error",
            requestId,
            failureCode: financialStateResult.failureCode,
          },
        );
        observation.error(failure, {
          errorStage: "proposal_financial_state_ineligible",
          extra: {
            proposalId,
            requestId,
            publishState: "error",
            paymentEligible: financialStateResult.paymentEligible,
            failureCode: financialStateResult.failureCode,
            itemsError: nextItemsError,
            allocationsError: nextAllocationsError,
          },
        });
        return;
      }

      observation.success({
        rowCount: nextItems.length,
        extra: {
          proposalId,
          requestId,
          paidAllocationCount: nextPaidByLineMap.size,
          paymentEligible: financialStateResult.paymentEligible,
          failureCode: financialStateResult.failureCode,
          publishState: "ready",
        },
      });
      recordPlatformObservability({
        screen: "accountant",
        surface: "payment_form",
        category: "ui",
        event: "payment_form_ready",
        result: "success",
        sourceKind,
        extra: {
          proposalId,
          requestId,
          rowCount: nextItems.length,
          paidAllocationCount: nextPaidByLineMap.size,
          paymentEligible: financialStateResult.paymentEligible,
          failureCode: financialStateResult.failureCode,
        },
      });
    })().catch((error) => {
      const isCurrentRequest =
        mountedRef.current &&
        proposalIdRef.current === proposalId &&
        requestSeqRef.current === requestId;

      if (!isCurrentRequest) {
        recordPlatformObservability({
          screen: "accountant",
          surface: "payment_form",
          category: "fetch",
          event: "payment_form_stale_response_ignored",
          result: "skipped",
          sourceKind,
          extra: {
            proposalId,
            requestId,
            guardReason: "stale_response_ignored",
          },
        });
        return;
      }

      const message = getPaymentFormErrorMessage(
        error,
        "Не удалось загрузить серверное финансовое состояние предложения.",
      );
      recordPaymentFormCatch("critical_fail", "proposal_financial_state_load_failed", error, {
        publishState: "error",
        requestId,
      });
      setItems([]);
      setFinancialCurrent(null);
      setPaidByLineMap(new Map());
      setPaidKnownSum(0);
      setItemsError(message);
      setAllocationsError(null);
      setItemsLoading(false);
      observation.error(error, {
        errorStage: "proposal_financial_state_load_failed",
        extra: {
          proposalId,
          requestId,
          publishState: "error",
          itemsError: message,
          allocationsError: null,
        },
      });
    });

    return () => {
      if (!completed) {
        recordPlatformObservability({
          screen: "accountant",
          surface: "payment_form",
          category: "fetch",
          event: "payment_form_request_canceled",
          result: "skipped",
          sourceKind,
          extra: {
            proposalId,
            requestId,
            guardReason: "lifecycle_cleanup",
          },
        });
      }
    };
  }, [proposalId, recordPaymentFormCatch, sourceKind]);

  useEffect(() => {
    const signature = buildAllocRowsSignature(allocRows);
    if (signature === lastCommittedAllocSignatureRef.current) return;
    lastCommittedAllocSignatureRef.current = signature;
    setLineInputs(buildLineInputMap(allocRows));
  }, [allocRows]);

  useEffect(() => {
    if (mode !== "partial") return;
    const next = round2(derived.allocSum);
    const now = round2(nnum(amount));
    if (Math.abs(next - now) <= 0.005) return;
    setAmount(next > 0 ? String(next.toFixed(2)) : "");
  }, [amount, derived.allocSum, mode, setAmount]);

  useEffect(() => {
    try {
      onAllocStatusRef.current?.(derived.allocOk, derived.allocSum);
    } catch (error) {
      recordPaymentFormCatch("soft_failure", "alloc_status_callback_failed", error, {
        allocOk: derived.allocOk,
        allocSum: derived.allocSum,
      });
    }
  }, [derived.allocOk, derived.allocSum, recordPaymentFormCatch]);

  const applyFullAllocSafely = useCallback(
    (trigger: string) => {
      try {
        if (!proposalId) return;

        if (!items.length) {
          setAmount(derived.restProposal > 0 ? String(derived.restProposal.toFixed(2)) : "");
          commitAllocRows([], { nextInputs: {} });
          setAllocationUiError(null);
          return;
        }

        const nextRows = buildFullAllocationRows({
          items,
          remainByLine: derived.remainByLine,
        });

        commitAllocRows(nextRows, {
          nextInputs: buildLineInputMap(nextRows),
        });
        setAmount(derived.restProposal > 0 ? String(derived.restProposal.toFixed(2)) : "");
        setAllocationUiError(null);
      } catch (error) {
        const message = getPaymentFormErrorMessage(
          error,
          "Не удалось пересчитать распределение оплаты.",
        );
        recordPaymentFormCatch("critical_fail", "allocation_recalculation_failed", error, {
          trigger,
        });
        setAllocationUiError(message);
      }
    },
    [
      commitAllocRows,
      derived.remainByLine,
      derived.restProposal,
      items,
      proposalId,
      recordPaymentFormCatch,
      setAmount,
    ],
  );

  useEffect(() => {
    if (mode !== "full") return;
    if (!allocRows?.length) return;

    const sum = round2(
      (allocRows || []).reduce((total, row) => total + nnum(row.amount), 0),
    );

    if (Math.abs(sum - derived.restProposal) > 0.01) {
      applyFullAllocSafely("full_mode_reconcile");
    }
  }, [allocRows, applyFullAllocSafely, derived.restProposal, mode]);

  const selectFullMode = useCallback(() => {
    setMode("full");
    setAllocationUiError(null);
    applyFullAllocSafely("full_mode_select");
  }, [applyFullAllocSafely]);

  const selectPartialMode = useCallback(() => {
    setMode("partial");
    setAmount("");
    setAllocationUiError(null);
    commitAllocRows([], { nextInputs: {} });
  }, [commitAllocRows, setAmount]);

  const clearAlloc = useCallback(() => {
    setAllocationUiError(null);
    commitAllocRows([], { nextInputs: {} });
  }, [commitAllocRows]);

  const setLineAllocInput = useCallback(
    (itemId: string, rawValue: string) => {
      const proposalItemId = String(itemId);
      setAllocationUiError(null);
      setLineInputs((prev) => {
        const next = { ...prev };
        const nextRawValue = String(rawValue ?? "");
        if (nextRawValue) next[proposalItemId] = nextRawValue;
        else delete next[proposalItemId];
        return next;
      });

      const nextRows = applyAllocationRow({
        allocRows,
        itemId: proposalItemId,
        value: nnum(rawValue),
        items,
        remainByLine: derived.remainByLine,
      });

      commitAllocRows(nextRows);
    },
    [allocRows, commitAllocRows, derived.remainByLine, items],
  );

  const commitLineInput = useCallback(
    (itemId: string) => {
      const proposalItemId = String(itemId);
      const committedValue = round2(nnum(derived.allocMap.get(proposalItemId) ?? 0));
      setLineInputs((prev) => {
        const next = { ...prev };
        if (committedValue > 0) next[proposalItemId] = String(committedValue);
        else delete next[proposalItemId];
        return next;
      });
    },
    [derived.allocMap],
  );

  const setLineAllocMax = useCallback(
    (itemId: string) => {
      const proposalItemId = String(itemId);
      const index = items.findIndex((item) => String(item.id) === proposalItemId);
      const remain = index >= 0 ? Math.max(0, nnum(derived.remainByLine[index])) : 0;
      const nextRows = applyAllocationRow({
        allocRows,
        itemId: proposalItemId,
        value: remain,
        items,
        remainByLine: derived.remainByLine,
      });

      const nextInputs = buildLineInputMap(nextRows);
      commitAllocRows(nextRows, { nextInputs });
      setAllocationUiError(null);
    },
    [allocRows, commitAllocRows, derived.remainByLine, items],
  );

  return {
    proposalId,
    mode,
    cur: derived.cur,
    items,
    itemsLoading,
    loadState,
    paymentDataErrorMessage,
    lineInputs,
    restProposal: derived.restProposal,
    lineTotals: derived.lineTotals,
    paidBeforeByLine: derived.paidBeforeByLine,
    paidUnassigned: derived.paidUnassigned,
    remainByLine: derived.remainByLine,
    allocMap: derived.allocMap,
    allocSum: derived.allocSum,
    allocOk: derived.allocOk,
    selectFullMode,
    selectPartialMode,
    setLineAllocInput,
    commitLineInput,
    setLineAllocMax,
    clearAlloc,
  };
}
