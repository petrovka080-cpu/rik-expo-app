// src/screens/warehouse/warehouse.pdf.ts
// Consolidates all 6 PDF generation callbacks into a single hook.
// Zero logic changes — just structural extraction.

import { useCallback } from "react";
import { Platform } from "react-native";
import { runPdfTop } from "../../lib/pdfRunner";
import {
    buildWarehouseIncomingFormHtml,
    exportWarehouseHtmlPdf,
} from "../../lib/api/pdf_warehouse";
import { apiFetchIncomingLines } from "./warehouse.api";

const isMissingName = (v: any): boolean => {
    const s = String(v ?? "").trim();
    if (!s) return true;
    if (/^[-\u2014\u2013\u2212]+$/.test(s)) return true;
    const l = s.toLowerCase();
    if (l === "null" || l === "undefined" || l === "n/a") return true;
    if (l.includes("вђ")) return true;
    return false;
};

type UseWarehousePdfArgs = {
    busy: any;
    supabase: any;
    reportsUi: any;
    reportsMode: "choice" | "issue" | "incoming";
    repIncoming: any[];
    periodFrom: string;
    periodTo: string;
    warehousemanFio: string;
    matNameByCode: Record<string, string>;
    notifyError: (title: string, message?: string) => void;
    orgName: string;
};

export function useWarehousePdf(args: UseWarehousePdfArgs) {
    const {
        busy,
        supabase,
        reportsUi,
        reportsMode,
        repIncoming,
        periodFrom,
        periodTo,
        warehousemanFio,
        matNameByCode,
        notifyError,
        orgName,
    } = args;

    // ── onPdfDocument ──
    const onPdfDocument = useCallback(
        async (docId: string | number) => {
            const pid = String(docId ?? "").trim();
            if (!pid) {
                notifyError("PDF", "Некорректный номер прихода.");
                return;
            }

            if (reportsMode === "incoming") {
                await runPdfTop({
                    busy,
                    supabase,
                    key: `pdf: warehouse: incoming - form:${pid}`,
                    label: "Готовлю приходный ордер...",
                    mode: Platform.OS === "web" ? "preview" : "share",
                    fileName: `Incoming_${pid}`,
                    getRemoteUrl: async () => {
                        const t0 = Date.now();
                        console.info(`INCOMING_PDF_START pr_id=${pid}`);
                        let source: "main" | "fallback" = "main";
                        try {
                            const head = (repIncoming || []).find(
                                (x: any) =>
                                    String(x.incoming_id || "") === pid ||
                                    String(x.id || "") === pid,
                            );

                            const who = String(
                                head?.who ?? head?.warehouseman_fio ?? warehousemanFio ?? "",
                            ).trim() || "—";

                            let lines = await apiFetchIncomingLines(supabase as any, pid);
                            if (!Array.isArray(lines) || lines.length === 0) {
                                source = "fallback";
                                const fallbackLines = await (reportsUi as any).ensureIncomingLines?.(pid);
                                if (Array.isArray(fallbackLines)) lines = fallbackLines;
                            }

                            if (!Array.isArray(lines) || lines.length === 0) {
                                const err = new Error("Нет оприходованных позиций");
                                (err as any).reason = "empty";
                                throw err;
                            }

                            const linesForPdf = (lines || []).map((ln: any) => {
                                const code = String(ln?.code ?? "").trim().toUpperCase();
                                const mapped = String((matNameByCode as any)?.[code] ?? "").trim();
                                const raw = String(
                                    ln?.name_ru ?? ln?.material_name ?? ln?.name ?? "",
                                ).trim();
                                const goodMapped = !isMissingName(mapped);
                                const goodRaw = !isMissingName(raw);
                                return {
                                    ...ln,
                                    material_name: goodMapped ? mapped : goodRaw ? raw : code,
                                };
                            });

                            const incomingHead =
                                head ??
                                ({
                                    incoming_id: pid,
                                    event_dt: null,
                                    display_no: `PR-${pid.slice(0, 8)}`,
                                    warehouseman_fio: who,
                                    who,
                                } as any);

                            const html = buildWarehouseIncomingFormHtml({
                                incoming: incomingHead,
                                lines: linesForPdf,
                                orgName: orgName || "ООО «РИК»",
                                warehouseName: "Главный склад",
                            });

                            const url = await exportWarehouseHtmlPdf({
                                fileName: `Incoming_${pid}`,
                                html,
                            });

                            console.info(
                                `INCOMING_PDF_OK pr_id=${pid} ms=${Date.now() - t0} source=${source}`,
                            );
                            return url;
                        } catch (e: any) {
                            const msg = String(e?.message ?? "").toLowerCase();
                            const reason =
                                String(e?.reason ?? "").trim() ||
                                (msg.includes("timeout") ? "timeout" : "build_error");
                            console.error(`INCOMING_PDF_FAIL pr_id=${pid} reason=${reason}`, e);
                            throw e;
                        }
                    },
                });
                return;
            }

            await runPdfTop({
                busy,
                supabase,
                key: `pdf: warehouse: issue - form:${docId}`,
                label: "Готовлю накладную...",
                mode: Platform.OS === "web" ? "preview" : "share",
                fileName: `Issue_${docId}`,
                getRemoteUrl: async () => await reportsUi.buildIssueHtml(Number(docId)),
            });
        },
        [busy, supabase, reportsUi, reportsMode, repIncoming, warehousemanFio, notifyError, matNameByCode, orgName],
    );

    // ── onPdfRegister ──
    const onPdfRegister = useCallback(async () => {
        const isIncoming = reportsMode === "incoming";
        await runPdfTop({
            busy,
            supabase,
            key: `pdf: warehouse: ${isIncoming ? "incoming" : "issues"} - register:${periodFrom || "all"}:${periodTo || "all"} `,
            label: "Готовлю реестр…",
            mode: Platform.OS === "web" ? "preview" : "share",
            fileName: `WH_${isIncoming ? "Incoming" : "Issues"}_Register_${periodFrom || "all"}_${periodTo || "all"} `,
            getRemoteUrl: async () =>
                isIncoming
                    ? await reportsUi.buildIncomingRegisterHtml()
                    : await reportsUi.buildRegisterHtml(),
        });
    }, [busy, supabase, periodFrom, periodTo, reportsUi, reportsMode]);

    // ── onPdfMaterials ──
    const onPdfMaterials = useCallback(async () => {
        const isIncoming = reportsMode === "incoming";
        await runPdfTop({
            busy,
            supabase,
            key: `pdf: warehouse: materials:${isIncoming ? "incoming" : "issues"}:${periodFrom || "all"}:${periodTo || "all"} `,
            label: "Готовлю свод материалов…",
            mode: Platform.OS === "web" ? "preview" : "share",
            fileName: `WH_${isIncoming ? "Incoming" : "Issued"}_Materials_${periodFrom || "all"}_${periodTo || "all"} `,
            getRemoteUrl: async () =>
                isIncoming
                    ? await (reportsUi as any).buildIncomingMaterialsReportPdf()
                    : await reportsUi.buildMaterialsReportPdf(),
        });
    }, [busy, supabase, periodFrom, periodTo, reportsUi, reportsMode]);

    // ── onPdfObjectWork ──
    const onPdfObjectWork = useCallback(async () => {
        await runPdfTop({
            busy,
            supabase,
            key: `pdf: warehouse: objwork:${periodFrom || "all"}:${periodTo || "all"} `,
            label: "Готовлю отчёт по объектам…",
            mode: Platform.OS === "web" ? "preview" : "share",
            fileName: `WH_ObjectWork_${periodFrom || "all"}_${periodTo || "all"} `,
            getRemoteUrl: async () => await reportsUi.buildObjectWorkReportPdf(),
        });
    }, [busy, supabase, periodFrom, periodTo, reportsUi]);

    // ── onPdfDayRegister ──
    const onPdfDayRegister = useCallback(
        async (dayLabel: string) => {
            const isIncoming = reportsMode === "incoming";
            await runPdfTop({
                busy,
                supabase,
                key: `pdf: warehouse: day - register:${isIncoming ? "incoming" : "issues"}:${dayLabel} `,
                label: "Готовлю реестр за день…",
                mode: Platform.OS === "web" ? "preview" : "share",
                fileName: `WH_${isIncoming ? "Incoming" : "Register"}_${String(dayLabel).trim().replace(/\s+/g, "_")} `,
                getRemoteUrl: async () =>
                    isIncoming
                        ? await (reportsUi as any).buildDayIncomingRegisterPdf(dayLabel)
                        : await (reportsUi as any).buildDayRegisterPdf(dayLabel),
            });
        },
        [busy, supabase, reportsUi, reportsMode],
    );

    // ── onPdfDayMaterials ──
    const onPdfDayMaterials = useCallback(
        async (dayLabel: string) => {
            const isIncoming = reportsMode === "incoming";
            await runPdfTop({
                busy,
                supabase,
                key: `pdf: warehouse: day - materials:${isIncoming ? "incoming" : "issues"}:${dayLabel} `,
                label: "Готовлю свод материалов за день…",
                mode: Platform.OS === "web" ? "preview" : "share",
                fileName: `WH_${isIncoming ? "Incoming" : "Issued"}_DayMaterials_${String(dayLabel).trim().replace(/\s+/g, "_")} `,
                getRemoteUrl: async () =>
                    isIncoming
                        ? await (reportsUi as any).buildDayIncomingMaterialsReportPdf(dayLabel)
                        : await (reportsUi as any).buildDayMaterialsReportPdf(dayLabel),
            });
        },
        [busy, supabase, reportsUi, reportsMode],
    );

    return {
        onPdfDocument,
        onPdfRegister,
        onPdfMaterials,
        onPdfObjectWork,
        onPdfDayRegister,
        onPdfDayMaterials,
    };
}
