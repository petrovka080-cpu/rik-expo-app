/**
 * Units API - Fetch unique units of measurement from catalog_items
 */

import { supabase } from '../supabaseClient';

// Common units as fallback
const DEFAULT_UNITS = [
    'шт', 'кг', 'тонна', 'м', 'м²', 'м³', 'мешок', 'упак',
    'час', 'смена', 'работа', 'рейс', 'л', 'компл', 'пач'
];

// Cache for units
let cachedUnits: string[] | null = null;

/**
 * Fetch unique units from catalog_items table
 * Falls back to default units on error
 */
export const fetchUniqueUnits = async (): Promise<string[]> => {
    // Return cached if available
    if (cachedUnits) return cachedUnits;

    try {
        // Get distinct uom_code values from catalog_items
        const { data, error } = await supabase
            .from('catalog_items')
            .select('uom_code')
            .not('uom_code', 'is', null)
            .limit(500);

        if (error) {
            console.warn('[units_api] Error fetching units:', error);
            return DEFAULT_UNITS;
        }

        // Extract unique values
        const uniqueUnits = new Set<string>();
        (data || []).forEach((item: any) => {
            if (item.uom_code && typeof item.uom_code === 'string') {
                uniqueUnits.add(item.uom_code.trim());
            }
        });

        // Merge with defaults to ensure common units are available
        DEFAULT_UNITS.forEach(u => uniqueUnits.add(u));

        // Sort alphabetically
        cachedUnits = Array.from(uniqueUnits).sort((a, b) => a.localeCompare(b, 'ru'));

        console.log(`[units_api] Loaded ${cachedUnits.length} unique units`);
        return cachedUnits;
    } catch (e) {
        console.error('[units_api] Exception:', e);
        return DEFAULT_UNITS;
    }
};

/**
 * Clear cached units (call when data might have changed)
 */
export const clearUnitsCache = () => {
    cachedUnits = null;
};

/**
 * Search catalog items by name for autocomplete
 * @param query - Search query string
 * @param limit - Maximum results to return
 */
export const searchCatalogItems = async (query: string, limit = 20): Promise<{
    name: string;
    uom: string | null;
    rik_code: string | null;
}[]> => {
    if (!query || query.trim().length < 2) return [];

    try {
        const searchTerm = query.trim().toLowerCase();

        const { data, error } = await supabase
            .from('catalog_items')
            .select('name_human, uom_code, rik_code')
            .ilike('name_human', `%${searchTerm}%`)
            .limit(limit);

        if (error) {
            console.warn('[units_api] Search error:', error);
            return [];
        }

        // Deduplicate by name
        const seen = new Set<string>();
        const results: { name: string; uom: string | null; rik_code: string | null }[] = [];

        (data || []).forEach((item: any) => {
            const name = item.name_human?.trim();
            if (name && !seen.has(name.toLowerCase())) {
                seen.add(name.toLowerCase());
                results.push({
                    name,
                    uom: item.uom_code || null,
                    rik_code: item.rik_code || null,
                });
            }
        });

        return results;
    } catch (e) {
        console.error('[units_api] Search exception:', e);
        return [];
    }
};
