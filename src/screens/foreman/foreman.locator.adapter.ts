import { ContextResolutionResult } from "./foreman.context";
import { RefOption } from "./foreman.types";

export interface AdaptedFieldUi {
    label: string;
    placeholder: string;
    options: RefOption[];
    isHidden: boolean;
    isValidValue: (val: string) => boolean;
}

export interface FormContextUiModel {
    locator: AdaptedFieldUi;
    zone: AdaptedFieldUi;
}

/**
 * FORM CONTEXT ADAPTER v4.0
 * Implements strict class-based semantic filtering.
 */
export function adaptFormContext(
    ctxResult: ContextResolutionResult,
    rawLvlOptions: RefOption[],
    rawZoneOptions: RefOption[]
): FormContextUiModel {
    const { config } = ctxResult;

    // --- 1. LOCATOR FIELD ADAPTATION ---
    const locatorLabel = config.locatorLabel || "Локация";
    const locatorPlaceholder = config.wholeObjectLabel || "Выбрать...";

    let locOptions = rawLvlOptions.map(o => !o.code ? { ...o, name: locatorPlaceholder } : o);

    // BUILDING SEMANTIC BLACKLIST: Keywords that belong to multilevel buildings only.
    const buildingOnlyKeywords = [
        "этаж", "lvl", "floor", "мансарда", "чердак", "кровля", "подвал",
        "цоколь", "ядро", "лестнич", "лифт", "подъезд", "входная"
    ];

    switch (config.locatorEntityKind) {
        case 'none':
            locOptions = locOptions.filter(o => !o.code);
            break;
        case 'section':
        case 'area':
        case 'picket':
        case 'route_segment':
            // ABSOLUTE FILTER: If object is NOT a multilevel building, kill building semantics.
            if (config.objectClass !== 'multilevel_building' && config.objectClass !== 'parking_object') {
                locOptions = locOptions.filter(o => {
                    if (!o.code) return true;
                    const n = o.name.toLowerCase();
                    return !buildingOnlyKeywords.some(k => n.includes(k));
                });
            }
            break;
        case 'floor':
            if (config.objectClass === 'technical_facility' || config.objectClass === 'lowrise_building') {
                locOptions = locOptions.filter(o => {
                    if (!o.code) return true;
                    const n = o.name.toUpperCase();
                    // Max 3 floors for tech/low-rise
                    const floorMatch = n.match(/(^|\D)([0-9]+)(\D|$)/);
                    if (floorMatch) {
                        const floorNum = parseInt(floorMatch[2], 10);
                        if (floorNum > 3) return false;
                    }
                    return !["МАНСАРДА", "ЧЕРДАК", "КРОВЛЯ"].some(k => n.includes(k));
                });
            }
            break;
    }

    // --- 2. ZONE FIELD ADAPTATION ---
    const zoneLabel = config.zoneLabel || "Детальное место (Зона / Участок)";
    const zonePlaceholder = config.objectClass === 'external_site' || config.objectClass === 'external_networks'
        ? "— Весь участок —"
        : "— Без детализации —";

    let zoneOptions = rawZoneOptions.map(o => !o.code ? { ...o, name: zonePlaceholder } : o);

    // STRICT ZONE FILTERING
    if (config.objectClass === 'technical_facility' || config.objectClass === 'external_site' || config.objectClass === 'external_networks') {
        zoneOptions = zoneOptions.filter(o => {
            if (!o.code) return true;
            const n = o.name.toLowerCase();
            return !["вестибюль", "холл", "лестниц", "лифт", "коридор", "квартир", "мансард", "чердак"].some(k => n.includes(k));
        });
    }

    return {
        locator: {
            label: locatorLabel,
            placeholder: locatorPlaceholder,
            options: locOptions,
            isHidden: config.localizationMode === 'none' && locOptions.length <= 1,
            isValidValue: (val: string) => !val || locOptions.some(o => o.code === val)
        },
        zone: {
            label: zoneLabel,
            placeholder: zonePlaceholder,
            options: zoneOptions,
            isHidden: false,
            isValidValue: (val: string) => !val || zoneOptions.some(o => o.code === val)
        }
    };
}
