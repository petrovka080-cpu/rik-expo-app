import { useCallback, useState } from 'react';
import { listForemanRequests, type ForemanRequestSummary } from '../../../lib/catalog_api';
import { FOREMAN_TEXT } from '../foreman.ui';
import { Alert } from 'react-native';

export function useForemanHistory() {
    const [historyRequests, setHistoryRequests] = useState<ForemanRequestSummary[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyVisible, setHistoryVisible] = useState(false);

    const fetchHistory = useCallback(async (foremanName: string) => {
        const name = String(foremanName || "").trim();

        if (!name) {
            Alert.alert(
                'История заявок',
                'Укажи ФИО прораба в шапке, чтобы посмотреть его историю.',
            );
            return;
        }

        setHistoryVisible(true);
        setHistoryLoading(true);

        try {
            const rows = await listForemanRequests(name, 50);
            setHistoryRequests(Array.isArray(rows) ? rows : []);
        } catch (e) {
            console.warn('[Foreman] listForemanRequests:', e);
            Alert.alert(FOREMAN_TEXT.historyTitle, FOREMAN_TEXT.historyLoadError);
            setHistoryRequests([]);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    const closeHistory = useCallback(() => setHistoryVisible(false), []);

    return {
        historyRequests,
        historyLoading,
        historyVisible,
        setHistoryVisible,
        fetchHistory,
        closeHistory,
    };
}
