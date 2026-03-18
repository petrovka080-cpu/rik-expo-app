// src/lib/photo_reports_api.ts
// API для работы с фотоотчётами (изолировано по компании)

import { supabase } from './supabaseClient';

export interface PhotoReport {
    id: string;
    company_id: string;
    object_id: string | null;
    user_id: string;
    photo_url: string;
    thumbnail_url: string | null;
    title: string | null;
    description: string | null;
    latitude: number | null;
    longitude: number | null;
    address: string | null;
    category: 'progress' | 'issue' | 'completion' | 'safety';
    taken_at: string;
    created_at: string;
    // Joined fields
    object_name?: string;
    user_name?: string;
}

export interface CreatePhotoReportInput {
    photo_url: string;
    thumbnail_url?: string;
    object_id?: string;
    title?: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
    category?: 'progress' | 'issue' | 'completion' | 'safety';
}

/**
 * Get current user's company_id
 */
async function getCurrentCompanyId(): Promise<string | null> {
    if (!supabase) return null;
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('user_id', user.id)
            .maybeSingle();

        return profile?.company_id || null;
    } catch (e) {
        console.warn('[getCurrentCompanyId] error:', e);
        return null;
    }
}

/**
 * Fetch photo reports for current company with pagination
 */
export async function fetchPhotoReports(objectId?: string, limit = 20, offset = 0): Promise<PhotoReport[]> {
    if (!supabase) return [];

    try {
        // NOTE: Cannot join profiles via user_id because FK references auth.users, not profiles.
        // Fetch reports first, then batch-lookup user names separately.
        let query = supabase
            .from('photo_reports')
            .select(`
                *,
                objects:object_id (name)
            `)
            .order('taken_at', { ascending: false })
            .range(offset, offset + limit - 1);

        // Filter by object if specified
        if (objectId) {
            query = query.eq('object_id', objectId);
        }

        const { data, error } = await query;

        if (error) {
            console.warn('[fetchPhotoReports] error:', error.message);
            return [];
        }

        if (!data || data.length === 0) return [];

        // Batch-fetch user names from profiles
        const userIds = [...new Set(data.map((r: any) => r.user_id).filter(Boolean))];
        let userMap: Record<string, string> = {};
        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('user_id, full_name')
                .in('user_id', userIds);
            if (profiles) {
                for (const p of profiles) {
                    userMap[p.user_id] = p.full_name || 'Сотрудник';
                }
            }
        }

        // Map joined data
        return data.map((r: any) => ({
            ...r,
            object_name: r.objects?.name || null,
            user_name: userMap[r.user_id] || null,
        }));
    } catch (e) {
        console.warn('[fetchPhotoReports] error:', e);
        return [];
    }
}

/**
 * Get photo report by ID
 */
export async function getPhotoReportById(id: string): Promise<PhotoReport | null> {
    if (!supabase || !id) return null;

    try {
        const { data, error } = await supabase
            .from('photo_reports')
            .select(`
                *,
                objects:object_id (name)
            `)
            .eq('id', id)
            .maybeSingle();

        if (error || !data) return null;

        // Lookup user name separately (FK goes to auth.users, not profiles)
        let userName: string | null = null;
        if (data.user_id) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('user_id', data.user_id)
                .maybeSingle();
            userName = profile?.full_name || null;
        }

        return {
            ...data,
            object_name: (data as any).objects?.name || null,
            user_name: userName,
        } as PhotoReport;
    } catch {
        return null;
    }
}

/**
 * Create new photo report
 */
export async function createPhotoReport(input: CreatePhotoReportInput): Promise<{ data: PhotoReport | null; error?: string }> {
    console.log('[createPhotoReport] called with:', input);

    if (!supabase) {
        return { data: null, error: 'Supabase client not initialized' };
    }

    if (!input.photo_url) {
        return { data: null, error: 'Photo URL is required' };
    }

    try {
        // Get company_id and user_id
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { data: null, error: 'User not authenticated' };
        }

        const companyId = await getCurrentCompanyId();
        if (!companyId) {
            return { data: null, error: 'User has no company' };
        }

        const insertData = {
            company_id: companyId,
            user_id: user.id,
            photo_url: input.photo_url,
            thumbnail_url: input.thumbnail_url || null,
            object_id: input.object_id || null,
            title: input.title || null,
            description: input.description || null,
            latitude: input.latitude || null,
            longitude: input.longitude || null,
            address: input.address || null,
            category: input.category || 'progress',
            taken_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('photo_reports')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            console.error('[createPhotoReport] error:', error.message);
            return { data: null, error: error.message };
        }

        console.log('[createPhotoReport] success:', data);
        return { data: data as PhotoReport };
    } catch (e: any) {
        console.error('[createPhotoReport] exception:', e?.message || e);
        return { data: null, error: e?.message || 'Unknown error' };
    }
}

/**
 * Delete photo report
 */
export async function deletePhotoReport(id: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase || !id) {
        return { success: false, error: 'Invalid params' };
    }

    try {
        const { error } = await supabase
            .from('photo_reports')
            .delete()
            .eq('id', id);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e?.message || 'Unknown error' };
    }
}

/**
 * Upload photo to Supabase Storage and get URL
 */
export async function uploadPhoto(
    uri: string,
    fileName: string
): Promise<{ url: string | null; error?: string }> {
    if (!supabase) {
        return { url: null, error: 'Supabase not initialized' };
    }

    try {
        // Fetch the image as blob
        const response = await fetch(uri);
        const blob = await response.blob();

        // Generate unique filename
        const timestamp = Date.now();
        const uniqueName = `${timestamp}_${fileName}`;
        const path = `photo-reports/${uniqueName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
            .from('photos')
            .upload(path, blob, {
                contentType: blob.type || 'image/jpeg',
                upsert: false,
            });

        if (uploadError) {
            console.error('[uploadPhoto] upload error:', uploadError.message);
            return { url: null, error: uploadError.message };
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('photos')
            .getPublicUrl(path);

        return { url: urlData.publicUrl };
    } catch (e: any) {
        console.error('[uploadPhoto] exception:', e?.message || e);
        return { url: null, error: e?.message || 'Unknown error' };
    }
}

// Category labels for UI
export const PHOTO_CATEGORIES = [
    { value: 'progress', label: '📈 Прогресс', color: '#3b82f6' },
    { value: 'issue', label: '⚠️ Проблема', color: '#ef4444' },
    { value: 'completion', label: '✅ Завершено', color: '#10b981' },
    { value: 'safety', label: '🦺 Безопасность', color: '#f59e0b' },
];
