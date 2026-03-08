import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TextInput } from "react-native";
import { normalizeRuText } from "../../lib/text/encoding";
import type { AccountantInboxUiRow } from "./types";

const ruText = (v: unknown, fallback = "") => normalizeRuText(String(v ?? fallback));

export function useAccountantInvoiceForm(params: {
    current: AccountantInboxUiRow | null;
    toRpcDateOrNull: (v: string) => string | null;
}) {
    const { current, toRpcDateOrNull } = params;

    const [invoiceNo, setInvoiceNo] = useState("");
    const [invoiceDate, setInvoiceDate] = useState("");
    const [supplierName, setSupplierName] = useState("");

    const purposePrefix = useMemo(() => {
        const invNo = ruText(String((invoiceNo || current?.invoice_number || "без номера") ?? "без номера").trim() || "без номера");
        const invDt = ruText(String((invoiceDate || current?.invoice_date || "без даты") ?? "без даты").trim() || "без даты");
        const supp = ruText(String((supplierName || current?.supplier || "поставщик не указан") ?? "поставщик не указан").trim() || "поставщик не указан");
        return `Оплата по счёту №${invNo} от ${invDt}. Поставщик: ${supp}.`;
    }, [invoiceNo, invoiceDate, supplierName, current]);

    const [amount, setAmount] = useState<string>('');
    const [note, setNote] = useState<string>('');

    const [allocRows, setAllocRows] = useState<Array<{ proposal_item_id: string; amount: number }>>([]);
    const [allocOk, setAllocOk] = useState(true);
    const [allocSum, setAllocSum] = useState(0);

    const [bankName, setBankName] = useState("");
    const [bik, setBik] = useState("");
    const [rs, setRs] = useState("");
    const [inn, setInn] = useState("");
    const [kpp, setKpp] = useState("");

    const INV_YEAR = new Date().getFullYear();
    const INV_PREFIX = `${INV_YEAR}-`;
    const [invMM, setInvMM] = useState<string>(""); // "01".."12"
    const [invDD, setInvDD] = useState<string>(""); // "01".."31"
    const mmRef = useRef<TextInput | null>(null);
    const ddRef = useRef<TextInput | null>(null);

    const clamp2 = useCallback((s: string, max: number) => {
        const d = String(s || "").replace(/\D+/g, "").slice(0, 2);
        if (d.length < 2) return d;
        let n = Number(d);
        if (!Number.isFinite(n)) n = 0;
        if (n < 1) n = 1;
        if (n > max) n = max;
        return String(n).padStart(2, "0");
    }, []);

    // Unified date component derivation
    useEffect(() => {
        const v = String(invoiceDate || "").trim();
        const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) {
            setInvMM(m[2]);
            setInvDD(m[3]);
        }
    }, [invoiceDate]);

    // Handle partial input updates
    const updateInvoiceDateFromParts = useCallback((mm: string, dd: string) => {
        const year = invoiceDate?.startsWith("20") ? invoiceDate.slice(0, 4) : new Date().getFullYear();
        const next = `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
        if (next !== invoiceDate) {
            setInvoiceDate(next);
        }
    }, [invoiceDate]);

    // This replaces the two complex effects with a more direct relationship if needed, 
    // but the component uses setInvMM/setInvDD directly. 
    // To fix the "loop", we only update invoiceDate if the parts form a valid sequence.
    useEffect(() => {
        if (!invMM && !invDD) return;
        if (invMM.length === 2 && invDD.length === 2) {
            updateInvoiceDateFromParts(invMM, invDD);
        }
    }, [invMM, invDD, updateInvoiceDateFromParts]);


    const [payKind, setPayKind] = useState<'bank' | 'cash'>('bank');

    return {
        invoiceNo, setInvoiceNo,
        invoiceDate, setInvoiceDate,
        supplierName, setSupplierName,
        purposePrefix,
        amount, setAmount,
        note, setNote,
        allocRows, setAllocRows,
        allocOk, setAllocOk,
        allocSum, setAllocSum,
        bankName, setBankName,
        bik, setBik,
        rs, setRs,
        inn, setInn,
        kpp, setKpp,
        INV_PREFIX,
        invMM, setInvMM,
        invDD, setInvDD,
        mmRef, ddRef,
        clamp2,
        payKind, setPayKind,
    };
}
