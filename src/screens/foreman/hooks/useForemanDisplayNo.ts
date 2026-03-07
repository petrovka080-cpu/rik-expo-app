import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchRequestDisplayNo } from '../../../lib/catalog_api';
import { toErrorText } from '../foreman.helpers';

export function useForemanDisplayNo() {
    const [displayNoByReq, setDisplayNoByReq] = useState<Record<string, string>>({});
    const displayNoCacheRef = useRef<Record<string, string>>({});
    const displayNoStateRef = useRef<Record<string, string>>({});

    useEffect(() => {
        displayNoStateRef.current = displayNoByReq;
    }, [displayNoByReq]);

    const preloadDisplayNo = useCallback(async (rid?: string | number | null) => {
        const key = String(rid ?? '').trim();
        if (!key) return;

        if (displayNoStateRef.current[key] != null) return;

        const cached = displayNoCacheRef.current[key];
        if (cached !== undefined) {
            setDisplayNoByReq((prev) => ({ ...prev, [key]: cached }));
            return;
        }

        try {
            const display = await fetchRequestDisplayNo(key);
            const val = display ? String(display).trim() : '';
            displayNoCacheRef.current[key] = val;
            setDisplayNoByReq((prev) => ({ ...prev, [key]: val }));
        } catch (e) {
            console.warn('[Foreman] preloadDisplayNo:', toErrorText(e, String(e ?? "")));
        }
    }, []);

    const getDisplayNo = useCallback((rid?: string | number | null) => {
        const key = String(rid ?? '').trim();
        return displayNoByReq[key] || '';
    }, [displayNoByReq]);

    return {
        displayNoByReq,
        setDisplayNoByReq,
        preloadDisplayNo,
        getDisplayNo,
    };
}
