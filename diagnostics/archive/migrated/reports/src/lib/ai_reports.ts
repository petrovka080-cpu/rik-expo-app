/**
 * AI Reports Module
 * AI-powered features for reports: price analysis, supplier recommendations, smart notes.
 */

import { supabase } from './supabaseClient';

// ============================================
// PRICE ANALYSIS
// ============================================

interface PriceHistoryItem {
    date: string;
    price: number;
    supplier: string;
}

interface PriceAnalysis {
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    lastPrice: number;
    priceChange: number; // percentage
    recommendation: 'good' | 'average' | 'expensive';
    history: PriceHistoryItem[];
}

/**
 * Analyze price history for a material
 */
export const analyzePriceHistory = async (
    rikCode: string,
    currentPrice: number,
    companyId?: string | null
): Promise<PriceAnalysis | null> => {
    try {
        // Fetch historical prices from proposal_items
        // Filter by company_id through proposals join when available
        let query = supabase
            .from('proposal_items')
            .select('price, supplier, created_at, proposals!inner(company_id)')
            .eq('rik_code', rikCode)
            .not('price', 'is', null)
            .order('created_at', { ascending: false })
            .limit(20);

        if (companyId) {
            query = query.eq('proposals.company_id', companyId);
        }

        const { data, error } = await query;

        if (error || !data || data.length === 0) {
            return null;
        }

        const prices = data
            .map((r: any) => Number(r.price))
            .filter(p => p > 0);

        if (prices.length === 0) return null;

        const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const lastPrice = prices[0];

        const priceChange = lastPrice > 0
            ? ((currentPrice - lastPrice) / lastPrice) * 100
            : 0;

        // Determine recommendation
        let recommendation: 'good' | 'average' | 'expensive' = 'average';
        if (currentPrice <= minPrice * 1.1) {
            recommendation = 'good';
        } else if (currentPrice >= maxPrice * 0.9) {
            recommendation = 'expensive';
        }

        const history = data.slice(0, 5).map((r: any) => ({
            date: r.created_at,
            price: Number(r.price),
            supplier: r.supplier || '',
        }));

        return {
            averagePrice,
            minPrice,
            maxPrice,
            lastPrice,
            priceChange,
            recommendation,
            history,
        };
    } catch (e) {
        console.error('[analyzePriceHistory] Error:', e);
        return null;
    }
};

// ============================================
// SUPPLIER RECOMMENDATIONS
// ============================================

export interface SupplierScore {
    name: string;
    score: number;
    orderCount: number;
    avgPrice: number;
    lastOrderDate: string | null;
    specializations: string[];
}

/**
 * Get supplier recommendations based on history
 */
export const getSupplierRecommendations = async (
    rikCode: string,
    limit = 5,
    companyId?: string | null
): Promise<SupplierScore[]> => {
    try {
        // Fetch historical supplier data for this material
        // Filter by company_id through proposals join when available
        let query = supabase
            .from('proposal_items')
            .select('supplier, price, created_at, proposals!inner(company_id)')
            .eq('rik_code', rikCode)
            .not('supplier', 'is', null)
            .order('created_at', { ascending: false })
            .limit(100);

        if (companyId) {
            query = query.eq('proposals.company_id', companyId);
        }

        const { data, error } = await query;

        if (error || !data || data.length === 0) {
            return [];
        }

        // Aggregate by supplier
        const supplierMap = new Map<string, {
            orders: number;
            totalPrice: number;
            lastDate: string;
        }>();

        for (const row of data) {
            const supplier = String(row.supplier || '').trim();
            if (!supplier) continue;

            const existing = supplierMap.get(supplier) || {
                orders: 0,
                totalPrice: 0,
                lastDate: row.created_at,
            };

            existing.orders++;
            existing.totalPrice += Number(row.price) || 0;
            if (row.created_at > existing.lastDate) {
                existing.lastDate = row.created_at;
            }

            supplierMap.set(supplier, existing);
        }

        // Calculate scores and sort
        const scores: SupplierScore[] = [];
        for (const [name, stats] of supplierMap.entries()) {
            const avgPrice = stats.orders > 0 ? stats.totalPrice / stats.orders : 0;
            // Score based on order count and recency
            const recencyDays = Math.max(1, (Date.now() - new Date(stats.lastDate).getTime()) / (1000 * 60 * 60 * 24));
            const score = (stats.orders * 10) / Math.sqrt(recencyDays);

            scores.push({
                name,
                score,
                orderCount: stats.orders,
                avgPrice,
                lastOrderDate: stats.lastDate,
                specializations: [], // Could be fetched from suppliers table
            });
        }

        return scores
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    } catch (e) {
        console.error('[getSupplierRecommendations] Error:', e);
        return [];
    }
};

// ============================================
// SMART NOTES GENERATION
// ============================================

/**
 * Generate smart notes for a proposal item
 */
export const generateSmartNote = async (item: {
    rikCode: string;
    name: string;
    qty: number;
    price: number;
    supplier: string;
}): Promise<string | null> => {
    try {
        const notes: string[] = [];

        // Check price analysis
        const priceAnalysis = await analyzePriceHistory(item.rikCode, item.price);
        if (priceAnalysis) {
            if (priceAnalysis.recommendation === 'good') {
                notes.push(`✅ Цена ниже среднерыночной (${formatPrice(priceAnalysis.averagePrice)})`);
            } else if (priceAnalysis.recommendation === 'expensive') {
                notes.push(`⚠️ Цена выше среднерыночной (${formatPrice(priceAnalysis.averagePrice)})`);
            }

            if (priceAnalysis.priceChange > 10) {
                notes.push(`📈 Рост цены ${priceAnalysis.priceChange.toFixed(1)}% vs прошлый заказ`);
            } else if (priceAnalysis.priceChange < -10) {
                notes.push(`📉 Снижение цены ${Math.abs(priceAnalysis.priceChange).toFixed(1)}%`);
            }
        }

        // Check supplier recommendations
        if (!item.supplier) {
            const recommendations = await getSupplierRecommendations(item.rikCode, 1);
            if (recommendations.length > 0) {
                notes.push(`💡 Рекомендуемый поставщик: ${recommendations[0].name} (${recommendations[0].orderCount} заказов)`);
            }
        }

        return notes.length > 0 ? notes.join(' • ') : null;
    } catch (e) {
        console.error('[generateSmartNote] Error:', e);
        return null;
    }
};

const formatPrice = (price: number): string => {
    return price.toLocaleString('ru-RU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
};

// ============================================
// AI REPORT SUMMARY (uses Gemini if available)
// ============================================

/**
 * Generate AI summary for a proposal
 */
export const generateProposalSummary = async (proposalData: {
    itemCount: number;
    total: number;
    suppliers: string[];
    topCategories: string[];
}): Promise<string> => {
    try {
        // Simple rule-based summary (can be enhanced with Gemini API)
        const parts: string[] = [];

        parts.push(`📊 ${proposalData.itemCount} позиций на сумму ${formatPrice(proposalData.total)} сом`);

        if (proposalData.suppliers.length === 1) {
            parts.push(`🏢 Один поставщик: ${proposalData.suppliers[0]}`);
        } else if (proposalData.suppliers.length > 1) {
            parts.push(`🏢 ${proposalData.suppliers.length} поставщиков`);
        }

        if (proposalData.topCategories.length > 0) {
            parts.push(`📦 Основные категории: ${proposalData.topCategories.slice(0, 3).join(', ')}`);
        }

        return parts.join('\n');
    } catch (e) {
        console.error('[generateProposalSummary] Error:', e);
        return '';
    }
};

// ============================================
// BATCH ANALYSIS
// ============================================

export interface ItemAnalysis {
    rikCode: string;
    priceAnalysis: PriceAnalysis | null;
    supplierRecommendations: SupplierScore[];
    smartNote: string | null;
}

/**
 * Analyze all items in a proposal
 */
export const analyzeProposalItems = async (
    items: Array<{ rikCode: string; name: string; qty: number; price: number; supplier: string }>
): Promise<Map<string, ItemAnalysis>> => {
    const results = new Map<string, ItemAnalysis>();

    // Process in parallel with concurrency limit
    const batchSize = 5;
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await Promise.all(batch.map(async (item) => {
            const [priceAnalysis, supplierRecommendations, smartNote] = await Promise.all([
                analyzePriceHistory(item.rikCode, item.price),
                getSupplierRecommendations(item.rikCode, 3),
                generateSmartNote(item),
            ]);

            results.set(item.rikCode, {
                rikCode: item.rikCode,
                priceAnalysis,
                supplierRecommendations,
                smartNote,
            });
        }));
    }

    return results;
};
