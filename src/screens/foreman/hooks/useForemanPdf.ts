import { useCallback } from 'react';
import { exportRequestPdf } from '../../../lib/catalog_api';
import { runPdfTop } from '../../../lib/pdfRunner';
import { supabase } from '../../../lib/supabaseClient';
import type { RequestDetails } from '../../../lib/catalog_api';
import type { BusyCtx } from '../../../ui/GlobalBusy';

export function useForemanPdf(gbusy: BusyCtx) {
    const runRequestPdf = useCallback(
        async (
            mode: 'share' | 'preview',
            requestId: string,
            requestDetails: RequestDetails | null,
            syncMeta: (rid: string, ctx: string) => Promise<void>
        ) => {
            const ridKey = String(requestId).trim();
            if (!ridKey) return;

            const fileName = requestDetails?.display_no
                ? `Заявка_${requestDetails.display_no}`
                : `Заявка_${ridKey}`;

            await syncMeta(ridKey, mode === 'share' ? 'onPdfShare' : 'onPdfExport');

            await runPdfTop({
                busy: gbusy,
                supabase,
                key: mode === 'share' ? `pdfshare:request:${ridKey}` : `pdf:request:${ridKey}`,
                label: mode === 'share' ? 'Подготавливаю файл...' : 'Готовлю PDF...',
                mode,
                fileName,
                getRemoteUrl: () => exportRequestPdf(ridKey, mode),
            });
        },
        [gbusy],
    );

    return { runRequestPdf };
}
