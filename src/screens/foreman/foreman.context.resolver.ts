import {
    ContextConfig,
    ContextResolutionResult,
    CLASS_TEMPLATES,
    ObjectClass
} from './foreman.context';

const TYPE_CODE_MAP: Record<string, ObjectClass> = {
    'ADM': 'multilevel_building',
    'BLD': 'multilevel_building',
    'BLOCK': 'multilevel_building',
    'HGR': 'technical_facility',
    'GZP': 'external_site',
    'DVOR': 'external_site',
    'ROAD': 'linear_object',
    'NVK': 'external_networks',
    'NTS': 'external_networks',
};

export function resolveForemanContext(
    objectCode: string,
    objectName: string
): ContextResolutionResult {
    const code = (objectCode || "").toUpperCase();
    const name = (objectName || "").toLowerCase();

    // 1. BEZUSLOVNI PRIORITY: Technical / Industrial / Temporary Facilities
    if (name.includes("ангар") || name.includes("теплиц") || name.includes("склад") ||
        name.includes("времен") || name.includes("вз") || name.includes("кпп") ||
        name.includes("охрана") || name.includes("бытов") ||
        name.includes("депо") || name.includes("ремонт") || name.includes("база") ||
        name.includes("цех") || name.includes("паркинг") || name.includes("стоян") ||
        name.includes("городок") || name.includes("общежит") || name.includes("вахтов")) {

        const result: ContextResolutionResult = {
            config: { ...CLASS_TEMPLATES.generic_object, ...CLASS_TEMPLATES.technical_facility } as ContextConfig,
            resolvedBy: 'name_fallback',
            confidence: 'high'
        };
        console.log('[CCE_RESOLVER]', { objectCode, objectName, class: 'technical_facility', label: result.config.locatorLabel });
        return result;
    }

    // 2. Resolve by Type Code
    for (const [key, cls] of Object.entries(TYPE_CODE_MAP)) {
        if (code.includes(key)) {
            return {
                config: { ...CLASS_TEMPLATES.generic_object, ...CLASS_TEMPLATES[cls] } as ContextConfig,
                resolvedBy: 'object_type',
                confidence: 'high'
            };
        }
    }

    // 3. Name-based categories
    if (name.includes("двор") || name.includes("благоу") || name.includes("гп") || name.includes("участок") || name.includes("дорог")) {
        return {
            config: { ...CLASS_TEMPLATES.generic_object, ...CLASS_TEMPLATES.external_site } as ContextConfig,
            resolvedBy: 'name_fallback',
            confidence: 'medium'
        };
    }

    if (name.includes("нвк") || name.includes("нтс") || name.includes("сети") || name.includes("трасс")) {
        return {
            config: { ...CLASS_TEMPLATES.generic_object, ...CLASS_TEMPLATES.external_networks } as ContextConfig,
            resolvedBy: 'name_fallback',
            confidence: 'medium'
        };
    }

    if (name.includes("адм") || name.includes("здан") || name.includes("корпус") || name.includes("блок")) {
        return {
            config: { ...CLASS_TEMPLATES.generic_object, ...CLASS_TEMPLATES.multilevel_building } as ContextConfig,
            resolvedBy: 'name_fallback',
            confidence: 'medium'
        };
    }

    // 4. Default Fallback
    return {
        config: CLASS_TEMPLATES.generic_object as ContextConfig,
        resolvedBy: 'default',
        confidence: 'low'
    };
}
