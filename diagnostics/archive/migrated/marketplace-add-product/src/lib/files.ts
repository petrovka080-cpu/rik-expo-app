// src/lib/files.ts
import { supabase } from './supabaseClient';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Platform } from 'react-native';

/** Переиспользуем аплоадер из rik_api.ts */
export { uploadProposalAttachment } from './catalog_api';

/* =======================================================================================
 *                              П У Б Л И Ч Н Ы Е   P D F
 *  Bucket: documents (public) — для QR кодов с прямой ссылкой на скачивание PDF
 * ======================================================================================= */

export type DocumentCategory = 'proposal' | 'request' | 'ai-report' | 'construction' | 'act' | 'report';

/**
 * Upload a PDF file to Supabase Storage and return public URL for QR code.
 * The PDF can then be directly downloaded when QR is scanned.
 * 
 * @param localUri - Local file URI from expo-print (e.g., file:///...)
 * @param docType - Type of document (proposal, request, etc.)
 * @param docId - Document ID (will be part of the file path)
 * @returns Public URL that can be embedded in QR code
 */
export async function uploadPdfGetPublicUrl(
  localUri: string,
  docType: DocumentCategory,
  docId: string
): Promise<string> {
  try {
    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: 'base64',
    });

    // Convert base64 to Uint8Array
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Generate unique path
    const timestamp = Date.now();
    const shortId = docId.replace(/-/g, '').slice(0, 12);
    const path = `${docType}/${shortId}_${timestamp}.pdf`;

    // Upload to 'documents' bucket (must be public)
    const bucket = supabase.storage.from('documents');
    const { error: uploadError } = await bucket.upload(path, bytes, {
      contentType: 'application/pdf',
      upsert: true,
      cacheControl: '31536000', // 1 year cache
    });

    if (uploadError) {
      console.error('[uploadPdfGetPublicUrl] Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data } = bucket.getPublicUrl(path);
    const publicUrl = data?.publicUrl;

    if (!publicUrl) {
      throw new Error('Не удалось получить публичную ссылку');
    }

    console.log('[uploadPdfGetPublicUrl] Success:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('[uploadPdfGetPublicUrl] Error:', error);
    throw error;
  }
}

/**
 * Get a DETERMINISTIC Storage URL for a document (before uploading).
 * This allows QR codes to be generated with the URL before the PDF is actually uploaded.
 * 
 * The URL format is: https://{project}.supabase.co/storage/v1/object/public/documents/{docType}/{docId}.pdf
 */
export function getPdfStorageUrl(docType: DocumentCategory, docId: string): string {
  // Get Supabase URL from environment
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://hfhpminaxxzyosquorii.supabase.co';
  const shortId = docId.replace(/-/g, '').slice(0, 16);
  return `${supabaseUrl}/storage/v1/object/public/documents/${docType}/${shortId}.pdf`;
}

/**
 * Upload a PDF file to a SPECIFIC path in Storage (deterministic path).
 * Works cross-platform: uses fetch on web, FileSystem on native.
 */
export async function uploadPdfToStoragePath(
  localUri: string,
  docType: DocumentCategory,
  docId: string
): Promise<string> {
  const { Platform } = await import('react-native');

  // Generate deterministic path
  const shortId = docId.replace(/-/g, '').slice(0, 16);
  const path = `${docType}/${shortId}.pdf`;

  console.log('[uploadPdfToStoragePath] Starting upload:', { localUri, path, platform: Platform.OS });

  try {
    let fileData: Blob | Uint8Array;

    if (Platform.OS === 'web') {
      // WEB: fetch the local file URI (blob URL) and convert to blob
      console.log('[uploadPdfToStoragePath] Web platform - using fetch');
      const response = await fetch(localUri);
      fileData = await response.blob();
    } else {
      // NATIVE: use FileSystem to read as base64
      console.log('[uploadPdfToStoragePath] Native platform - using FileSystem');
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: 'base64',
      });

      // Convert base64 to Uint8Array
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileData = bytes;
    }

    // Upload to 'documents' bucket
    const bucket = supabase.storage.from('documents');
    const { error: uploadError, data: uploadData } = await bucket.upload(path, fileData, {
      contentType: 'application/pdf',
      upsert: true,
      cacheControl: '31536000',
    });

    if (uploadError) {
      console.error('[uploadPdfToStoragePath] Upload error:', uploadError);
      throw uploadError;
    }

    console.log('[uploadPdfToStoragePath] Upload success:', uploadData);

    // Get public URL
    const { data } = bucket.getPublicUrl(path);
    const publicUrl = data?.publicUrl || getPdfStorageUrl(docType, docId);

    console.log('[uploadPdfToStoragePath] Public URL:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('[uploadPdfToStoragePath] Error:', error);
    throw error;
  }
}

/**
 * Generate QR code data URL containing a direct PDF link.
 * This is a convenience wrapper that uploads PDF and generates QR.
 */
export async function uploadPdfAndGenerateQR(
  localUri: string,
  docType: DocumentCategory,
  docId: string,
  qrSize = 100
): Promise<{ pdfUrl: string; qrDataUrl: string }> {
  const pdfUrl = await uploadPdfGetPublicUrl(localUri, docType, docId);

  // Use external QR API for reliable QR generation
  const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(pdfUrl)}`;

  return { pdfUrl, qrDataUrl };
}

/**
 * Открыть вложения по группе (invoice/payment/proposal_pdf) в новом окне (web).
 * По умолчанию — самое свежее. opts.all === true — открыть все.
 * Теперь используем RPC list_attachments → никаких 400 от PostgREST.
 */
export async function openAttachment(
  proposalId: string | number,
  groupKey: 'invoice' | 'payment' | 'proposal_pdf' | string,
  opts?: { all?: boolean }
) {
  const pid = String(proposalId);

  // 1) RPC (предпочтительно)
  let rows: Array<{ id: number; bucket_id: string; storage_path: string; file_name: string; group_key: string; created_at: string; }> = [];
  try {
    const { data, error } = await supabase.rpc('list_attachments', {
      p_proposal_id: pid,
      p_group_key: groupKey,
    });
    if (!error && Array.isArray(data)) rows = data as any[];
  } catch { /* RPC may not exist */ }

  // 2) Fallback: из таблицы proposal_attachments
  if (!rows.length) {
    try {
      const q = await supabase
        .from('proposal_attachments')
        .select('id,bucket_id,storage_path,file_name,group_key,created_at')
        .eq('proposal_id', pid)
        .eq('group_key', groupKey)
        .order('created_at', { ascending: false })
        .limit(opts?.all ? 1000 : 50);
      if (!q.error && Array.isArray(q.data)) rows = q.data as any[];
    } catch { /* table may not exist */ }
  }

  // 3) Fallback2: из storage.objects по пути proposals/<pid>/<groupKey>/
  if (!rows.length) {
    try {
      const prefix = `proposals/${pid}/${groupKey}/`;
      const so = await supabase
        .from('storage.objects')
        .select('name, bucket_id, created_at')
        .eq('bucket_id', 'proposal_files')
        .ilike('name', `${prefix}%`)
        .order('created_at', { ascending: false })
        .limit(opts?.all ? 1000 : 50);
      if (!so.error && Array.isArray(so.data) && so.data.length) {
        rows = (so.data as any[]).map((r: any, i: number) => ({
          id: i + 1,
          bucket_id: r.bucket_id,
          storage_path: r.name,
          file_name: r.name.split('/').pop() || 'file',
          group_key: groupKey,
          created_at: r.created_at,
        }));
      }
    } catch { /* storage fallback */ }
  }

  if (!rows.length) {
    throw new Error(
      groupKey === 'invoice'
        ? 'Счёт не прикреплён'
        : groupKey === 'payment'
          ? 'Платёжные документы не найдены'
          : 'Вложения не найдены'
    );
  }

  // сортировка: свежее сверху; при равенстве — по id
  rows.sort((a, b) => {
    const atA = a?.created_at ? Date.parse(String(a.created_at)) : 0;
    const atB = b?.created_at ? Date.parse(String(b.created_at)) : 0;
    if (atA !== atB) return atB - atA;
    return (b.id ?? 0) - (a.id ?? 0);
  });

  // открыть (web) все или последний
  const openOne = async (bucket: string, path: string) => {
    const { data: s, error: se } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 5);
    if (se) throw se;
    const url = (s as any)?.signedUrl;
    if (!url) throw new Error('Не удалось получить ссылку');
    if (typeof window !== 'undefined') window.open(url, '_blank');
  };

  if (groupKey === 'invoice' || !opts?.all) {
    await openOne(rows[0].bucket_id, rows[0].storage_path);
  } else {
    for (const r of rows) await openOne(r.bucket_id, r.storage_path);
  }

  return rows;
}

/* =======================================================================================
 *                                П О С Т А В Щ И К И
 *  Bucket: supplier_files (public)
 *  Table:  supplier_files (meta)  — опционально (если есть — используем, если нет — не падаем)
 *  Экспортируемые функции:
 *   - uploadSupplierFile(supplierId, file, fileName, group)
 *   - openSupplierFile(supplierId, opts)  → открыть последний/все файлы (web)
 *   - listSupplierFilesMeta(supplierId)   → метаданные файлов из таблицы
 * ======================================================================================= */

export type SupplierFileGroup = 'price' | 'photo' | 'file';

/** Нормализуем имя файла — безопасно для путей в Storage */
function safeFileName(name: string | undefined) {
  const base = name || 'file.bin';
  return base.replace(/[^\w.\-а-яА-ЯёЁ ]+/g, '_');
}

/**
 * Загрузка файла поставщика в bucket supplier_files.
 * Пишем метаданные в таблицу public.supplier_files, если она существует.
 */
export async function uploadSupplierFile(
  supplierId: string,
  file: any,
  fileName: string,
  group: SupplierFileGroup = 'file'
): Promise<{ url: string; path: string }> {
  const id = String(supplierId).trim();
  if (!id) throw new Error('supplierId is required');

  const cleanName = safeFileName(fileName);
  const path = `${id}/${Date.now()}_${cleanName}`;
  const bucket = supabase.storage.from('supplier_files');

  // Determine content type from file name
  const ext = cleanName.split('.').pop()?.toLowerCase();
  const contentTypeMap: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', pdf: 'application/pdf',
    doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  const contentType = contentTypeMap[ext || ''] || 'application/octet-stream';

  let uploadBody: ArrayBuffer | Blob;

  if (Platform.OS === 'web') {
    // Web: file is already a Blob
    uploadBody = file;
  } else {
    // Native: file is { uri, type, name } — read as base64 and decode
    const fileUri = typeof file === 'string' ? file : file?.uri;
    if (!fileUri) throw new Error('No file URI provided');

    console.log('[uploadSupplierFile] Reading native file:', fileUri);
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'base64' as any,
    });
    uploadBody = decode(base64);
    console.log('[uploadSupplierFile] File read, size:', uploadBody.byteLength);
  }

  // upload to storage with explicit contentType
  const up = await bucket.upload(path, uploadBody, {
    upsert: false,
    cacheControl: '3600',
    contentType,
  });
  if (up.error) throw up.error;

  // public URL
  const pub = bucket.getPublicUrl(path);
  const url = pub?.data?.publicUrl || '';

  // try insert meta (soft-try: не валим поток, если таблицы нет)
  try {
    await supabase.from('supplier_files').insert({
      supplier_id: id,
      file_name: cleanName,
      file_url: url,
      group_key: group,
    });
  } catch {
    // no-op
  }

  return { url, path };
}

/**
 * Вернуть массив метаданных файлов поставщика из таблицы supplier_files.
 * Если таблицы нет — вернём пустой массив (чтобы не ронять UI).
 */
export async function listSupplierFilesMeta(
  supplierId: string,
  opts?: { group?: SupplierFileGroup; limit?: number }
): Promise<Array<{ id?: string; created_at?: string; file_name: string; file_url: string; group_key?: string }>> {
  const id = String(supplierId).trim();
  if (!id) return [];

  try {
    let q = supabase
      .from('supplier_files')
      .select('id,created_at,file_name,file_url,group_key')
      .eq('supplier_id', id)
      .order('created_at', { ascending: false });
    if (opts?.group) q = q.eq('group_key', opts.group);
    if (opts?.limit) q = q.limit(opts.limit);
    const r = await q;
    if (r.error) throw r.error;
    return (r.data as any[]) || [];
  } catch {
    return [];
  }
}

/**
 * Открыть файл(ы) поставщика (web).
 * Приоритет:
 *  1) supplier_files (meta table)
 *  2) storage.objects (папка supplier_files/<supplierId>/)
 */
export async function openSupplierFile(
  supplierId: string,
  opts?: { group?: SupplierFileGroup; all?: boolean }
) {
  const id = String(supplierId).trim();
  if (!id) throw new Error('supplierId is required');

  // 1) из таблицы метаданных
  let rows: Array<{ file_name: string; file_url: string; created_at?: string; path?: string }> = [];
  const meta = await listSupplierFilesMeta(id, { group: opts?.group, limit: opts?.all ? 1000 : 50 });
  if (meta.length) {
    rows = meta.map(m => ({ file_name: m.file_name, file_url: m.file_url, created_at: m.created_at }));
  }

  // 2) fallback: прямой просмотр storage.objects
  if (!rows.length) {
    try {
      const so = await supabase
        .from('storage.objects')
        .select('name, updated_at, created_at')
        .eq('bucket_id', 'supplier_files')
        .ilike('name', `${id}/%`)
        .order('created_at', { ascending: false })
        .limit(opts?.all ? 1000 : 50);

      if (!so.error && Array.isArray(so.data)) {
        rows = (so.data as any[]).map((r: any) => ({
          file_name: r.name.split('/').pop() || 'file',
          file_url: '', // подпишем ниже
          created_at: r.created_at,
          path: r.name,
        }));
      }
    } catch { /* storage query may fail */ }
  }

  if (!rows.length) throw new Error('Файлы поставщика не найдены');

  // sort newest first
  rows.sort((a: any, b: any) => Date.parse(String(b.created_at || 0)) - Date.parse(String(a.created_at || 0)));

  // открытие
  const openUrl = (url: string) => {
    if (typeof window !== 'undefined') window.open(url, '_blank');
  };

  const bucket = supabase.storage.from('supplier_files');

  const openOne = async (row: any) => {
    if (row.file_url) {
      openUrl(row.file_url);
      return;
    }
    const path = row.path as string;
    if (!path) return;
    const signed = await bucket.createSignedUrl(path, 60 * 5);
    if (signed.error) throw signed.error;
    const url = signed.data?.signedUrl;
    if (url) openUrl(url);
  };

  if (!opts?.all) {
    await openOne(rows[0]);
  } else {
    for (const r of rows) await openOne(r);
  }

  return rows;
}

