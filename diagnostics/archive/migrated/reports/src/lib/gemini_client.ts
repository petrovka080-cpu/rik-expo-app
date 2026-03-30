/**
 * Gemini AI Client
 * 
 * Wrapper for Google Generative AI (Gemini) API
 * Used for smart procurement assistant conversations
 */

import { GoogleGenAI } from '@google/genai';
import Constants from 'expo-constants';
import { getRoleSystemPrompt } from './ai_role_prompts';

type ExpoExtraConfig = {
    geminiApiKey?: string;
    geminiModel?: string;
};

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const FALLBACK_GEMINI_MODELS = ['gemini-2.5-flash-lite'];

const getGeminiConfig = (): { apiKey: string; model: string } => {
    const extra = (Constants.expoConfig?.extra || {}) as ExpoExtraConfig;
    const apiKey = (extra.geminiApiKey
        || process.env.EXPO_PUBLIC_GEMINI_API_KEY
        || '').trim();
    const model = (extra.geminiModel
        || process.env.EXPO_PUBLIC_GEMINI_MODEL
        || DEFAULT_GEMINI_MODEL).trim();
    return { apiKey, model };
};

let genAI: GoogleGenAI | null = null;
let cachedApiKey = '';

const getGenAI = (): GoogleGenAI | null => {
    const { apiKey } = getGeminiConfig();
    if (!apiKey) return null;
    if (!genAI || cachedApiKey !== apiKey) {
        genAI = new GoogleGenAI({ apiKey });
        cachedApiKey = apiKey;
    }
    return genAI;
};

const getModelCandidates = (preferred: string): string[] => {
    const candidates = [
        preferred,
        DEFAULT_GEMINI_MODEL,
        ...FALLBACK_GEMINI_MODELS,
    ].map(m => m.trim()).filter(Boolean);
    return [...new Set(candidates)];
};

const isModelNotFoundError = (error: unknown): boolean => {
    const message = (error as { message?: string })?.message || '';
    const statusCode = (error as { status?: number })?.status;
    return /model|not\s*found|does not exist|deprecated|not supported/i.test(message)
        || statusCode === 404;
};

const isRateLimitError = (error: unknown): boolean => {
    const statusCode = (error as { status?: number })?.status;
    const message = (error as { message?: string })?.message || '';
    return statusCode === 429 || /rate.limit|quota|too many/i.test(message);
};

// Safety settings for construction context
const safetySettings = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
];


// ============================================
// SYSTEM PROMPT — delegates to ai_role_prompts.ts
// ============================================

/**
 * Get system prompt for the given role.
 * Delegates to ai_role_prompts.ts for role-specific prompts.
 */
export const getSystemPromptForRole = (role?: string, companyId?: string | null): string => {
    return getRoleSystemPrompt(role, companyId);
};

// ============================================
// TYPES
// ============================================

export interface GeminiMessage {
    role: 'user' | 'model';
    parts: Array<{ text: string }>;
}

export interface ParsedGeminiResponse {
    action: 'auto_procure' | 'search_market' | 'search_market_wide' | 'parse_items' | 'clarify' | 'ask_quantity' | 'ask_clarification' | 'confirm' | 'chat'
    | 'create_request' | 'create_proposal' | 'calculate_materials'
    | 'search_supplier' | 'set_price' | 'approve_items' | 'compare_prices'
    | 'accept_delivery' | 'check_stock' | 'track_usage' | 'find_deficit'
    | 'check_invoices' | 'mark_paid' | 'calculate_debt' | 'payment_report'
    | 'export_1c' | 'create_postings'
    | 'generate_estimate' | 'analyze_blueprint' | 'analyze_photo';
    intent?: 'procurement' | 'market_search' | 'price_check' | 'auto_purchase' | 'question';
    thought?: string; // AI's chain of thought or reasoning
    items: Array<{
        name: string;
        qty: number;
        unit: string;
        specs?: string;
        kind?: 'material' | 'work' | 'service';
        price?: number | string; // NEW: suggested or found price
        supplier?: string; // NEW: supplier name
    }>;
    isDraft?: boolean; // NEW: AI proposes a draft, not yet in DB
    message: string;
    suggestions?: string[];
    clarification?: string; // Clarifying question when action=clarify
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Check if Gemini is available
 */
export const isGeminiAvailable = (): boolean => {
    const { apiKey } = getGeminiConfig();
    return apiKey.length > 0;
};

/**
 * Send message to Gemini with conversation history
 */
export const sendToGemini = async (
    userMessage: string,
    history: GeminiMessage[] = [],
    role?: string,
    customSystemPrompt?: string
): Promise<ParsedGeminiResponse> => {
    const client = getGenAI();
    const { model: preferredModel } = getGeminiConfig();

    if (!client) {
        console.warn('[Gemini] API key not configured, using fallback');
        return createFallbackResponse(userMessage);
    }

    try {
        // Use custom prompt or default for role
        const systemPrompt = customSystemPrompt || getSystemPromptForRole(role);

        const requestConfig = {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 1024,
            safetySettings,
            systemInstruction: systemPrompt,
        };

        let lastError: unknown = null;
        let retriedRateLimit = false;
        const modelCandidates = getModelCandidates(preferredModel);

        for (let i = 0; i < modelCandidates.length; i++) {
            const modelName = modelCandidates[i];

            try {
                const chat = client.chats.create({
                    model: modelName,
                    history: history.length > 0 ? history : undefined,
                });

                // Send message with 15s timeout
                const timeoutMs = 15000;
                const sendPromise = chat.sendMessage({
                    message: userMessage,
                    config: requestConfig,
                });
                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Gemini API timeout (15s)')), timeoutMs)
                );
                const result = await Promise.race([sendPromise, timeoutPromise]);
                const responseText = result.text || '';

                if (i > 0) {
                    console.warn(`[Gemini] Fallback model used: ${modelName}`);
                }

                // Parse JSON response
                return parseGeminiResponse(responseText);
            } catch (error: any) {
                lastError = error;

                // Rate limit: wait 3s and retry same model once, do NOT cascade
                // (all models share the same API key quota)
                if (isRateLimitError(error) && !retriedRateLimit) {
                    retriedRateLimit = true;
                    console.warn(`[Gemini] Rate limited on ${modelName}, retrying in 3s...`);
                    await new Promise(r => setTimeout(r, 3000));
                    i--; // retry same model
                    continue;
                }

                // If still rate limited after retry, stop — don't cascade to other models
                if (isRateLimitError(error)) {
                    console.warn(`[Gemini] Rate limit persists on ${modelName}, stopping retries`);
                    break;
                }

                // Only cascade to next model for 404/model-not-found errors
                const canRetry = i < modelCandidates.length - 1 && isModelNotFoundError(error);
                if (canRetry) {
                    console.warn(`[Gemini] Model not found (${modelName}). Trying fallback...`);
                    retriedRateLimit = false;
                    continue;
                }
                throw error;
            }
        }

        console.error('[Gemini] All model candidates failed', lastError);
        return createFallbackResponse(userMessage);
    } catch (error: any) {
        console.error('[Gemini] Error:', error);
        return createFallbackResponse(userMessage);
    }
};

/**
 * Send message with image to Gemini (vision analysis)
 * Used for blueprint analysis, photo analysis, material estimation from images
 */
export const sendToGeminiWithImage = async (
    userMessage: string,
    imageBase64: string,
    mimeType: string = 'image/jpeg',
    role?: string,
    customSystemPrompt?: string
): Promise<ParsedGeminiResponse> => {
    const client = getGenAI();
    const { model: preferredModel } = getGeminiConfig();

    if (!client) {
        console.warn('[Gemini] API key not configured, using fallback');
        return createFallbackResponse(userMessage);
    }

    try {
        const systemPrompt = customSystemPrompt || getSystemPromptForRole(role);

        const contents = [
            {
                role: 'user' as const,
                parts: [
                    { text: `${systemPrompt}\n\n${userMessage}` },
                    {
                        inlineData: {
                            mimeType,
                            data: imageBase64,
                        },
                    },
                ],
            },
        ];

        let lastError: unknown = null;
        let retriedRateLimit = false;
        const modelCandidates = getModelCandidates(preferredModel);

        for (let i = 0; i < modelCandidates.length; i++) {
            const modelName = modelCandidates[i];

            try {
                const timeoutMs = 30000; // 30s for image analysis
                const sendPromise = (client as any).models.generateContent({
                    model: modelName,
                    contents,
                    config: {
                        temperature: 0.7,
                        topP: 0.9,
                        maxOutputTokens: 4096,
                        safetySettings,
                    },
                });
                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Gemini Vision timeout (30s)')), timeoutMs)
                );
                const result = await Promise.race([sendPromise, timeoutPromise]);
                const responseText = result.text || '';

                if (i > 0) {
                    console.warn(`[Gemini Vision] Fallback model used: ${modelName}`);
                }

                return parseGeminiResponse(responseText);
            } catch (error: any) {
                lastError = error;

                if (isRateLimitError(error) && !retriedRateLimit) {
                    retriedRateLimit = true;
                    console.warn(`[Gemini Vision] Rate limited on ${modelName}, retrying in 3s...`);
                    await new Promise(r => setTimeout(r, 3000));
                    i--;
                    continue;
                }

                if (isRateLimitError(error)) {
                    console.warn(`[Gemini Vision] Rate limit persists on ${modelName}, stopping`);
                    break;
                }

                const canRetry = i < modelCandidates.length - 1 && isModelNotFoundError(error);
                if (canRetry) {
                    console.warn(`[Gemini Vision] Model not found (${modelName}). Trying fallback...`);
                    retriedRateLimit = false;
                    continue;
                }
                throw error;
            }
        }

        console.error('[Gemini Vision] All model candidates failed', lastError);
        return createFallbackResponse(userMessage);
    } catch (error: any) {
        console.error('[Gemini Vision] Error:', error);
        return createFallbackResponse(userMessage);
    }
};

/**
 * Parse Gemini response text to structured format
 */
const parseGeminiResponse = (text: string): ParsedGeminiResponse => {
    try {
        // Try to extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                thought: parsed.thought,
                action: parsed.action || 'chat',
                items: (parsed.items || []).map((item: any) => ({
                    ...item,
                    kind: item.kind || 'material',
                })),
                message: parsed.message || text,
                suggestions: parsed.suggestions,
            };
        }
    } catch {
        console.warn('[Gemini] Failed to parse JSON response');
    }

    // Fallback: treat as chat response
    return {
        action: 'chat',
        items: [],
        message: text,
    };
};

/**
 * Create fallback response when Gemini is not available
 */
const createFallbackResponse = (message: string): ParsedGeminiResponse => {
    // Use simple rule-based parsing
    const items = extractItemsFromText(message);

    if (items.length > 0) {
        return {
            action: 'search_market',
            items,
            message: `🔍 Ищу ${items.map(i => i.name).join(', ')} на рынке...`,
        };
    }

    return {
        action: 'chat',
        items: [],
        message: '🤔 Пожалуйста, укажите конкретные материалы и количество.\n\nПример: "Цемент М400 20 мешков"',
    };
};

/**
 * Simple rule-based item extraction (fallback)
 * Comprehensive patterns for construction materials
 */
const extractItemsFromText = (text: string): Array<{ name: string; qty: number; unit: string }> => {
    const items: Array<{ name: string; qty: number; unit: string }> = [];

    // Extended unit patterns with common construction units
    const unitPatterns: Array<{ regex: RegExp; unit: string }> = [
        // Cubic meters
        { regex: /(\d+(?:[.,]\d+)?)\s*(м[³3]|куб(?:ов|а|ометр)?|кубик)/i, unit: 'м³' },
        // Square meters
        { regex: /(\d+(?:[.,]\d+)?)\s*(м[²2]|кв\.?\s*м|квадрат)/i, unit: 'м²' },
        // Linear meters
        { regex: /(\d+(?:[.,]\d+)?)\s*(м|метр(?:ов)?)\b/i, unit: 'м' },
        // Bags (cement, mixes)
        { regex: /(\d+)\s*(мешк(?:ов|а)?|меш)/i, unit: 'мешок' },
        // Tons
        { regex: /(\d+(?:[.,]\d+)?)\s*(т|тонн[аы]?)\b/i, unit: 'т' },
        // Kilograms
        { regex: /(\d+(?:[.,]\d+)?)\s*(кг|кило(?:грамм)?)/i, unit: 'кг' },
        // Liters
        { regex: /(\d+(?:[.,]\d+)?)\s*(л|литр(?:ов)?)/i, unit: 'л' },
        // Rolls
        { regex: /(\d+)\s*(рулон(?:ов|а)?)/i, unit: 'рулон' },
        // Packs
        { regex: /(\d+)\s*(упак(?:овок|овки)?|пач(?:ек|ки)?)/i, unit: 'упак' },
        // Pieces (default)
        { regex: /(\d+)\s*(шт(?:ук[аи]?)?|ед(?:иниц)?)?/i, unit: 'шт' },
    ];

    // Split by common separators
    const parts = text.split(/[,;]+|\s+и\s+|\n/).map(s => s.trim()).filter(Boolean);

    for (const part of parts) {
        let qty = 1;
        let unit = 'шт';
        let cleanPart = part;
        let matched = false;

        // Try each unit pattern
        for (const { regex, unit: u } of unitPatterns) {
            const match = regex.exec(part);
            if (match) {
                qty = parseFloat(match[1].replace(',', '.'));
                unit = u;
                cleanPart = part.replace(match[0], ' ').trim();
                matched = true;
                break;
            }
        }

        // If no unit pattern matched, try to extract standalone number
        if (!matched) {
            const numMatch = /(\d+)/.exec(part);
            if (numMatch) {
                qty = parseInt(numMatch[1], 10);
                cleanPart = part.replace(numMatch[0], ' ').trim();
            }
        }

        // Clean up material name
        const name = cleanPart
            .replace(/^(нужен|нужна|нужно|нужны|закажи|закупи|требуется|купи|заказать|добавь)\s+/i, '')
            .replace(/\s+(пожалуйста|плз|срочно|побыстрее)$/i, '')
            .replace(/\s+/g, ' ')
            .trim();

        if (name.length > 1 && qty > 0) {
            items.push({ name, qty, unit });
        }
    }

    return items;
};

/**
 * Format conversation history for Gemini
 */
export const formatHistoryForGemini = (
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
): GeminiMessage[] => {
    return messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
    }));
};

/**
 * Transcribe audio using Gemini
 * Records audio on native, sends base64 to Gemini for speech-to-text
 */
export const transcribeAudio = async (audioUri: string): Promise<string> => {
    const client = getGenAI();
    if (!client) {
        throw new Error('Gemini API key not configured');
    }

    const { model: preferredModel } = getGeminiConfig();

    // Read audio file as base64
    const FileSystem = await import('expo-file-system/legacy');
    const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: 'base64' as any,
    });

    // Determine MIME type from URI
    const ext = audioUri.split('.').pop()?.toLowerCase() || 'm4a';
    const mimeMap: Record<string, string> = {
        m4a: 'audio/mp4',
        mp4: 'audio/mp4',
        wav: 'audio/wav',
        mp3: 'audio/mpeg',
        aac: 'audio/aac',
        ogg: 'audio/ogg',
        webm: 'audio/webm',
    };
    const mimeType = mimeMap[ext] || 'audio/mp4';

    const modelCandidates = getModelCandidates(preferredModel);
    let lastError: unknown = null;

    for (let i = 0; i < modelCandidates.length; i++) {
        const modelName = modelCandidates[i];
        try {
            const response = await (client as any).models.generateContent({
                model: modelName,
                contents: [
                    {
                        role: 'user',
                        parts: [
                            {
                                inlineData: {
                                    mimeType,
                                    data: base64Audio,
                                },
                            },
                            {
                                text: 'Транскрибируй это аудио. Верни ТОЛЬКО текст, который произнесён. Без комментариев, без кавычек, без пояснений. Если аудио пустое или неразборчивое — верни пустую строку.',
                            },
                        ],
                    },
                ],
                config: {
                    temperature: 0.1,
                    maxOutputTokens: 1024,
                },
            });

            const text = (response.text || '').trim();
            if (i > 0) {
                console.warn(`[transcribeAudio] Fallback model used: ${modelName}`);
            }
            console.log(`[transcribeAudio] Result: "${text.substring(0, 100)}..."`);
            return text;
        } catch (error: any) {
            lastError = error;
            if (i < modelCandidates.length - 1 && isModelNotFoundError(error)) {
                console.warn(`[transcribeAudio] Model failed (${modelName}). Trying fallback...`);
                continue;
            }
            throw error;
        }
    }

    throw lastError || new Error('All model candidates failed');
};

export default {
    isGeminiAvailable,
    sendToGemini,
    sendToGeminiWithImage,
    transcribeAudio,
    formatHistoryForGemini,
};
