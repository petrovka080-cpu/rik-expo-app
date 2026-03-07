// src/screens/warehouse/warehouse.pdf.ts
// Consolidates all 6 PDF generation callbacks into a single hook.
// Zero logic changes вЂ” just structural extraction.

import { useCallback } from "react";
import { Platform } from "react-native";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runPdfTop } from "../../lib/pdfRunner";
import {
    buildWarehouseIncomingFormHtml,
    exportWarehouseHtmlPdf,
} from "../../lib/api/pdf_warehouse";
import { apiFetchIncomingLines } from "./warehouse.api";

type BusyLike = {
    run?: <T>(
        fn: () => Promise<T>,
        opts?: { key?: string; label?: string; minMs?: number },
    ) => Promise<T | null>;
    isBusy?: (key?: string) => boolean;
    show?: (key?: string, label?: string) => void;
    hide?: (key?: string) => void;
};

type IncomingHeadLike = {
    incoming_id?: string | number | null;
    id?: string | number | null;
    who?: string | null;
    warehouseman_fio?: string | null;
    event_dt?: string | null;
    display_no?: string | null;
};

type IncomingLineLike = Record<string, unknown>;

type ReportsUiLike = {
    ensureIncomingLines?: (incomingId: string) => Promise<IncomingLineLike[] | null | undefined> | IncomingLineLike[] | null | undefined;
    buildIssueHtml: (docId: number) => Promise<string>;
    buildIncomingRegisterHtml: () => Promise<string>;
    buildRegisterHtml: () => Promise<string>;
    buildIncomingMaterialsReportPdf: () => Promise<string>;
    buildMaterialsReportPdf: () => Promise<string>;
    buildObjectWorkReportPdf: () => Promise<string>;
    buildDayIncomingRegisterPdf: (dayLabel: string) => Promise<string>;
    buildDayRegisterPdf: (dayLabel: string) => Promise<string>;
    buildDayIncomingMaterialsReportPdf: (dayLabel: string) => Promise<string>;
    buildDayMaterialsReportPdf: (dayLabel: string) => Promise<string>;
};

const isMissingName = (v: unknown): boolean => {
    const s = String(v ?? "").trim();
    if (!s) return true;
    if (/^[-\u2014\u2013\u2212]+$/.test(s)) return true;
    const l = s.toLowerCase();
    if (l === "null" || l === "undefined" || l === "n/a") return true;
    if (l.includes("РІС’")) return true;
    return false;
};

type UseWarehousePdfArgs = {
    busy: BusyLike;
    supabase: SupabaseClient;
    reportsUi: ReportsUiLike;
    reportsMode: "choice" | "issue" | "incoming";
    repIncoming: IncomingHeadLike[];
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

    // в”Ђв”Ђ onPdfDocument в”Ђв”Ђ
    const onPdfDocument = useCallback(
        async (docId: string | number) => {
            const pid = String(docId ?? "").trim();
            if (!pid) {
                notifyError("PDF", "РќРµРєРѕСЂСЂРµРєС‚РЅС‹Р№ РЅРѕРјРµСЂ РїСЂРёС…РѕРґР°.");
                return;
            }

            if (reportsMode === "incoming") {
                await runPdfTop({
                    busy,
                    supabase,
                    key: `pdf: warehouse: incoming - form:${pid}`,
                    label: "Р“РѕС‚РѕРІР»СЋ РїСЂРёС…РѕРґРЅС‹Р№ РѕСЂРґРµСЂ...",
                    mode: Platform.OS === "web" ? "preview" : "share",
                    fileName: `Incoming_${pid}`,
                    getRemoteUrl: async () => {
                        const t0 = Date.now();
                        console.info(`INCOMING_PDF_START pr_id=${pid}`);
                        let source: "main" | "fallback" = "main";
                        try {
                            const head = (repIncoming || []).find(
                                (x) =>
                                    String(x.incoming_id || "") === pid ||
                                    String(x.id || "") === pid,
                            );

                            const who = String(
                                head?.who ?? head?.warehouseman_fio ?? warehousemanFio ?? "",
                            ).trim() || "вЂ”";

                            let lines = await apiFetchIncomingLines(supabase, pid);
                            if (!Array.isArray(lines) || lines.length === 0) {
                                source = "fallback";
                                const fallbackLines = await reportsUi.ensureIncomingLines?.(pid);
                                if (Array.isArray(fallbackLines)) lines = fallbackLines;
                            }

                            if (!Array.isArray(lines) || lines.length === 0) {
                                const err = new Error("РќРµС‚ РѕРїСЂРёС…РѕРґРѕРІР°РЅРЅС‹С… РїРѕР·РёС†РёР№") as Error & { reason?: string };
                                err.reason = "empty";
                                throw err;
                            }

                            const linesForPdf = (lines || []).map((ln: IncomingLineLike) => {
                                const code = String(ln?.code ?? "").trim().toUpperCase();
                                const mapped = String(matNameByCode?.[code] ?? "").trim();
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
                                } as IncomingHeadLike);

                            const html = buildWarehouseIncomingFormHtml({
                                incoming: incomingHead,
                                lines: linesForPdf,
                                orgName: orgName || "РћРћРћ В«Р РРљВ»",
                                warehouseName: "Р“Р»Р°РІРЅС‹Р№ СЃРєР»Р°Рґ",
                            });

                            const url = await exportWarehouseHtmlPdf({
                                fileName: `Incoming_${pid}`,
                                html,
                            });

                            console.info(
                                `INCOMING_PDF_OK pr_id=${pid} ms=${Date.now() - t0} source=${source}`,
                            );
                            return url;
                        } catch (e: unknown) {
                            const err = e as { message?: string; reason?: string };
                            const msg = String(err?.message ?? "").toLowerCase();
                            const reason =
                                String(err?.reason ?? "").trim() ||
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
                label: "Р“РѕС‚РѕРІР»СЋ РЅР°РєР»Р°РґРЅСѓСЋ...",
                mode: Platform.OS === "web" ? "preview" : "share",
                fileName: `Issue_${docId}`,
                getRemoteUrl: async () => await reportsUi.buildIssueHtml(Number(docId)),
            });
        },
        [busy, supabase, reportsUi, reportsMode, repIncoming, warehousemanFio, notifyError, matNameByCode, orgName],
    );

    // в”Ђв”Ђ onPdfRegister в”Ђв”Ђ
    const onPdfRegister = useCallback(async () => {
        const isIncoming = reportsMode === "incoming";
        await runPdfTop({
            busy,
            supabase,
            key: `pdf: warehouse: ${isIncoming ? "incoming" : "issues"} - register:${periodFrom || "all"}:${periodTo || "all"} `,
            label: "Р“РѕС‚РѕРІР»СЋ СЂРµРµСЃС‚СЂвЂ¦",
            mode: Platform.OS === "web" ? "preview" : "share",
            fileName: `WH_${isIncoming ? "Incoming" : "Issues"}_Register_${periodFrom || "all"}_${periodTo || "all"} `,
            getRemoteUrl: async () =>
                isIncoming
                    ? await reportsUi.buildIncomingRegisterHtml()
                    : await reportsUi.buildRegisterHtml(),
        });
    }, [busy, supabase, periodFrom, periodTo, reportsUi, reportsMode]);

    // в”Ђв”Ђ onPdfMaterials в”Ђв”Ђ
    const onPdfMaterials = useCallback(async () => {
        const isIncoming = reportsMode === "incoming";
        await runPdfTop({
            busy,
            supabase,
            key: `pdf: warehouse: materials:${isIncoming ? "incoming" : "issues"}:${periodFrom || "all"}:${periodTo || "all"} `,
            label: "Р“РѕС‚РѕРІР»СЋ СЃРІРѕРґ РјР°С‚РµСЂРёР°Р»РѕРІвЂ¦",
            mode: Platform.OS === "web" ? "preview" : "share",
            fileName: `WH_${isIncoming ? "Incoming" : "Issued"}_Materials_${periodFrom || "all"}_${periodTo || "all"} `,
            getRemoteUrl: async () =>
                isIncoming
                    ? await reportsUi.buildIncomingMaterialsReportPdf()
                    : await reportsUi.buildMaterialsReportPdf(),
        });
    }, [busy, supabase, periodFrom, periodTo, reportsUi, reportsMode]);

    // в”Ђв”Ђ onPdfObjectWork в”Ђв”Ђ
    const onPdfObjectWork = useCallback(async () => {
        await runPdfTop({
            busy,
            supabase,
            key: `pdf: warehouse: objwork:${periodFrom || "all"}:${periodTo || "all"} `,
            label: "Р“РѕС‚РѕРІР»СЋ РѕС‚С‡С‘С‚ РїРѕ РѕР±СЉРµРєС‚Р°РјвЂ¦",
            mode: Platform.OS === "web" ? "preview" : "share",
            fileName: `WH_ObjectWork_${periodFrom || "all"}_${periodTo || "all"} `,
            getRemoteUrl: async () => await reportsUi.buildObjectWorkReportPdf(),
        });
    }, [busy, supabase, periodFrom, periodTo, reportsUi]);

    // в”Ђв”Ђ onPdfDayRegister в”Ђв”Ђ
    const onPdfDayRegister = useCallback(
        async (dayLabel: string) => {
            const isIncoming = reportsMode === "incoming";
            await runPdfTop({
                busy,
                supabase,
                key: `pdf: warehouse: day - register:${isIncoming ? "incoming" : "issues"}:${dayLabel} `,
                label: "Р“РѕС‚РѕРІР»СЋ СЂРµРµСЃС‚СЂ Р·Р° РґРµРЅСЊвЂ¦",
                mode: Platform.OS === "web" ? "preview" : "share",
                fileName: `WH_${isIncoming ? "Incoming" : "Register"}_${String(dayLabel).trim().replace(/\s+/g, "_")} `,
                getRemoteUrl: async () =>
                    isIncoming
                        ? await reportsUi.buildDayIncomingRegisterPdf(dayLabel)
                        : await reportsUi.buildDayRegisterPdf(dayLabel),
            });
        },
        [busy, supabase, reportsUi, reportsMode],
    );

    // в”Ђв”Ђ onPdfDayMaterials в”Ђв”Ђ
    const onPdfDayMaterials = useCallback(
        async (dayLabel: string) => {
            const isIncoming = reportsMode === "incoming";
            await runPdfTop({
                busy,
                supabase,
                key: `pdf: warehouse: day - materials:${isIncoming ? "incoming" : "issues"}:${dayLabel} `,
                label: "Р“РѕС‚РѕРІР»СЋ СЃРІРѕРґ РјР°С‚РµСЂРёР°Р»РѕРІ Р·Р° РґРµРЅСЊвЂ¦",
                mode: Platform.OS === "web" ? "preview" : "share",
                fileName: `WH_${isIncoming ? "Incoming" : "Issued"}_DayMaterials_${String(dayLabel).trim().replace(/\s+/g, "_")} `,
                getRemoteUrl: async () =>
                    isIncoming
                        ? await reportsUi.buildDayIncomingMaterialsReportPdf(dayLabel)
                        : await reportsUi.buildDayMaterialsReportPdf(dayLabel),
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
