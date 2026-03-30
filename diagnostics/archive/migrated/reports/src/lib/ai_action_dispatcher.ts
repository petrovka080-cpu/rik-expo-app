/**
 * ai_action_dispatcher.ts — Executes Supabase operations based on AI responses
 *
 * SEARCH PRIORITY: market_listings FIRST → catalog_items FALLBACK
 * All handlers have try/catch and NEVER throw to the caller.
 */

import { supabase } from './supabaseClient';
import { searchMarketListings } from './ai_assistant';
import { requestCreateDraft, addRequestItemFromRik } from './api/request_api';
import { createProposalsBySupplier } from './catalog_api';
import type { ParsedGeminiResponse } from './gemini_client';

// ============================================================
// TYPES
// ============================================================

export interface ActionResult {
    success: boolean;
    message: string;
    data?: unknown;
}

export interface ExecuteAIOptions {
    objectId?: string | null;
    objectName?: string | null;
}

// ============================================================
// SMART SEARCH: Market first → Catalog fallback
// ============================================================

interface SearchResult {
    code: string;
    name: string;
    price?: number;
    supplier?: string;
    source: 'market' | 'catalog';
}

const normalizeMarketKind = (kind?: string): 'material' | 'work' | 'service' | 'rent' | undefined => {
    if (kind === 'material' || kind === 'work' || kind === 'service' || kind === 'rent') return kind;
    return undefined;
};

/**
 * Search market_listings FIRST (real products with prices).
 * If nothing found → fallback to catalog_items.
 * Never throws.
 */
const smartSearch = async (
    query: string,
    limit: number = 5,
    kind?: 'material' | 'work' | 'service' | 'rent'
): Promise<SearchResult[]> => {
    const q = query?.trim();
    if (!q || q.length < 2) return [];

    // 1) Search market_listings FIRST (real seller data)
    try {
        const marketResults = await searchMarketListings(q, limit, kind);
        if (marketResults.length > 0) {
            return marketResults.map(m => ({
                code: m.id,
                name: m.title,
                price: m.price,
                supplier: m.seller_company || m.seller_name || undefined,
                source: 'market' as const,
            }));
        }
    } catch {
        // Market search failed, try catalog
    }

    // 2) Fallback: catalog_items (220k+ RIK codes)
    try {
        const { data, error } = await supabase
            .from('catalog_items')
            .select('code, name_ru, uom')
            .ilike('name_ru', `%${q}%`)
            .limit(limit);

        if (!error && Array.isArray(data) && data.length > 0) {
            return data.map((r: any) => ({
                code: r.code || '',
                name: r.name_ru || '',
                source: 'catalog' as const,
            }));
        }
    } catch {
        // Silent
    }

    return [];
};

// ============================================================
// MAIN DISPATCHER
// ============================================================

/**
 * Execute an AI action. NEVER throws — always returns ActionResult.
 */
export const executeAIAction = async (
    response: ParsedGeminiResponse,
    role: string,
    companyId?: string | null,
    options?: ExecuteAIOptions
): Promise<ActionResult> => {
    const { action, items } = response;

    if (!action || action === 'chat' || action === 'clarify') {
        return { success: true, message: response.message };
    }

    try {
        return await dispatchAction(action, items, response.message, role, companyId, options);
    } catch (error: any) {
        console.warn('[ActionDispatcher]', action, error?.message);
        return { success: true, message: response.message };
    }
};

const dispatchAction = async (
    action: string,
    items: ParsedGeminiResponse['items'],
    fallbackMsg: string,
    role: string,
    companyId?: string | null,
    options?: ExecuteAIOptions
): Promise<ActionResult> => {
    switch (action) {
        case 'create_request': return handleCreateRequestOrProposal(items, role, companyId, options);
        case 'create_proposal': return handleCreateProposal(items, role, companyId, options);
        case 'search_supplier':
        case 'search_market': return handleSearchMarket(items);
        case 'set_price': return handleSetPrice(items);
        case 'compare_prices': return handleSearchMarket(items);
        case 'check_stock': return handleCheckStock(companyId);
        case 'find_deficit': return handleFindDeficit(companyId);
        case 'check_invoices': return handleCheckInvoices(companyId);
        case 'auto_procure': return handleCreateProposal(items, role, companyId, options);
        case 'approve_items': return ok('✅ Для утверждения позиций откройте заявку и нажмите «Утвердить».');
        case 'accept_delivery': return ok('📦 Для приёма поставки перейдите на экран Склада → вкладка «Приход».');
        case 'mark_paid': return ok('💳 Для отметки оплаты перейдите в раздел Приход → нажмите на предложение.');
        case 'export_1c': return handleExport1C();
        case 'create_postings': return ok('📘 Проводки создаются автоматически при отправке предложения в бухгалтерию и при оплате.');
        case 'track_usage':
        case 'calculate_materials':
        case 'calculate_debt':
        case 'payment_report':
        case 'generate_estimate':
        case 'analyze_blueprint':
        case 'analyze_photo': return ok(fallbackMsg);
        default: return ok(fallbackMsg);
    }
};

const ok = (message: string): ActionResult => ({ success: true, message });

const isDecisionRole = (role: string): boolean => role === 'director' || role === 'buyer';

const toPositivePrice = (value: unknown): number | null => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
};

const normalizeRequestKind = (
    kind?: string,
    name?: string,
    specs?: string | null
): 'material' | 'work' | 'service' | 'rent' => {
    const k = String(kind || '').trim().toLowerCase();
    if (k === 'work' || k === 'работа' || k === 'works') return 'work';
    if (k === 'service' || k === 'услуга' || k === 'услуги' || k === 'services') return 'service';
    if (k === 'rent' || k === 'аренда') return 'rent';
    const text = `${String(name || '')} ${String(specs || '')}`.toLowerCase();
    if (/(перевоз|доставк|логист|рейс|аренд|услуг|экскават|кран|спецтех)/.test(text)) return 'service';
    if (/(монтаж|демонтаж|кладк|бетонир|сварк|проектир|строит|штукатур|маляр|бурен|землян)/.test(text)) return 'work';
    return 'material';
};

const hasProposalData = (item: ParsedGeminiResponse['items'][number]): boolean => {
    return toPositivePrice(item?.price) !== null && Number(item?.qty || 0) > 0;
};

const enrichItemsForProposal = async (
    items: ParsedGeminiResponse['items']
): Promise<ParsedGeminiResponse['items']> => {
    const enriched: ParsedGeminiResponse['items'] = [];

    for (const item of items || []) {
        if (hasProposalData(item)) {
            enriched.push(item);
            continue;
        }

        const results = await smartSearch(item.name, 1, normalizeMarketKind(item.kind));
        const best = results[0];
        enriched.push({
            ...item,
            price: toPositivePrice(item.price) ?? best?.price ?? item.price,
            supplier: item.supplier || best?.supplier || 'AI Supplier',
            unit: item.unit || 'шт',
        });
    }

    return enriched;
};

const handleCreateRequestOrProposal = async (
    items: ParsedGeminiResponse['items'],
    role: string,
    companyId?: string | null,
    options?: ExecuteAIOptions
): Promise<ActionResult> => {
    if (!items?.length) return { success: false, message: 'вљ пёЏ РќРµС‚ РїРѕР·РёС†РёР№ РґР»СЏ Р·Р°СЏРІРєРё.' };

    if (!isDecisionRole(role)) {
        return handleCreateRequest(items, role, companyId, options);
    }

    const enriched = await enrichItemsForProposal(items);
    const allReadyForProposal = enriched.length > 0 && enriched.every(hasProposalData);

    if (allReadyForProposal) {
        return handleCreateProposal(enriched, role, companyId, options);
    }

    return handleCreateRequest(enriched, role, companyId, options);
};

// ============================================================
// FOREMAN: Parse items (market-first search for RIK codes)
// ============================================================

// ============================================================
// DOCUMENT CREATION: Request
// ============================================================

const handleCreateRequest = async (
    items: ParsedGeminiResponse['items'],
    role: string,
    companyId?: string | null,
    options?: ExecuteAIOptions
): Promise<ActionResult> => {
    if (!items?.length) return { success: false, message: '⚠️ Нет позиций для заявки.' };

    try {
        // Create draft request first
        const request = await requestCreateDraft();
        if (!request?.id) return { success: false, message: '❌ Не удалось создать заявку.' };

        // Auto-update status to 'На утверждении' for better visibility if created by AI
        // Or if user is Director/Buyer
        const targetStatus = (role === 'director' || role === 'buyer') ? 'На утверждении' : 'На утверждении'; // Force all to Pending

        let added = 0;
        const errors: string[] = [];

        for (const item of items) {
            try {
                const results = await smartSearch(item.name, 1, normalizeMarketKind(item.kind));
                const match = results[0];
                const reqKind = normalizeRequestKind(item.kind, item.name, item.specs || null);

                if (match?.source === 'catalog' && match.code) {
                    await addRequestItemFromRik(request.id, match.code, item.qty, {
                        name_human: item.name, uom: item.unit, note: item.specs || undefined, kind: reqKind,
                    });
                    added++;
                } else {
                    const { error } = await supabase.from('request_items').insert({
                        request_id: request.id,
                        name_human: match?.name || item.name,
                        qty: item.qty,
                        uom: item.unit,
                        kind: reqKind,
                        note: item.specs || null,
                        status: targetStatus,
                    });
                    if (error) throw error;
                    added++;
                }
            } catch (e: any) {
                errors.push(`${item.name}: ${e?.message || 'ошибка'}`);
            }
        }

        if (options?.objectId) {
            await supabase
                .from('requests')
                .update({ object_id: options.objectId })
                .eq('id', request.id);
        }

        // Set company_id on the request so it's visible to the correct company
        if (companyId) {
            await supabase
                .from('requests')
                .update({ company_id: companyId })
                .eq('id', request.id);
        }

        // Finalize request status to be visible in Director's dashboard
        await supabase.from('requests').update({ status: targetStatus }).eq('id', request.id);

        const display = request.display_no || String(request.id).slice(0, 8);
        let msg = `✅ Заявка **${display}** в статусе **"${targetStatus}"** создана! Добавлено ${added}/${items.length} позиций.`;
        if (errors.length) msg += `\n⚠️ ${errors.join(', ')}`;
        return { success: true, message: msg, data: { requestId: request.id } };
    } catch (e: any) {
        return { success: false, message: `❌ Ошибка: ${e?.message}` };
    }
};

// ============================================================
// DOCUMENT CREATION: Proposal (for Buyer/Director)
// ============================================================

const handleCreateProposal = async (
    items: ParsedGeminiResponse['items'],
    role: string,
    companyId?: string | null,
    options?: ExecuteAIOptions
): Promise<ActionResult> => {
    if (!items?.length) return { success: false, message: 'No items for proposal.' };
    if (role !== 'director' && role !== 'buyer') {
        return handleCreateRequest(items, role, companyId, options); // Fallback for foreman
    }

    try {
        // 1) Create request first (source of request_items)
        const reqResult = await handleCreateRequest(items, role, companyId, options);
        if (!reqResult.success || !reqResult.data) return reqResult;
        const requestId = (reqResult.data as any).requestId;

        // 2) Collect request_items created above
        const { data: reqItems } = await supabase
            .from('request_items')
            .select('id, name_human, qty, uom, note')
            .eq('request_id', requestId);

        const requestItemIds = (reqItems || []).map((ri: any) => String(ri.id)).filter(Boolean);
        if (!requestItemIds.length) {
            return { success: true, message: String(reqResult.message) + '\nWarning: No request items found for proposal.' };
        }

        // 3) Create proposal through RPC-backed helper (avoids direct RLS insert failures)
        const supplierName = items.find(i => i?.supplier)?.supplier || 'AI Supplier';
        const meta = (reqItems || []).map((ri: any) => {
            const sourceItem = items.find(i => {
                const a = String(i.name || '').toLowerCase();
                const b = String(ri.name_human || '').toLowerCase();
                return a.includes(b) || b.includes(a);
            }) || items[0];
            return {
                request_item_id: String(ri.id),
                price: sourceItem?.price != null ? String(sourceItem.price) : null,
                supplier: sourceItem?.supplier || supplierName,
                note: ri.note || null,
            };
        });

        const created = await createProposalsBySupplier(
            [{ supplier: supplierName, request_item_ids: requestItemIds, meta }],
            { submit: true, requestItemStatus: 'В работе' }
        );

        const proposalId = created?.proposals?.[0]?.proposal_id;
        if (!proposalId) {
            return { success: true, message: String(reqResult.message) + '\nWarning: Failed to create linked proposal.' };
        }

        return {
            success: true,
            message: 'Order created. Request + proposal #' + String(proposalId).slice(0, 8) + ' are ready in "Предложения на утверждении".'
        };
    } catch (e: any) {
        return { success: false, message: 'Proposal flow error: ' + (e?.message || 'unknown') };
    }
};
// ============================================================
// BUYER: Search / Compare (market-first!)
// ============================================================

const handleSearchMarket = async (items: ParsedGeminiResponse['items']): Promise<ActionResult> => {
    if (!items?.length) return ok('⚠️ Укажите что искать.');

    const parts: string[] = [];
    for (const item of items.slice(0, 3)) {
        try {
            const results = await smartSearch(item.name, 8, normalizeMarketKind(item.kind));
            if (results.length > 0) {
                const rows = results.map((r, i) => {
                    const priceStr = r.price ? `${r.price} сом` : '—';
                    const sourceStr = r.source === 'market' ? '🛒' : '📖';
                    return `| ${i + 1} | ${sourceStr} ${r.name} | ${priceStr} | ${r.supplier || '—'} |`;
                }).join('\n');
                parts.push(`### ${item.name}\n| # | Название | Цена | Поставщик |\n|---|----------|------|-----------|\n${rows}`);
            } else {
                parts.push(`### ${item.name}\n_Не найдено ни на рынке, ни в каталоге_`);
            }
        } catch {
            parts.push(`### ${item.name}\n_Ошибка поиска_`);
        }
    }

    return ok(`🔍 Результаты (🛒 = рынок, 📖 = каталог):\n\n${parts.join('\n\n')}`);
};

const handleSetPrice = async (items: ParsedGeminiResponse['items']): Promise<ActionResult> => {
    if (!items?.length) return ok('⚠️ Укажите позицию и цену.');
    const list = items.map((i: any) => `• **${i.name}**: ${i.price || '?'} сом/${i.unit}`).join('\n');
    return ok(`💰 Цены:\n${list}\n\n_Откройте заявку для подтверждения._`);
};

// ============================================================
// WAREHOUSE
// ============================================================

const handleCheckStock = async (companyId?: string | null): Promise<ActionResult> => {
    if (!companyId) return ok('📦 Для проверки остатков перейдите на экран Склада.');

    try {
        const { data, error } = await supabase
            .from('wh_stock' as any)
            .select('name, qty, uom, warehouse_name')
            .eq('company_id', companyId)
            .limit(20);

        if (error) return ok('📦 Таблица остатков пока не настроена. Проверьте экран Склада.');
        if (!data?.length) return ok('📦 Склад пуст — нет записей.');

        const rows = (data as any[]).map((r: any, i: number) =>
            `| ${i + 1} | ${r.name || '—'} | ${r.qty || 0} | ${r.uom || 'шт'} | ${r.warehouse_name || '—'} |`
        ).join('\n');

        return ok(`📦 Остатки (${data.length}):\n\n| # | Название | Кол-во | Ед. | Склад |\n|---|----------|--------|-----|-------|\n${rows}`);
    } catch {
        return ok('📦 Перейдите на экран Склада для просмотра остатков.');
    }
};

const handleFindDeficit = async (companyId?: string | null): Promise<ActionResult> => {
    if (!companyId) return ok('⚠️ Перейдите на экран Склада.');

    try {
        const { data, error } = await supabase
            .from('wh_stock' as any)
            .select('name, qty, uom')
            .eq('company_id', companyId)
            .lte('qty', 5)
            .order('qty', { ascending: true })
            .limit(20);

        if (error) return ok('⚠️ Таблица остатков пока не настроена.');
        if (!data?.length) return ok('✅ Нет критичных дефицитов (позиций ≤5 ед.).');

        const rows = (data as any[]).map((r: any, i: number) =>
            `| ${i + 1} | ${r.name || '—'} | **${r.qty || 0}** | ${r.uom || 'шт'} |`
        ).join('\n');

        return ok(`⚠️ Критически мало (≤5):\n\n| # | Название | Кол-во | Ед. |\n|---|----------|--------|-----|\n${rows}`);
    } catch {
        return ok('⚠️ Перейдите на экран Склада.');
    }
};

// ============================================================
// ACCOUNTANT
// ============================================================

const handleCheckInvoices = async (companyId?: string | null): Promise<ActionResult> => {
    if (!companyId) return ok('💰 Перейдите в раздел оплат.');

    try {
        const { data, error } = await supabase
            .from('proposals' as any)
            .select('id, supplier_name, total_amount, payment_status, created_at')
            .eq('company_id', companyId)
            .neq('payment_status', 'Оплачено')
            .order('created_at', { ascending: false })
            .limit(15);

        if (error) return ok('💰 Не удалось загрузить счета. Проверьте вкладку Приход.');
        if (!data?.length) return ok('✅ Все счета оплачены!');

        const rows = (data as any[]).map((r: any, i: number) => {
            const date = r.created_at ? new Date(r.created_at).toLocaleDateString('ru-RU') : '—';
            return `| ${i + 1} | ${r.supplier_name || '—'} | ${r.total_amount || '—'} | ${r.payment_status || 'Не оплачено'} | ${date} |`;
        }).join('\n');

        const total = (data as any[]).reduce((s: number, r: any) => s + (Number(r.total_amount) || 0), 0);

        return ok(`💰 Неоплаченные (${data.length}, итого: **${total.toLocaleString()} сом**):\n\n| # | Поставщик | Сумма | Статус | Дата |\n|---|-----------|-------|--------|------|\n${rows}`);
    } catch {
        return ok('💰 Перейдите во вкладку Приход для проверки счетов.');
    }
};

const handleExport1C = async (): Promise<ActionResult> => {
    try {
        const { count, error } = await supabase
            .from('onec_exchange_queue' as any)
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending');

        if (error) return ok('📤 Обмен с 1С включён. Очередь недоступна — проверьте БД.');

        const pending = count || 0;
        if (pending === 0) {
            return ok('📤 Очередь 1С пуста — всё выгружено.');
        }

        return ok(`📤 Готово к выгрузке в 1С: **${pending}** проводок.

Используйте RPC onec_exchange_fetch для выгрузки и onec_exchange_mark_exported для подтверждения.`);
    } catch {
        return ok('📤 Обмен с 1С включён. Очередь временно недоступна.');
    }
};

export default { executeAIAction };
