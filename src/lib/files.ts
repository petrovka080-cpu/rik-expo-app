// src/lib/files.ts
import { Platform, Linking, Alert } from 'react-native';
import { supabase } from './supabaseClient';
import * as FileSystem from 'expo-file-system';

/** Переиспользуем аплоадер из rik_api.ts */
export { uploadProposalAttachment } from './catalog_api';

type AttRow = {
  id: number | string;
  bucket_id: string;
  storage_path: string;
  file_name: string;
  group_key: string;
  created_at: string;
};

function notFoundMsg(groupKey: string) {
  return groupKey === 'invoice'
    ? 'Счёт не прикреплён'
    : groupKey === 'payment'
    ? 'Платёжные документы не найдены'
    : 'Вложения не найдены';
}

/** Нормализуем имя файла — безопасно для путей/сохранения */
function safeFileName(name: string | undefined) {
  const base = name || 'file.bin';
  return base.replace(/[^\w.\-а-яА-ЯёЁ ]+/g, '_');
}

async function openLocalFilePreview(uri: string) {
  // iOS: Quick Look откроет file://
  if (Platform.OS === 'ios') {
    await Linking.openURL(uri);
    return;
  }

  // Android: нужно content://
  if (Platform.OS === 'android') {
    const contentUri = await FileSystem.getContentUriAsync(uri);
    await Linking.openURL(contentUri);
    return;
  }

  await Linking.openURL(uri);
}

/**
 * Открыть вложения по группе (invoice/payment/proposal_pdf) (web/native).
 * По умолчанию — самое свежее. opts.all === true — открыть все.
 *
 * ✅ ИДЕАЛЬНО: только RPC list_attachments / table proposal_attachments
 * ❌ НИКАКИХ storage.objects (в твоём проекте storage schema может отсутствовать)
 */
export async function openAttachment(
  proposalId: string | number,
  groupKey: 'invoice' | 'payment' | 'proposal_pdf' | string,
  opts?: { all?: boolean }
) {
  const pid = String(proposalId || '').trim();
  if (!pid) throw new Error('proposalId is empty');

  let rows: AttRow[] = [];

  // 1) RPC list_attachments (если есть)
  try {
    const { data, error } = await supabase.rpc(
      'list_attachments',
      {
        p_proposal_id: pid,
        p_group_key: groupKey,
      } as any
    );
    if (!error && Array.isArray(data)) rows = data as any[];
  } catch {
    // no-op
  }

  // 2) Fallback: таблица proposal_attachments
  if (!rows.length) {
    const q = await supabase
      .from('proposal_attachments')
      .select('id,bucket_id,storage_path,file_name,group_key,created_at')
      .eq('proposal_id', pid)
      .eq('group_key', groupKey)
      .order('created_at', { ascending: false })
      .limit(opts?.all ? 1000 : 50);

    if (!q.error && Array.isArray(q.data)) rows = q.data as any[];
  }

  if (!rows.length) throw new Error(notFoundMsg(String(groupKey)));

  // сортировка: свежее сверху; при равенстве — по id
  rows.sort((a, b) => {
    const atA = a?.created_at ? Date.parse(String(a.created_at)) : 0;
    const atB = b?.created_at ? Date.parse(String(b.created_at)) : 0;
    if (atA !== atB) return atB - atA;
    return Number(b.id ?? 0) - Number(a.id ?? 0);
  });

  // ✅ КЛЮЧ: НА iOS/Android открываем ЛОКАЛЬНЫЙ file:// (чтобы был предпросмотр),
  // а не Share sheet и не Safari по signedUrl
  const openSigned = async (bucket: string, path: string, fileName?: string) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 10);

    if (error) throw error;

    const url = data?.signedUrl;
    if (!url) throw new Error('Не удалось получить ссылку');

    // WEB — как было
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
      return;
    }

    // скачиваем во временный файл
    const clean = safeFileName(fileName || path.split('/').pop() || 'document.pdf');
    const target = `${FileSystem.cacheDirectory}${Date.now()}_${clean}`;
    const res = await FileSystem.downloadAsync(url, target);
    const localUri = res?.uri;

    if (!localUri) throw new Error('Не удалось сохранить файл');

    // открыть предпросмотр
    await openLocalFilePreview(localUri);
  };

  // invoice всегда 1 файл (самый свежий)
  if (groupKey === 'invoice' || !opts?.all) {
    await openSigned(rows[0].bucket_id, rows[0].storage_path, rows[0].file_name);
  } else {
    for (const r of rows) {
      await openSigned(r.bucket_id, r.storage_path, r.file_name);
    }
  }

  return rows;
}

/* =======================================================================================
 *                                П О С Т А В Щ И К И
 *  Bucket: supplier_files (public)
 *  Table:  supplier_files (meta) — опционально
 * ======================================================================================= */

export type SupplierFileGroup = 'price' | 'photo' | 'file';

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

  const up = await bucket.upload(path, file, { upsert: false, cacheControl: '3600' });
  if (up.error) throw up.error;

  const pub = bucket.getPublicUrl(path);
  const url = pub?.data?.publicUrl || '';

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
 * Вернуть метаданные файлов поставщика из таблицы supplier_files.
 * Если таблицы нет — вернём пустой массив.
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
 * Открыть файл(ы) поставщика (web/native).
 * ✅ Идеально: только meta-table supplier_files (без storage.objects)
 */
export async function openSupplierFile(
  supplierId: string,
  opts?: { group?: SupplierFileGroup; all?: boolean }
) {
  const id = String(supplierId).trim();
  if (!id) throw new Error('supplierId is required');

  const meta = await listSupplierFilesMeta(id, {
    group: opts?.group,
    limit: opts?.all ? 1000 : 50,
  });

  if (!meta.length) throw new Error('Файлы поставщика не найдены');

  // newest first
  const rows = meta
    .slice()
    .sort((a: any, b: any) => Date.parse(String(b.created_at || 0)) - Date.parse(String(a.created_at || 0)));

  const openUrl = async (url: string) => {
    const u = String(url || '').trim();
    if (!u) throw new Error('Пустая ссылка файла поставщика');

    if (Platform.OS === 'web') {
      window.open(u, '_blank');
      return;
    }

    // для supplier publicUrl обычно открывается напрямую
    try {
      await Linking.openURL(u);
    } catch (e: any) {
      Alert.alert('Не удалось открыть файл', String(e?.message ?? e));
    }
  };

  const openOne = async (row: any) => {
    await openUrl(row.file_url);
  };

  if (!opts?.all) await openOne(rows[0]);
  else for (const r of rows) await openOne(r);

  return rows;
}
