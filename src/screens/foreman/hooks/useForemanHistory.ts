import { useCallback, useState } from 'react';
import { listForemanRequests, type ForemanRequestSummary } from '../../../lib/catalog_api';
import { FOREMAN_TEXT } from '../foreman.ui';
import { Alert } from 'react-native';
import { supabase } from '../../../lib/supabaseClient';
import { useForemanHistoryStore } from '../foremanHistory.store';

const warnForemanHistory = (error: unknown) => {
    if (__DEV__) {
        console.warn('[Foreman] listForemanRequests:', error);
    }
};

export function useForemanHistory() {
    const [historyRequests, setHistoryRequests] = useState<ForemanRequestSummary[]>([]);
    const historyLoading = useForemanHistoryStore((state) => state.requestHistoryLoading);
    const setHistoryLoading = useForemanHistoryStore((state) => state.setRequestHistoryLoading);
    const historyVisible = useForemanHistoryStore((state) => state.requestHistoryVisible);
    const openRequestHistory = useForemanHistoryStore((state) => state.openRequestHistory);
    const closeRequestHistory = useForemanHistoryStore((state) => state.closeRequestHistory);
    const setRefreshReason = useForemanHistoryStore((state) => state.setRefreshReason);

    const fetchHistory = useCallback(async (foremanName: string) => {
        const name = String(foremanName || "").trim();
        const auth = await supabase.auth.getUser();
        const userId = String(auth.data?.user?.id || "").trim();

        if (!name && !userId) {
            Alert.alert(
                'История заявок',
                'Не удалось определить прораба для истории заявок.',
            );
            return;
        }

        openRequestHistory();
        setHistoryLoading(true);
        setRefreshReason("history:requests");

        try {
            const rows = await listForemanRequests(name, 50, userId);
            setHistoryRequests(Array.isArray(rows) ? rows : []);
        } catch (e) {
            warnForemanHistory(e);
            Alert.alert(FOREMAN_TEXT.historyTitle, FOREMAN_TEXT.historyLoadError);
            setHistoryRequests([]);
        } finally {
            setHistoryLoading(false);
        }
    }, [openRequestHistory, setHistoryLoading, setRefreshReason]);

    const closeHistory = useCallback(() => closeRequestHistory(), [closeRequestHistory]);

    return {
        historyRequests,
        historyLoading,
        historyVisible,
        fetchHistory,
        closeHistory,
    };
}
