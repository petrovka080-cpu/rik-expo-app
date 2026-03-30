import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

/**
 * Universal PDF export function for Expo SDK 54+
 * Handles Android, iOS and Web.
 */
export async function exportPdf(html: string, filename: string) {
    try {
        // 1. Web Implementation
        if (Platform.OS === 'web') {
            const windowProxy = window.open('', '_blank');
            if (windowProxy) {
                windowProxy.document.write(html);
                windowProxy.document.close();

                // Wait for styles/images if any
                setTimeout(() => {
                    if (windowProxy) {
                        windowProxy.focus();
                        windowProxy.print();
                    }
                }, 500);
            }
            return { success: true, method: 'web-print' };
        }

        // 2. Native Implementation (Android/iOS)
        const { uri } = await Print.printToFileAsync({ html });

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
                UTI: 'com.adobe.pdf',
                mimeType: 'application/pdf',
                dialogTitle: filename,
            });
            return { success: true, uri, method: 'sharing' };
        } else {
            console.warn('[exportPdf] Sharing not available on this device');
            return { success: false, uri, error: 'Sharing unavailable' };
        }
    } catch (error: any) {
        console.error('[exportPdf] Error:', error?.message || error);
        throw error;
    }
}

/**
 * Helper to get a clean cache URI using SDK 54.
 * Uses fallback to cacheDirectory to prevent crashes.
 */
export function getPdfCacheUri(targetName: string): string {
    // Try to use Paths if available, else fallback to cacheDirectory
    const Paths = (FileSystem as any).Paths;
    const cacheDirUri = Paths?.cache?.uri || (FileSystem as any).cacheDirectory || '';

    return `${cacheDirUri}${cacheDirUri.endsWith('/') ? '' : '/'}${targetName}`;
}
