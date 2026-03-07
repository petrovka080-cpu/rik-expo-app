import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import {
    requestSubmit,
    requestItemUpdateQty,
    requestItemCancel,
    type ReqItemRow,
} from '../../../lib/catalog_api';
import {
    aggCalcRows,
    aggPickedRows,
    requestItemAddOrIncAndPatchMeta,
    runPool,
    toErrorText,
    parseQtyValue,
    formatQtyInput,
} from '../foreman.helpers';
import { FOREMAN_TEXT } from '../foreman.ui';
import type { CalcRow, PickedRow, RequestDraftMeta } from '../foreman.types';

type DraftAppendRow = {
    rik_code: string;
    qty: number;
    errorLabel: string;
    meta: {
        note?: string | null;
        app_code?: string | null;
        kind?: string | null;
        name_human?: string | null;
        uom?: string | null;
    };
};

type UseForemanActionsProps = {
    requestId: string;
    ensureRequestId: () => Promise<string>;
    loadItems: (rid?: string) => Promise<void>;
    syncRequestHeaderMeta: (rid: string, context: string) => Promise<void>;
    scopeNote: string;
    isDraftActive: boolean;
    canEditRequestItem: (item: ReqItemRow) => boolean;
    setItems: React.Dispatch<React.SetStateAction<ReqItemRow[]>>;
    setQtyDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setRowBusy: (id: string | number, busy: boolean) => void;
    items: ReqItemRow[];
    qtyDrafts: Record<string, string>;
    ensureEditableContext: (opts?: { draftFirst?: boolean; draftMessage?: string }) => boolean;
    ensureCanSubmitToDirector: () => boolean;
    applySubmittedRequestState: (rid: string, submitted: any) => void;
    finalizeAfterSubmit: () => Promise<void>;
    showHint: (title: string, message: string) => void;
    setBusy: (busy: boolean) => void;
    alertError: (error: unknown, fallback: string) => void;
    webUi: any;
};

export function useForemanActions({
    requestId,
    ensureRequestId,
    loadItems,
    syncRequestHeaderMeta,
    scopeNote,
    isDraftActive,
    canEditRequestItem,
    setItems,
    setQtyDrafts,
    setRowBusy,
    items,
    qtyDrafts,
    ensureEditableContext,
    ensureCanSubmitToDirector,
    applySubmittedRequestState,
    finalizeAfterSubmit,
    showHint,
    setBusy,
    alertError,
    webUi,
}: UseForemanActionsProps) {

    const appendRowsToDraft = useCallback(
        async (rid: string, rows: DraftAppendRow[]) => {
            const POOL = Platform.OS === 'web' ? 10 : 6;
            const results = await runPool(rows, POOL, async (row) => {
                await requestItemAddOrIncAndPatchMeta(rid, row.rik_code, row.qty, row.meta);
                return true;
            });

            const okCount = results.filter((r) => r.ok).length;
            const failCount = results.length - okCount;
            const failLines: string[] = [];

            for (let i = 0; i < results.length; i++) {
                const r = results[i];
                const src = rows[i];
                const code = String(src?.rik_code ?? '—');
                const name = String(src?.errorLabel ?? '').trim() || code;
                if (!("error" in r)) continue;
                const msg = toErrorText(r.error).replace(/\s+/g, ' ').trim();
                failLines.push(`• ${name} (${code}) — ${msg}`);
                if (failLines.length >= 4) break;
            }

            return { okCount, failCount, failLines };
        },
        [],
    );

    const commitCatalogToDraft = useCallback(async (rows: PickedRow[]) => {
        if (!rows?.length) return;
        if (!ensureEditableContext()) return;

        setBusy(true);
        try {
            const rid = await ensureRequestId();
            await syncRequestHeaderMeta(rid, "commitCatalogToDraft");
            const aggregated = aggPickedRows(rows);

            const prepared: DraftAppendRow[] = aggregated.map((x) => {
                const r = x.base;
                return {
                    rik_code: r.rik_code,
                    qty: x.qty,
                    errorLabel: r.name,
                    meta: {
                        note: scopeNote,
                        app_code: r.app_code ?? null,
                        kind: r.kind ?? null,
                        name_human: r.name,
                        uom: r.uom ?? null,
                    },
                };
            });

            const { okCount, failCount } = await appendRowsToDraft(rid, prepared);
            if (failCount > 0) {
                Alert.alert('Каталог (частично)', `Добавлено: ${okCount}\nОшибок: ${failCount}`);
            }
            await loadItems(rid);
        } catch (e: unknown) {
            alertError(e, FOREMAN_TEXT.catalogAddError);
        } finally {
            setBusy(false);
        }
    }, [
        ensureRequestId,
        ensureEditableContext,
        loadItems,
        syncRequestHeaderMeta,
        appendRowsToDraft,
        scopeNote,
        setBusy,
        alertError,
    ]);

    const commitQtyChange = useCallback(
        async (item: ReqItemRow, draftValue: string) => {
            const key = String(item.id);
            if (!isDraftActive || !requestId || !canEditRequestItem(item)) {
                setQtyDrafts((prev) => ({ ...prev, [key]: formatQtyInput(item.qty) }));
                return;
            }

            const parsed = parseQtyValue(draftValue);
            if (!Number.isFinite(parsed) || parsed <= 0) {
                Alert.alert(FOREMAN_TEXT.qtyTitle, FOREMAN_TEXT.qtyPositiveHint);
                setQtyDrafts((prev) => ({ ...prev, [key]: formatQtyInput(item.qty) }));
                return;
            }

            const original = Number(item.qty ?? 0);
            if (Math.abs(parsed - original) < 1e-9) {
                setQtyDrafts((prev) => ({ ...prev, [key]: formatQtyInput(item.qty) }));
                return;
            }

            setRowBusy(item.id, true);
            try {
                const updated = await requestItemUpdateQty(key, parsed, requestId);
                if (updated) {
                    setItems((prev) =>
                        prev.map((row) =>
                            row.id === updated.id ? { ...row, qty: updated.qty } : row,
                        ),
                    );
                    setQtyDrafts((prev) => ({
                        ...prev,
                        [key]: formatQtyInput(updated.qty),
                    }));
                }
            } catch (e: unknown) {
                alertError(e, FOREMAN_TEXT.qtyUpdateError);
                setQtyDrafts((prev) => ({ ...prev, [key]: formatQtyInput(item.qty) }));
            } finally {
                setRowBusy(item.id, false);
            }
        },
        [
            canEditRequestItem,
            isDraftActive,
            requestId,
            requestItemUpdateQty,
            setItems,
            setQtyDrafts,
            alertError,
            setRowBusy,
        ],
    );

    const syncPendingQtyDrafts = useCallback(async () => {
        for (const item of items) {
            if (!canEditRequestItem(item)) continue;
            const key = String(item.id);
            const draftVal = qtyDrafts[key];
            const currentFormatted = formatQtyInput(item.qty);

            if (
                typeof draftVal === 'string' &&
                draftVal.trim() !== '' &&
                draftVal.trim() !== currentFormatted
            ) {
                await commitQtyChange(item, draftVal);
            }
        }
    }, [canEditRequestItem, commitQtyChange, items, qtyDrafts]);

    const submitToDirector = useCallback(async () => {
        if (!ensureCanSubmitToDirector()) return;

        setBusy(true);
        try {
            const rid = await ensureRequestId();
            await syncPendingQtyDrafts();
            await syncRequestHeaderMeta(rid, 'submitToDirector');
            const submitted = await requestSubmit(rid);
            applySubmittedRequestState(rid, submitted);

            const submittedLabel = submitted?.display_no || rid;
            showHint(
                FOREMAN_TEXT.submitSentTitle,
                `Заявка ${submittedLabel} отправлена на утверждение`,
            );
            await finalizeAfterSubmit();
        } catch (e: unknown) {
            alertError(e, FOREMAN_TEXT.submitError);
        } finally {
            setBusy(false);
        }
    }, [
        ensureRequestId,
        applySubmittedRequestState,
        finalizeAfterSubmit,
        ensureCanSubmitToDirector,
        syncPendingQtyDrafts,
        syncRequestHeaderMeta,
        setBusy,
        alertError,
        showHint,
    ]);

    const cancelRowAndRemove = useCallback(
        async (itemId: string | number) => {
            setRowBusy(itemId, true);
            try {
                await requestItemCancel(String(itemId));
                setItems((prev) => prev.filter((r) => r.id !== itemId));
            } finally {
                setRowBusy(itemId, false);
            }
        },
        [setRowBusy, setItems],
    );

    const handleRemoveDraftRow = useCallback(
        async (it: ReqItemRow) => {
            const confirmMsg = `${FOREMAN_TEXT.deleteConfirmTitle}\n\n${it.name_human || FOREMAN_TEXT.deleteConfirmFallback}`;

            if (Platform.OS === 'web') {
                const ok = webUi.confirm?.(confirmMsg) ?? false;
                if (!ok) return;
                await cancelRowAndRemove(it.id);
                webUi.alert?.(FOREMAN_TEXT.deleteDone);
                return;
            }

            Alert.alert(FOREMAN_TEXT.deleteConfirmTitle, it.name_human || FOREMAN_TEXT.deleteConfirmFallback, [
                { text: 'Нет', style: 'cancel' },
                {
                    text: 'Отменить',
                    style: 'destructive',
                    onPress: async () => {
                        await cancelRowAndRemove(it.id);
                    },
                },
            ]);
        },
        [cancelRowAndRemove, webUi],
    );

    const handleCalcAddToRequest = useCallback(
        async (rows: CalcRow[]) => {
            if (!rows || rows.length === 0) return;
            if (!ensureEditableContext()) return;

            setBusy(true);
            try {
                const rid = await ensureRequestId();
                await syncRequestHeaderMeta(rid, "handleCalcAddToRequest");

                const aggregated = aggCalcRows(rows);
                const prepared: DraftAppendRow[] = aggregated.map((row) => {
                    const displayName = row.item_name_ru ?? row.name_human ?? row.name_ru ?? row.name ?? '—';
                    return {
                        rik_code: row.rik_code,
                        qty: row.qty,
                        errorLabel: displayName,
                        meta: {
                            note: scopeNote,
                            app_code: null,
                            kind: null,
                            name_human: displayName,
                            uom: row.uom_code ?? null,
                        },
                    };
                });

                const { okCount, failCount, failLines } = await appendRowsToDraft(rid, prepared);
                await loadItems(rid);

                if (failCount > 0) {
                    const tail = failCount > failLines.length ? `\n…ещё ${failCount - failLines.length} ошибок` : '';
                    Alert.alert(
                        'Готово (частично)',
                        `Добавлено: ${okCount}\nОшибок: ${failCount}\n\nПроблемные позиции:\n${failLines.join('\n')}${tail}`
                    );
                } else {
                    Alert.alert('Готово', `Добавлено позиций: ${okCount}`);
                }
            } catch (e: unknown) {
                alertError(e, FOREMAN_TEXT.calcAddError);
            } finally {
                setBusy(false);
            }
        },
        [
            ensureRequestId,
            loadItems,
            ensureEditableContext,
            syncRequestHeaderMeta,
            appendRowsToDraft,
            scopeNote,
            setBusy,
            alertError,
        ],
    );

    return {
        commitCatalogToDraft,
        commitQtyChange,
        syncPendingQtyDrafts,
        submitToDirector,
        handleRemoveDraftRow,
        handleCalcAddToRequest,
    };
}
