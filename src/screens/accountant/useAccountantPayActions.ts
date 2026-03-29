import { useCallback } from "react";
import { Alert, Platform } from "react-native";

import { accountantAddPaymentWithAllocations } from "../../lib/api/accountant";
import { recordCatchDiscipline } from "../../lib/observability/catchDiscipline";
import { beginPlatformObservability } from "../../lib/observability/platformObservability";

type AllocRow = { proposal_item_id: string; amount: number };
type RowBase = { proposal_id?: string | number; invoice_amount?: number | null; total_paid?: number | null };

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
  persistInvoiceMetaIfNeeded: (proposalId: string) => Promise<void>;
  afterPaymentSync: (proposalId: string) => Promise<unknown>;
  closeCard: () => void;
  setCurrentPaymentId: (id: number | null) => void;
  setRows: React.Dispatch<React.SetStateAction<T[]>>;
  safeAlert: (title: string, msg: string) => void;
  errText: (e: unknown) => string;
};

const paymentActionSourceKind = (proposalId: unknown) =>
  String(proposalId ?? "").trim() ? "proposal:payment_apply" : "payment:manual_form";

export function useAccountantPayActions<T extends RowBase>(p: Params<T>) {
  const EPS = 0.01;

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
          ...extra,
        },
      });
    },
    [p.current?.proposal_id],
  );

  const showPaymentFailure = useCallback(
    (title: string, e: unknown) => {
      const msg = p.errText(e);
      p.safeAlert(title, msg);
      console.error("[accountant.payment]", msg);
    },
    [p],
  );

  const showPaymentSyncWarning = useCallback(
    (e: unknown) => {
      p.safeAlert(
        "Р С›Р С—Р В»Р В°РЎвЂљР В° Р С—РЎР‚Р С•Р Р†Р ВµР Т‘Р ВµР Р…Р В° РЎРѓ Р С—РЎР‚Р ВµР Т‘РЎС“Р С—РЎР‚Р ВµР В¶Р Т‘Р ВµР Р…Р С‘Р ВµР С",
        `Р СџР В»Р В°РЎвЂљРЎвЂР В¶ РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…РЎвЂР Р…, Р Р…Р С• Р С•Р В±Р Р…Р С•Р Р†Р В»Р ВµР Р…Р С‘Р Вµ РЎРЊР С”РЎР‚Р В°Р Р…Р В° Р Р…Р Вµ Р В·Р В°Р Р†Р ВµРЎР‚РЎв‚¬Р С‘Р В»Р С•РЎРѓРЎРЉ: ${p.errText(e)}`,
      );
      console.error("[accountant.payment.sync]", e);
    },
    [p],
  );

  const payRest = useCallback(async () => {
    if (!p.canAct) {
      p.safeAlert("Р СњР ВµРЎвЂљ Р С—РЎР‚Р В°Р Р†", "Р СњРЎС“Р В¶Р Р…Р В° РЎР‚Р С•Р В»РЎРЉ Р’В«accountantР’В».");
      return;
    }
    if (!p.current?.proposal_id) return;

    try {
      const sum = Number(p.current?.invoice_amount ?? 0);
      const paid = Number(p.current?.total_paid ?? 0);
      const rest = sum > 0 ? Math.max(0, sum - paid) : 0;
      if (!rest || rest <= 0) {
        p.safeAlert("Р С›РЎРѓРЎвЂљР В°РЎвЂљР С•Р С”", "Р СњР ВµРЎвЂљ РЎРѓРЎС“Р СР СРЎвЂ№ Р С” Р С•Р С—Р В»Р В°РЎвЂљР Вµ.");
        return;
      }

      const fio = p.accountantFio.trim();
      if (!fio) {
        p.safeAlert("Р В¤Р ВР С› Р В±РЎС“РЎвЂ¦Р С–Р В°Р В»РЎвЂљР ВµРЎР‚Р В°", "Р СџР С•Р В»Р Вµ Р С•Р В±РЎРЏР В·Р В°РЎвЂљР ВµР В»РЎРЉР Р…Р С•");
        return;
      }

      const pidMeta = String(p.current?.proposal_id ?? "").trim();
      if (pidMeta) await p.persistInvoiceMetaIfNeeded(pidMeta);

      const observation = beginPlatformObservability({
        screen: "accountant",
        surface: "payment_form_apply",
        category: "ui",
        event: "payment_apply",
        sourceKind: paymentActionSourceKind(pidMeta),
        trigger: "pay_rest",
        extra: {
          proposalId: pidMeta || null,
          mode: "rest",
          allocationCount: p.allocRows.length,
        },
      });

      const payId = await accountantAddPaymentWithAllocations({
        proposalId: String(p.current.proposal_id),
        amount: rest,
        accountantFio: fio,
        purpose: `${p.purposePrefix} ${p.note || ""}`.trim(),
        method: p.payKind === "bank" ? "Р В±Р В°Р Р…Р С”" : "Р Р…Р В°Р В»",
        note: p.note?.trim() ? p.note.trim() : null,
        allocations: p.allocRows,
      });
      if (payId) p.setCurrentPaymentId(Number(payId));

      const pid = String(p.current?.proposal_id ?? "").trim();
      try {
        await p.afterPaymentSync(pid);
      } catch (e: unknown) {
        recordPaymentActionCatch("soft_failure", "payment_apply_sync_failed", e, {
          mode: "rest",
        });
        showPaymentSyncWarning(e);
        return;
      }

      if (pid) p.setRows((prev) => prev.filter((r) => String(r.proposal_id) !== pid));
      observation.success({
        extra: {
          proposalId: pid || null,
          mode: "rest",
          paymentId: payId ?? null,
          allocationCount: p.allocRows.length,
        },
      });
      p.safeAlert("Р вЂњР С•РЎвЂљР С•Р Р†Р С•", "Р С›Р С—Р В»Р В°РЎвЂљР В° Р С—РЎР‚Р С•Р Р†Р ВµР Т‘Р ВµР Р…Р В°.");
      p.closeCard();
    } catch (e: unknown) {
      recordPaymentActionCatch("critical_fail", "payment_apply_failed", e, {
        mode: "rest",
      });
      showPaymentFailure("Р С›РЎв‚¬Р С‘Р В±Р С”Р В° Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№", e);
    }
  }, [p, recordPaymentActionCatch, showPaymentFailure, showPaymentSyncWarning]);

  const addPayment = useCallback(async () => {
    if (!p.canAct) {
      p.safeAlert("Р СњР ВµРЎвЂљ Р С—РЎР‚Р В°Р Р†", "Р СњРЎС“Р В¶Р Р…Р В° РЎР‚Р С•Р В»РЎРЉ Р’В«accountantР’В».");
      return;
    }
    if (!p.current?.proposal_id) return;

    const val = Number(String(p.amount).replace(",", "."));
    if (!val || val <= 0) {
      p.safeAlert("Р вЂ™Р Р†Р ВµР Т‘Р С‘РЎвЂљР Вµ РЎРѓРЎС“Р СР СРЎС“", "Р РЋРЎС“Р СР СР В° Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№ Р Т‘Р С•Р В»Р В¶Р Р…Р В° Р В±РЎвЂ№РЎвЂљРЎРЉ Р В±Р С•Р В»РЎРЉРЎв‚¬Р Вµ 0");
      return;
    }

    try {
      const fio = p.accountantFio.trim();
      if (!fio) {
        p.safeAlert("Р В¤Р ВР С› Р В±РЎС“РЎвЂ¦Р С–Р В°Р В»РЎвЂљР ВµРЎР‚Р В°", "Р СџР С•Р В»Р Вµ Р С•Р В±РЎРЏР В·Р В°РЎвЂљР ВµР В»РЎРЉР Р…Р С•");
        return;
      }

      const inv0 = Number(p.current?.invoice_amount ?? 0);
      const paid0 = Number(p.current?.total_paid ?? 0);
      const rest0 = inv0 > 0 ? Math.max(0, inv0 - paid0) : 0;

      if (rest0 > EPS && Math.abs(val - rest0) <= EPS) {
        const ok =
          Platform.OS === "web"
            ? window.confirm("Р РЋРЎС“Р СР СР В° РЎР‚Р В°Р Р†Р Р…Р В° Р С•РЎРѓРЎвЂљР В°РЎвЂљР С”РЎС“. Р СџРЎР‚Р С•Р Р†Р ВµРЎРѓРЎвЂљР С‘ Р С•Р С—Р В»Р В°РЎвЂљРЎС“ Р С”Р В°Р С” Р СџР С›Р вЂєР СњР Р€Р В®?")
            : await new Promise<boolean>((resolve) => {
                Alert.alert(
                  "Р СџР С•РЎвЂЎРЎвЂљР С‘ Р С—Р С•Р В»Р Р…Р В°РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљР В°",
                  "Р РЋРЎС“Р СР СР В° РЎР‚Р В°Р Р†Р Р…Р В° Р С•РЎРѓРЎвЂљР В°РЎвЂљР С”РЎС“. Р СџРЎР‚Р С•Р Р†Р ВµРЎРѓРЎвЂљР С‘ Р С”Р В°Р С” Р С—Р С•Р В»Р Р…РЎС“РЎР‹ Р С•Р С—Р В»Р В°РЎвЂљРЎС“?",
                  [
                    { text: "Р СњР ВµРЎвЂљ", style: "cancel", onPress: () => resolve(false) },
                    { text: "Р вЂќР В°", style: "default", onPress: () => resolve(true) },
                  ],
                );
              });
        if (ok) {
          await payRest();
          return;
        }
      }

      const pidMeta = String(p.current?.proposal_id ?? "").trim();
      if (pidMeta) await p.persistInvoiceMetaIfNeeded(pidMeta);

      const observation = beginPlatformObservability({
        screen: "accountant",
        surface: "payment_form_apply",
        category: "ui",
        event: "payment_apply",
        sourceKind: paymentActionSourceKind(pidMeta),
        trigger: "add_payment",
        extra: {
          proposalId: pidMeta || null,
          mode: "partial_or_custom",
          allocationCount: p.allocRows.length,
        },
      });

      const payId = await accountantAddPaymentWithAllocations({
        proposalId: String(p.current.proposal_id),
        amount: val,
        accountantFio: fio,
        purpose: `${p.purposePrefix} ${p.note || ""}`.trim(),
        method: p.payKind === "bank" ? "Р В±Р В°Р Р…Р С”" : "Р Р…Р В°Р В»",
        note: p.note?.trim() ? p.note.trim() : null,
        allocations: Array.isArray(p.allocRows) ? p.allocRows : [],
      });
      if (payId) p.setCurrentPaymentId(Number(payId));

      const pid = String(p.current?.proposal_id ?? "").trim();
      try {
        await p.afterPaymentSync(pid);
      } catch (e: unknown) {
        recordPaymentActionCatch("soft_failure", "payment_apply_sync_failed", e, {
          mode: "partial_or_custom",
        });
        showPaymentSyncWarning(e);
        return;
      }

      if (pid) p.setRows((prev) => prev.filter((r) => String(r.proposal_id) !== pid));
      observation.success({
        extra: {
          proposalId: pid || null,
          mode: "partial_or_custom",
          paymentId: payId ?? null,
          allocationCount: p.allocRows.length,
        },
      });
      p.safeAlert("Р С›Р С—Р В»Р В°РЎвЂљР В° Р Т‘Р С•Р В±Р В°Р Р†Р В»Р ВµР Р…Р В°", "Р РЋРЎвЂљР В°РЎвЂљРЎС“РЎРѓ Р С•Р В±Р Р…Р С•Р Р†Р В»РЎвЂР Р… Р С—Р С• РЎвЂћР В°Р С”РЎвЂљРЎС“ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№.");
      p.closeCard();
    } catch (e: unknown) {
      recordPaymentActionCatch("critical_fail", "payment_apply_failed", e, {
        mode: "partial_or_custom",
      });
      showPaymentFailure("Р С›РЎв‚¬Р С‘Р В±Р С”Р В° Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№", e);
    }
  }, [p, payRest, recordPaymentActionCatch, showPaymentFailure, showPaymentSyncWarning]);

  const onPayConfirm = useCallback(async () => {
    const v = Number(String(p.amount).replace(",", "."));
    if (!v || v <= 0) {
      p.safeAlert("Р С›Р С—Р В»Р В°РЎвЂљР В°", "Р вЂ™Р Р†Р ВµР Т‘Р С‘РЎвЂљР Вµ РЎРѓРЎС“Р СР СРЎС“ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№");
      return;
    }
    if (!p.allocOk) {
      p.safeAlert(
        "Р С›Р С—Р В»Р В°РЎвЂљР В°",
        "Р РЋР Р…Р В°РЎвЂЎР В°Р В»Р В° РЎР‚Р В°РЎРѓР С—РЎР‚Р ВµР Т‘Р ВµР В»Р С‘РЎвЂљР Вµ РЎРѓРЎС“Р СР СРЎС“ Р С—Р С• Р С—Р С•Р В·Р С‘РЎвЂ Р С‘РЎРЏР С: РЎР‚Р В°РЎРѓР С—РЎР‚Р ВµР Т‘Р ВµР В»Р ВµР Р…Р С• Р Т‘Р С•Р В»Р В¶Р Р…Р С• Р В±РЎвЂ№РЎвЂљРЎРЉ РЎР‚Р В°Р Р†Р Р…Р С• РЎРѓРЎС“Р СР СР Вµ Р С—Р В»Р В°РЎвЂљР ВµР В¶Р В°.",
      );
      return;
    }

    const ok =
      Platform.OS === "web"
        ? window.confirm(`Р СџРЎР‚Р С•Р Р†Р ВµРЎРѓРЎвЂљР С‘ Р С•Р С—Р В»Р В°РЎвЂљРЎС“ Р Р…Р В° РЎРѓРЎС“Р СР СРЎС“ ${v}?`)
        : await new Promise<boolean>((resolve) => {
            Alert.alert(
              "Р СџР С•Р Т‘РЎвЂљР Р†Р ВµРЎР‚Р Т‘Р С‘РЎвЂљР Вµ Р С•Р С—Р В»Р В°РЎвЂљРЎС“",
              `Р вЂ™РЎвЂ№ Р Р†Р Р†Р ВµР В»Р С‘ РЎРѓРЎС“Р СР СРЎС“: ${v}. Р СџРЎР‚Р С•Р Р†Р ВµРЎРѓРЎвЂљР С‘ Р С•Р С—Р В»Р В°РЎвЂљРЎС“?`,
              [
                { text: "Р С›РЎвЂљР СР ВµР Р…Р В°", style: "cancel", onPress: () => resolve(false) },
                { text: "Р СџРЎР‚Р С•Р Р†Р ВµРЎРѓРЎвЂљР С‘", style: "default", onPress: () => resolve(true) },
              ],
            );
          });

    if (!ok) return;
    await addPayment();
  }, [p, addPayment]);

  return { payRest, addPayment, onPayConfirm };
}
