import { useCallback, useState } from 'react';
import type { RequestDetails } from '../../../lib/catalog_api';

export function useForemanHeader() {
    const [foreman, setForeman] = useState<string>('');
    const [comment, setComment] = useState<string>('');
    const [objectType, setObjectType] = useState<string>('');
    const [level, setLevel] = useState<string>('');
    const [system, setSystem] = useState<string>('');
    const [zone, setZone] = useState<string>('');

    const syncHeaderFromDetails = useCallback((details: RequestDetails) => {
        setForeman(details.foreman_name ?? '');
        setComment(details.comment ?? '');
        setObjectType(details.object_type_code ?? '');
        setLevel(details.level_code ?? '');
        setSystem(details.system_code ?? '');
        setZone(details.zone_code ?? '');
    }, []);

    const resetHeader = useCallback(() => {
        setForeman('');
        setComment('');
        setObjectType('');
        setLevel('');
        setSystem('');
        setZone('');
    }, []);

    return {
        foreman,
        setForeman,
        comment,
        setComment,
        objectType,
        setObjectType,
        level,
        setLevel,
        system,
        setSystem,
        zone,
        setZone,
        syncHeaderFromDetails,
        resetHeader,
    };
}
