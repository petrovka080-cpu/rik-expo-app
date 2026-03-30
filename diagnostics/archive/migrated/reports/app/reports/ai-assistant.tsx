import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, TextInput, Pressable, Image,
    ActivityIndicator, KeyboardAvoidingView, Platform,
    TouchableOpacity, Alert, StyleSheet, Dimensions
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabaseClient';
import VoiceInput from '../../src/components/VoiceInput';
import { getMyCompanyId, getMyRole } from '../../src/lib/rik_api';
import { getRoleSystemPrompt, CONSTRUCTION_AGENT_PROMPT } from '../../src/lib/ai_role_prompts';
import { sendToGemini, sendToGeminiWithImage, formatHistoryForGemini } from '../../src/lib/gemini_client';
import { executeAIAction } from '../../src/lib/ai_action_dispatcher';

const CHAT_STORAGE_KEY = 'ai_assistant_messages';
const MAX_STORED_MESSAGES = 50;

// Cross-platform storage: localStorage on web, AsyncStorage on native
const chatStorage = {
    getItem: async (key: string): Promise<string | null> => {
        if (Platform.OS === 'web') {
            try { return localStorage.getItem(key); } catch { return null; }
        }
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        return AsyncStorage.getItem(key);
    },
    setItem: async (key: string, value: string): Promise<void> => {
        if (Platform.OS === 'web') {
            try { localStorage.setItem(key, value); } catch { /* quota exceeded */ }
            return;
        }
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        await AsyncStorage.setItem(key, value);
    },
    removeItem: async (key: string): Promise<void> => {
        if (Platform.OS === 'web') {
            try { localStorage.removeItem(key); } catch { }
            return;
        }
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        await AsyncStorage.removeItem(key);
    },
};

const { width } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    actionType?: string; // AI action type (parse_items, create_request, etc)
    actionExecuted?: boolean; // whether action was auto-executed
    isDraft?: boolean; // NEW: whether this is a draft proposal requiring confirmation
    actionData?: any; // NEW: structured data for action execution
}

const ROLE_LABELS: Record<string, string> = {
    buyer: '🛒 Снабженец',
    foreman: '👷 Прораб',
    warehouse: '📦 Склад',
    accountant: '💰 Бухгалтер',
    director: '📊 Директор',
};

const getQuickQueries = (role: string) => {
    // Construction agent queries always available at the top
    const constructionQueries = [
        { label: '📐 Анализ чертежа', query: 'Приложи фото чертежа и я определю конструкции, размеры и рассчитаю материалы.', isPhotoHint: true },
        { label: '🧱 Расчёт материалов', query: 'Посчитай материалы на стяжку пола 100 м² толщиной 50 мм с учётом СНиП норм.' },
        { label: '📊 Сгенерировать смету', query: 'Составь подробную смету на штукатурку стен 200 м² с ценами в сомах.' },
        { label: '📸 Анализ стройплощадки', query: 'Приложи фото стройплощадки и я оценю процент готовности и выявлю нарушения.', isPhotoHint: true },
    ];

    switch (role) {
        case 'warehouse':
            return [
                ...constructionQueries,
                { label: '📦 Остатки склада', query: 'Покажи текущие остатки на основном складе в виде таблицы.' },
                { label: '📈 Приход сегодня', query: 'Какие материалы поступили на склад сегодня?' },
                { label: '⚠️ Критически мало', query: 'Составь список позиций, которых осталось меньше 5 единиц.' }
            ];
        case 'buyer':
            return [
                ...constructionQueries,
                { label: '🧱 К закупке', query: 'Какие заявки сейчас в статусе "К закупке"? Покажи таблицу.' },
                { label: '⚖️ Сравни цены', query: 'Найди 3 разных предложения на бетон М350 в каталоге.' },
                { label: '🚛 Статус доставки', query: 'Где сейчас находятся мои последние закупки?' }
            ];
        case 'accountant':
            return [
                ...constructionQueries,
                { label: '💰 К оплате', query: 'Покажи все счета, которые нужно оплатить сегодня.' },
                { label: '✅ Оплачено', query: 'Сводка по оплатам за последнюю неделю в таблице.' },
                { label: '📉 Долги', query: 'Список поставщиков, перед которыми есть задолженность.' }
            ];
        default:
            return [
                ...constructionQueries,
                { label: '📊 Отчет по работам', query: 'Составь подробный отчет о выполненных работах за последнюю неделю.' },
                { label: '💰 Сводка оплат', query: 'Покажи все последние оплаты у бухгалтера и общую сумму.' },
                { label: '🧱 Закупки', query: 'Какие материалы были закуплены в последнее время?' },
                { label: '📏 СНиП нормы', query: 'Выписка из СНиП по нормам расхода бетона.' }
            ];
    }
};

const markdownStyles = StyleSheet.create({
    body: { color: '#e2e8f0', fontSize: 16, lineHeight: 24 },
    table: { borderWidth: 1, borderColor: '#334155', borderRadius: 8, marginVertical: 10 },
    tr: { borderBottomWidth: 1, borderBottomColor: '#334155' },
    th: { backgroundColor: '#1e293b', padding: 8, fontWeight: 'bold', color: '#0ea5e9' },
    td: { padding: 8, color: '#e2e8f0' },
    heading3: { color: '#0ea5e9', fontWeight: 'bold', marginVertical: 8, fontSize: 18 },
    strong: { color: '#fff', fontWeight: 'bold' },
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function AIAssistantScreen() {
    const router = useRouter();
    const scrollViewRef = useRef<ScrollView>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string>('director');

    // ── Load saved messages + user info ──
    useEffect(() => {
        const init = async () => {
            const [cid, role] = await Promise.all([getMyCompanyId(), getMyRole()]);
            setCompanyId(cid);
            if (role) setUserRole(role);

            // Restore chat history
            try {
                const saved = await chatStorage.getItem(CHAT_STORAGE_KEY);
                if (saved) {
                    const parsed: Message[] = JSON.parse(saved).map((m: any) => ({
                        ...m,
                        timestamp: new Date(m.timestamp),
                    }));
                    if (parsed.length > 0) setMessages(parsed);
                }
            } catch {
                // First launch or corrupted data — start fresh
            }
        };
        init();
    }, []);

    // ── Persist messages on change ──
    useEffect(() => {
        if (messages.length === 0) return;
        const toStore = messages.slice(-MAX_STORED_MESSAGES);
        chatStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toStore)).catch(() => { });
    }, [messages]);

    // ── Auto-scroll ──
    useEffect(() => {
        if (messages.length === 0) return;
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 200);
    }, [messages]);

    // ── Clear chat ──
    const handleClearChat = useCallback(() => {
        const clearNow = () => {
            setMessages([]);
            chatStorage.removeItem(CHAT_STORAGE_KEY).catch(() => { });
        };

        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            if (window.confirm('Очистить историю сообщений?')) clearNow();
            return;
        }

        Alert.alert('Очистить чат?', 'Вся история сообщений будет удалена.', [
            { text: 'Отмена', style: 'cancel' },
            {
                text: 'Очистить', style: 'destructive',
                onPress: clearNow,
            },
        ]);
    }, []);

    const exportToPDF = async (content: string) => {
        try {
            // Import shared utilities
            const {
                PREMIUM_CSS,
                buildDocHeader,
                buildSignatures,
                buildDocFooter,
                wrapInHtmlDocument
            } = await import('../../src/lib/pdf_templates');
            const { generateDocumentQR } = await import('../../src/lib/qr_utils');

            const reportId = Math.random().toString(36).substring(2, 10).toUpperCase();
            const today = new Date().toLocaleDateString('ru-RU');

            // Save report to database for QR code linking
            const { data: { user } } = await supabase.auth.getUser();
            try {
                await supabase.from('ai_reports').insert({
                    id: reportId,
                    company_id: companyId,
                    user_id: user?.id,
                    role: userRole,
                    content: content,
                    metadata: { generatedAt: new Date().toISOString(), source: 'solto-ai' }
                });
                console.log('[AI Report] Saved to DB with ID:', reportId);
            } catch (saveErr) {
                console.warn('[AI Report] Failed to save to DB (QR may not work):', saveErr);
            }

            const qrDataUrl = generateDocumentQR('ai-report', reportId, 100);

            // --- ROBUST MARKDOWN TO HTML PARSER with CLEAN DATA MODE ---
            // Extracts only tables and section headers, skipping intro paragraphs
            const parseMarkdownToHtml = (md: string): string => {
                const lines = md.split('\n');
                let html = '';
                let inTable = false;
                let tableRows: string[][] = [];
                let hasHeader = false;
                let lastSectionHeader = ''; // Store last section header
                let hasAddedHeader = false; // Track if we've added the header for current table

                // Skip intro phrases patterns
                const introPatterns = [
                    /^здравствуй/i,
                    /^в предоставленных данных/i,
                    /^однако я могу/i,
                    /^я solto/i,
                    /^отсутствует/i,
                    /^к сожалению/i,
                ];

                const isIntroLine = (line: string): boolean => {
                    return introPatterns.some(p => p.test(line.trim()));
                };

                const flushTable = () => {
                    if (tableRows.length === 0) return;

                    // Add section header just before table if we have one
                    if (lastSectionHeader && !hasAddedHeader) {
                        html += `<h2>${lastSectionHeader}</h2>`;
                        hasAddedHeader = true;
                    }

                    let tableHtml = '<table class="ai-table">';
                    tableRows.forEach((row, rowIndex) => {
                        const isHeaderRow = rowIndex === 0 && hasHeader;
                        const tag = isHeaderRow ? 'th' : 'td';
                        const wrapper = isHeaderRow ? 'thead' : (rowIndex === 1 && hasHeader ? 'tbody' : '');

                        if (wrapper === 'thead') tableHtml += '<thead>';
                        if (wrapper === 'tbody') tableHtml += '<tbody>';

                        tableHtml += '<tr>' + row.map(cell => {
                            // Bold cells
                            const c = cell.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                            return `<${tag}>${c}</${tag}>`;
                        }).join('') + '</tr>';

                        if (wrapper === 'thead') tableHtml += '</thead>';
                    });
                    tableHtml += '</table>';
                    html += tableHtml;
                    tableRows = [];
                    hasHeader = false;
                    lastSectionHeader = ''; // Reset section header after flushing table
                };

                lines.forEach((line, i) => {
                    const trimmed = line.trim();

                    // Check if this is a table row (starts and ends with |)
                    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                        const cells = trimmed.slice(1, -1).split('|').map(c => c.trim());

                        // Check if this is a separator row (---|---|---)
                        if (cells.every(c => /^[-:]+$/.test(c))) {
                            hasHeader = true; // Previous row was actually header
                            return; // Skip separator row
                        }

                        if (!inTable) {
                            inTable = true;
                            hasAddedHeader = false; // Reset for new table
                        }
                        tableRows.push(cells);
                    } else {
                        // Not a table row - flush any accumulated table
                        if (inTable) {
                            flushTable();
                            inTable = false;
                        }

                        // Skip intro paragraphs
                        if (isIntroLine(trimmed)) {
                            return;
                        }

                        // Parse section headers - store them for tables
                        if (trimmed.startsWith('### ')) {
                            lastSectionHeader = trimmed.slice(4);
                            hasAddedHeader = false;
                        } else if (trimmed.startsWith('## ')) {
                            lastSectionHeader = trimmed.slice(3);
                            hasAddedHeader = false;
                        } else if (trimmed.startsWith('# ')) {
                            lastSectionHeader = trimmed.slice(2);
                            hasAddedHeader = false;
                        }
                        // Skip regular paragraphs - we only want tables!
                    }
                });

                // Flush any remaining table
                if (inTable) {
                    flushTable();
                }

                return html;
            };

            const contentHtml = parseMarkdownToHtml(content);

            // Build Header
            const headerHtml = buildDocHeader({
                title: 'Отчёт SOLTO',
                docNumber: reportId,
                date: today,
                status: 'Сформировано AI',
                qrDataUrl
            });

            // Build Info Block
            const infoBlockHtml = `
                <div class="info-block">
                    <div class="info-row"><span class="info-label">Компания ID:</span><span>${companyId || '—'}</span></div>
                    <div class="info-row"><span class="info-label">Роль:</span><span>${userRole || 'Система'}</span></div>
                    <div class="info-row"><span class="info-label">Источник:</span><span>SOLTO (GPT-4)</span></div>
                </div>
            `;

            // Build Signatures
            const signaturesHtml = buildSignatures('Заказчик', 'Исполнитель AI');

            // Build Footer
            const footerHtml = buildDocFooter();

            // Assemble Body with PREMIUM TABLE STYLING
            const bodyHtml = `
                <style>
                    /* Premium Info Block */
                    .info-block { 
                        margin: 20px 0; 
                        padding: 15px; 
                        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); 
                        border-radius: 8px; 
                        border-left: 4px solid #0ea5e9;
                    }
                    .info-row { display: flex; margin-bottom: 6px; font-size: 13px; }
                    .info-label { width: 140px; font-weight: 600; color: #475569; }
                    
                    /* Premium Headings */
                    h1 { font-size: 18px; color: #0f172a; margin: 20px 0 10px; font-weight: 700; }
                    h2 { font-size: 16px; color: #0ea5e9; margin: 18px 0 8px; font-weight: 600; border-bottom: 2px solid #0ea5e9; padding-bottom: 4px; }
                    h3 { font-size: 14px; color: #3b82f6; margin: 15px 0 6px; font-weight: 600; }
                    
                    /* Premium Table Styling - Override PREMIUM_CSS defaults */
                    .ai-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        margin: 15px 0 !important;
                        font-size: 12px !important;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
                        border-radius: 8px !important;
                        overflow: hidden !important;
                    }
                    .ai-table th {
                        background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%) !important;
                        color: white !important;
                        font-weight: 600 !important;
                        padding: 12px 10px !important;
                        text-align: left !important;
                        border: none !important;
                    }
                    .ai-table td {
                        padding: 10px !important;
                        border-bottom: 1px solid #e2e8f0 !important;
                        border-left: none !important;
                        border-right: none !important;
                        border-top: none !important;
                        background: white !important;
                    }
                    .ai-table tr:nth-child(even) td {
                        background: #f8fafc !important;
                    }
                    .ai-table tr:last-child td {
                        border-bottom: none !important;
                    }
                    .ai-table tr:hover td {
                        background: #f1f5f9 !important;
                    }
                    
                    /* Text Elements */
                    p { margin: 8px 0; line-height: 1.6; color: #334155; }
                    strong { font-weight: 700; color: #0f172a; }
                    em { font-style: italic; }
                    code { 
                        background: #f1f5f9; 
                        padding: 2px 6px; 
                        border-radius: 4px; 
                        font-family: monospace;
                        font-size: 11px;
                    }
                    
                    /* Section styling */
                    .ai-content {
                        padding: 10px 0;
                    }
                </style>
                ${headerHtml}
                ${infoBlockHtml}
                <div class="section">
                    <div class="section-title">Результаты анализа</div>
                    <div class="ai-content">
                        ${contentHtml}
                    </div>
                </div>
                ${signaturesHtml}
                ${footerHtml}
                <div style="font-size: 8px; color: #666; margin-top: 10px; text-align: center;">ID отчёта: ${reportId}</div>
            `;

            // Wrap in Standard Document
            const html = wrapInHtmlDocument(bodyHtml, 'AI Report');

            // Platform-specific PDF export
            if (Platform.OS === 'web') {
                // Web: Open in new window for printing
                const windowProxy = window.open('', '_blank');
                if (windowProxy) {
                    windowProxy.document.write(html);
                    windowProxy.document.close();
                    setTimeout(() => {
                        if (windowProxy) {
                            windowProxy.focus();
                            windowProxy.print();
                        }
                    }, 500);
                    Alert.alert('PDF Готов', 'Откроется диалог печати. Выберите "Сохранить как PDF".');
                } else {
                    Alert.alert('Ошибка', 'Не удалось открыть окно печати. Проверьте настройки блокировщика всплывающих окон.');
                }
            } else {
                // Native: Use expo-print
                const { uri } = await Print.printToFileAsync({ html });
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'AI Отчёт',
                    UTI: 'com.adobe.pdf'
                });
            }
        } catch (e: any) {
            console.error('[AI PDF] Export error:', e);
            Alert.alert('Ошибка PDF', e.message || 'Не удалось создать файл');
        }
    };

    // === IMAGE ATTACHMENT ===
    const [attachedImage, setAttachedImage] = useState<{ uri: string; base64: string; mimeType: string } | null>(null);

    const handlePickImage = useCallback(async () => {
        const options: ImagePicker.ImagePickerOptions = {
            mediaTypes: 'images' as any,
            quality: 0.7,
            base64: true,
            allowsEditing: false,
        };

        Alert.alert('📎 Прикрепить фото', 'Выберите источник', [
            {
                text: '📷 Камера', onPress: async () => {
                    const { status } = await ImagePicker.requestCameraPermissionsAsync();
                    if (status !== 'granted') { Alert.alert('Нет доступа к камере'); return; }
                    const result = await ImagePicker.launchCameraAsync(options);
                    if (!result.canceled && result.assets[0]) {
                        const asset = result.assets[0];
                        const mime = asset.mimeType || 'image/jpeg';
                        setAttachedImage({ uri: asset.uri, base64: asset.base64 || '', mimeType: mime });
                    }
                }
            },
            {
                text: '🖼️ Галерея', onPress: async () => {
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== 'granted') { Alert.alert('Нет доступа к галерее'); return; }
                    const result = await ImagePicker.launchImageLibraryAsync(options);
                    if (!result.canceled && result.assets[0]) {
                        const asset = result.assets[0];
                        const mime = asset.mimeType || 'image/jpeg';
                        setAttachedImage({ uri: asset.uri, base64: asset.base64 || '', mimeType: mime });
                    }
                }
            },
            { text: 'Отмена', style: 'cancel' }
        ]);
    }, []);

    // === EXCEL/CSV EXPORT ===
    const exportToExcel = useCallback(async (content: string) => {
        try {
            // Parse markdown tables into CSV
            const lines = content.split('\n');
            let csv = '';
            let inTable = false;

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                    // Skip separator rows like |---|---|---|
                    if (/^\|[\s-:|]+\|$/.test(trimmed)) continue;
                    const cells = trimmed.split('|').filter(c => c.trim() !== '').map(c => {
                        let cell = c.trim().replace(/"/g, '""');
                        // Remove markdown bold
                        cell = cell.replace(/\*\*/g, '');
                        return `"${cell}"`;
                    });
                    csv += cells.join(';') + '\n';
                    inTable = true;
                } else if (inTable && trimmed === '') {
                    csv += '\n';
                    inTable = false;
                } else if (trimmed.startsWith('#')) {
                    // Section header
                    const header = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
                    csv += `\n"${header}"\n`;
                }
            }

            if (!csv.trim()) {
                Alert.alert('Нет таблиц', 'В этом ответе нет данных для экспорта в Excel.');
                return;
            }

            // Add BOM for proper encoding in Excel
            const bom = '\uFEFF';
            const finalCsv = bom + csv;

            const fileName = `SOLTO_Report_${new Date().toISOString().slice(0, 10)}.csv`;
            const cacheDir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
            const fileUri = `${cacheDir}${fileName}`;
            await (FileSystem as any).writeAsStringAsync(fileUri, finalCsv, { encoding: (FileSystem as any).EncodingType?.UTF8 || 'utf8' });
            await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Экспорт отчёта' });
        } catch (err) {
            console.error('[Excel export]', err);
            Alert.alert('Ошибка', 'Не удалось экспортировать в Excel.');
        }
    }, []);

    const sendMessage = async (text?: string) => {
        const question = text || inputText.trim();
        if (!question || loading) return;

        const currentImage = attachedImage;
        setInputText('');
        setAttachedImage(null);
        setLoading(true);
        setSending(true);

        const userContent = currentImage ? `📷 [Фото приложено]\n${question}` : question;
        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: userContent, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);

        try {
            let response;

            if (currentImage && currentImage.base64) {
                // Use vision API with construction agent prompt
                const constructionPrompt = CONSTRUCTION_AGENT_PROMPT;
                const timeoutMs = 35000;
                const geminiPromise = sendToGeminiWithImage(
                    question,
                    currentImage.base64,
                    currentImage.mimeType,
                    'construction_agent',
                    constructionPrompt
                );
                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Превышено время ожидания (35с). Фото-анализ занимает больше времени.')), timeoutMs)
                );
                response = await Promise.race([geminiPromise, timeoutPromise]);
            } else {
                // Regular text-only flow
                const historyForGemini = messages
                    .filter(m => m.role !== 'system')
                    .slice(-10)
                    .map(m => ({
                        role: m.role === 'user' ? 'user' as const : 'model' as const,
                        parts: [{ text: m.content }],
                    }));

                const systemPrompt = getRoleSystemPrompt(userRole, companyId);
                const geminiPromise = sendToGemini(question, historyForGemini, userRole, systemPrompt);
                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Превышено время ожидания (20с). Попробуйте ещё раз.')), 20000)
                );
                response = await Promise.race([geminiPromise, timeoutPromise]);
            }

            // Format initial AI message
            let displayContent = response.message || 'Не удалось получить ответ.';

            // If AI parsed items, show them formatted
            if (response.items && response.items.length > 0 && response.action !== 'chat') {
                const itemsTable = response.items.map((item, i) =>
                    `| ${i + 1} | ${item.name} | ${item.qty} | ${item.unit} | ${item.specs || '—'} |`
                ).join('\n');
                displayContent += `\n\n| # | Название | Кол-во | Ед. | Спецификация |\n|---|----------|--------|-----|-------------|\n${itemsTable}`;
            }

            // Show AI response
            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: displayContent,
                actionType: response.action,
                isDraft: (response as any).isDraft,
                actionData: response,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMsg]);

            // Auto-execute non-critical actions
            const criticalActions = ['create_request', 'create_proposal', 'auto_procure'];
            if (response.action && !criticalActions.includes(response.action) && response.action !== 'chat' && response.action !== 'clarify') {
                executeAIAction(response, userRole, companyId)
                    .then(actionResult => {
                        if (actionResult.message && actionResult.message !== displayContent && actionResult.message !== response.message) {
                            const actionMsg: Message = {
                                id: (Date.now() + 2).toString(),
                                role: 'assistant',
                                content: actionResult.success
                                    ? `✅ **Выполнено:**\n\n${actionResult.message}`
                                    : `⚠️ ${actionResult.message}`,
                                actionExecuted: true,
                                timestamp: new Date()
                            };
                            setMessages(prev => [...prev, actionMsg]);
                        }
                    })
                    .catch(() => { /* non-critical */ });
            }
        } catch (error: any) {
            console.error('[AI] sendMessage error:', error);
            const errMsg = error?.message?.includes('время') || error?.message?.includes('Timeout')
                ? '⏱ Превышено время ожидания. Попробуйте ещё раз или задайте более короткий вопрос.'
                : `❌ ${error?.message || 'Не удалось связаться с AI. Проверьте интернет.'}`;
            setMessages(prev => [...prev, {
                id: 'err-' + Date.now(),
                role: 'system',
                content: errMsg,
                timestamp: new Date()
            }]);
        } finally {
            setLoading(false);
            setSending(false);
        }
    };

    return (
        <KeyboardAvoidingView style={s.container} behavior='padding' keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.replace('/(tabs)/reports')} style={s.backBtn}>
                    <Ionicons name="close-outline" size={30} color="#fff" />
                </TouchableOpacity>
                <View style={s.headerTitleContainer}>
                    <Text style={s.headerTitle}>SOLTO</Text>
                    <View style={s.onlineBadge}>
                        <View style={s.onlineDot} />
                        <Text style={s.onlineText}>{ROLE_LABELS[userRole] || 'Помощник'}</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={handleClearChat} style={{ width: 40, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Очистить чат" accessibilityRole="button">
                    <Ionicons name="trash-outline" size={22} color="#94a3b8" />
                </TouchableOpacity>
            </View>

            <ScrollView ref={scrollViewRef} style={s.chatScroll} contentContainerStyle={{ paddingBottom: 20 }}>
                {messages.length === 0 && (
                    <View style={s.welcomeBox}>
                        <View style={s.aiLogo}><Text style={s.aiLogoText}>BF</Text></View>
                        <Text style={s.welcomeTitle}>Привет! Я ваш AI-помощник</Text>
                        <Text style={s.welcomeSub}>
                            {userRole === 'buyer' && 'Ищу поставщиков, сравниваю цены, заполняю заявки.'}
                            {userRole === 'foreman' && 'Создаю заявки голосом, считаю расход материалов.'}
                            {userRole === 'warehouse' && 'Проверяю остатки, принимаю поставки, ищу дефицит.'}
                            {userRole === 'accountant' && 'Проверяю счета, отслеживаю оплаты, считаю задолженности.'}
                            {!['buyer', 'foreman', 'warehouse', 'accountant'].includes(userRole) && 'Анализирую данные вашей компании и помогаю управлять процессами.'}
                        </Text>
                    </View>
                )}

                {messages.map(msg => (
                    <View key={msg.id} style={[s.bubble, msg.role === 'user' ? s.userBubble : s.aiBubble]}>
                        <View style={s.bubbleHeader}>
                            <Text style={s.roleLabel}>{msg.role === 'user' ? 'Вы' : 'SOLTO'}</Text>
                        </View>

                        {msg.role === 'assistant' ? (
                            <Markdown style={markdownStyles}>{msg.content}</Markdown>
                        ) : (
                            <Text style={s.msgText}>{msg.content}</Text>
                        )}

                        {msg.role === 'assistant' && (
                            <View style={s.aiActionsRow}>
                                <TouchableOpacity onPress={() => exportToPDF(msg.content)} style={s.pdfActionMini}>
                                    <Ionicons name="document-text" size={16} color="#0ea5e9" />
                                    <Text style={s.pdfActionMiniText}>PDF</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => exportToExcel(msg.content)} style={[s.pdfActionMini, { borderColor: '#22c55e50' }]}>
                                    <Ionicons name="grid-outline" size={16} color="#22c55e" />
                                    <Text style={[s.pdfActionMiniText, { color: '#22c55e' }]}>Excel</Text>
                                </TouchableOpacity>

                                {msg.isDraft && msg.actionData && !msg.actionExecuted && (
                                    <TouchableOpacity
                                        onPress={() => {
                                            const originalAction = msg.actionData;
                                            originalAction.isDraft = false; // Confirm execution
                                            executeAIAction(originalAction, userRole, companyId)
                                                .then(res => {
                                                    // Update UI to show execution result
                                                    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, actionExecuted: true } : m));
                                                    setMessages(prev => [...prev, {
                                                        id: 'res-' + Date.now(),
                                                        role: 'assistant',
                                                        content: res.message,
                                                        timestamp: new Date()
                                                    }]);
                                                });
                                        }}
                                        style={s.confirmActionBtn}
                                    >
                                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                                        <Text style={s.confirmActionText}>
                                            {msg.actionType === 'create_request' ? 'ОТПРАВИТЬ ЗАЯВКУ' : 'ОФОРМИТЬ ЗАКАЗ'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                ))}

                {loading && (
                    <View style={[s.bubble, s.aiBubble]}>
                        <ActivityIndicator color="#0ea5e9" size="small" />
                        <Text style={s.loadingText}>Генерирую ответ...</Text>
                    </View>
                )}
            </ScrollView>

            <View style={s.quickBarWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.quickScroll}>
                    {getQuickQueries(userRole).map((item, idx) => (
                        <TouchableOpacity key={idx} style={s.quickChip} onPress={() => sendMessage(item.query)}>
                            <Text style={s.quickChipText}>{item.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Attached image preview */}
            {attachedImage && (
                <View style={s.imagePreviewWrap}>
                    <Image source={{ uri: attachedImage.uri }} style={s.imagePreview} />
                    <TouchableOpacity
                        onPress={() => setAttachedImage(null)}
                        style={s.imageRemoveBtn}
                        accessibilityLabel="Удалить фото"
                        accessibilityRole="button"
                    >
                        <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                    <Text style={s.imagePreviewLabel}>📷 Фото приложено</Text>
                </View>
            )}

            <View style={s.inputWrapper}>
                <View style={s.inputInner}>
                    <TouchableOpacity
                        onPress={handlePickImage}
                        style={s.attachBtn}
                        accessibilityLabel="Прикрепить фото или чертёж"
                        accessibilityRole="button"
                    >
                        <Ionicons name="camera-outline" size={22} color={attachedImage ? '#22c55e' : '#64748b'} />
                    </TouchableOpacity>
                    <TextInput
                        style={s.textInput}
                        placeholder={attachedImage ? 'Опишите что на фото...' : 'Спросите об объектах или деньгах...'}
                        placeholderTextColor="#64748b"
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                    />
                    <VoiceInput
                        onRecordingComplete={async (_uri: string, _duration: number) => {
                            // Keep audio callback for non-web fallback path.
                        }}
                        onTranscription={(text: string) => {
                            setInputText((prev) => (prev ? `${prev} ${text}` : text));
                        }}
                        enableTranscription
                        onSendPress={() => sendMessage()}
                        hasText={inputText.trim().length > 0 || !!attachedImage}
                        sending={loading || sending}
                        accentColor="#0ea5e9"
                    />
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    header: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#1e293b', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { padding: 5 },
    headerTitleContainer: { alignItems: 'center' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
    onlineBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e', marginRight: 6 },
    onlineText: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },

    chatScroll: { flex: 1, paddingHorizontal: 16 },
    welcomeBox: { marginTop: 60, alignItems: 'center', paddingHorizontal: 20 },
    aiLogo: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#0ea5e9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    aiLogoText: { color: '#fff', fontSize: 24, fontWeight: '900' },
    welcomeTitle: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center' },
    welcomeSub: { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 20 },

    bubble: { maxWidth: '90%', padding: 16, borderRadius: 20, marginBottom: 16, borderTopLeftRadius: 4 },
    userBubble: { alignSelf: 'flex-end', backgroundColor: '#1e293b', borderTopLeftRadius: 20, borderTopRightRadius: 4 },
    aiBubble: { alignSelf: 'flex-start', backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b' },
    bubbleHeader: { marginBottom: 6 },
    roleLabel: { fontSize: 10, fontWeight: '800', color: '#0ea5e9', textTransform: 'uppercase' },
    msgText: { color: '#e2e8f0', fontSize: 16, lineHeight: 24 },
    loadingText: { color: '#A1A1AA', fontSize: 12, marginTop: 8 },

    pdfActionMini: { alignSelf: 'flex-start', backgroundColor: '#0ea5e915', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 0.5, borderColor: '#0ea5e950' },
    pdfActionMiniText: { color: '#0ea5e9', fontWeight: '800', fontSize: 11, marginLeft: 4 },

    aiActionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
    confirmActionBtn: { backgroundColor: '#0ea5e9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
    confirmActionText: { color: '#fff', fontWeight: 'bold', fontSize: 12, marginLeft: 6 },

    quickBarWrap: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#1e293b' },
    quickScroll: { paddingHorizontal: 16, gap: 10 },
    quickChip: { backgroundColor: '#1e293b', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 15, borderWidth: 1, borderColor: '#334155', marginRight: 10 },
    quickChipText: { color: '#cbd5e1', fontSize: 13, fontWeight: '600' },

    inputWrapper: { paddingHorizontal: 16, paddingBottom: 30, paddingTop: 10 },
    inputInner: { backgroundColor: '#1e293b', borderRadius: 30, paddingLeft: 8, paddingRight: 8, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    textInput: { flex: 1, color: '#fff', fontSize: 16, maxHeight: 120, paddingTop: 10 },
    attachBtn: { padding: 8, marginRight: 2 },
    imagePreviewWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#0f172a', borderTopWidth: 1, borderTopColor: '#1e293b' },
    imagePreview: { width: 56, height: 56, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
    imageRemoveBtn: { marginLeft: 8 },
    imagePreviewLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginLeft: 8 },
});
