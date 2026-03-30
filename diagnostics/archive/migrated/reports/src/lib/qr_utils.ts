/**
 * QR Code & Barcode Utilities
 * QR codes generated via api.qrserver.com (real, scannable)
 * Barcodes generated inline as SVG (simplified Code-128)
 */

/**
 * Generate a URL for a real, scannable QR code image via external API
 * Uses api.qrserver.com which generates proper QR codes with Reed-Solomon
 */
export const generateQRCodeDataUrl = (data: string, size = 80): string => {
    try {
        const encoded = encodeURIComponent(data);
        return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&format=png`;
    } catch (e) {
        console.warn('[QR] Generation failed:', e);
        return '';
    }
};

/**
 * Generate a QR code as an img tag URL (for use in HTML templates)
 * @deprecated Use generateQRCodeDataUrl instead — returns a direct URL
 */
export const generateQRCodeSVG = (data: string, size = 80): string => {
    // Returns an external API URL that generates a real scannable QR code
    const encoded = encodeURIComponent(data);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&format=svg`;
};

// Old fake QR matrix generator removed — was missing Reed-Solomon error correction
// Now using api.qrserver.com for real, scannable QR codes

// ============================================
// BARCODE GENERATOR (Code 128 simplified)
// ============================================

/**
 * Generate a barcode data URL (Code 128-like)
 */
export const generateBarcodeDataUrl = (data: string, width = 200, height = 40): string => {
    try {
        const svg = generateBarcodeSVG(data, width, height);
        const encoded = encodeURIComponent(svg);
        return `data:image/svg+xml,${encoded}`;
    } catch (e) {
        console.warn('[Barcode] Generation failed:', e);
        return '';
    }
};

/**
 * Generate a simple barcode SVG
 */
export const generateBarcodeSVG = (data: string, width = 200, height = 40): string => {
    // Simplified Code 128-style encoding
    const pattern = textToBarPattern(data);
    const barWidth = width / pattern.length;

    let bars = '';
    let x = 0;
    for (let i = 0; i < pattern.length; i++) {
        if (pattern[i] === '1') {
            bars += `<rect x="${x}" y="0" width="${barWidth}" height="${height}" />`;
        }
        x += barWidth;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height + 20}" viewBox="0 0 ${width} ${height + 20}">
    <rect width="100%" height="100%" fill="white"/>
    <g fill="black">${bars}</g>
    <text x="${width / 2}" y="${height + 15}" text-anchor="middle" font-size="10" font-family="monospace">${escapeXml(data)}</text>
  </svg>`;
};

const textToBarPattern = (text: string): string => {
    // Simple encoding: each character becomes a 6-bit pattern
    let pattern = '11010'; // Start code
    for (let i = 0; i < text.length && i < 20; i++) {
        const code = text.charCodeAt(i);
        const binary = code.toString(2).padStart(6, '0');
        pattern += binary + '0'; // Add separator
    }
    pattern += '1101011'; // Stop code
    return pattern;
};

const escapeXml = (s: string): string =>
    String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

// ============================================
// DOCUMENT URL GENERATOR
// ============================================

/**
 * Document types supported for QR code generation
 */
export type DocumentType = 'proposal' | 'request' | 'ai-report' | 'invoice' | 'act' | 'construction';

/**
 * Edge Function base URL for PDF generation
 */
const EDGE_FUNCTION_URL = 'https://hfhpminaxxzyosquorii.supabase.co/functions/v1/pdf-download';

/**
 * Generate a URL for the document (for QR linking)
 * Uses Supabase Edge Function for direct PDF download
 * @param docType - Type of document (proposal, request, ai-report, etc.)
 * @param docId - Document ID
 * @returns Full URL to the Edge Function PDF generator
 */
export const getDocumentUrl = (docType: DocumentType | string, docId: string): string => {
    // Normalize doc type
    const normalizedType = docType.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    return `${EDGE_FUNCTION_URL}?type=${normalizedType}&id=${docId}`;
};

/**
 * Generate QR code data URL for a document
 * @param docType - Type of document
 * @param docId - Document ID 
 * @param size - QR code size in pixels (default: 80)
 * @returns Base64 data URL of SVG QR code
 */
export const generateDocumentQR = (docType: DocumentType | string, docId: string, size = 80): string => {
    const url = getDocumentUrl(docType, docId);
    return generateQRCodeDataUrl(url, size);
};

/**
 * Generate a short verification code for visual display
 * Useful for manual verification when QR scan fails
 */
export const generateVerificationCode = (docType: string, docId: string): string => {
    const typePrefix = (docType.charAt(0) + docType.charAt(docType.length - 1)).toUpperCase();
    const idSuffix = docId.replace(/-/g, '').slice(-6).toUpperCase();
    return `${typePrefix}-${idSuffix}`;
};
