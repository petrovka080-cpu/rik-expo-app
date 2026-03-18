// src/lib/objects_api.ts
// API для работы с объектами строительства
import { supabase } from './supabaseClient';

export interface ConstructionObject {
    id: string;
    name: string;
    address: string | null;
    phone?: string | null;
    company_id: string | null;
    created_at: string;
}

import { getMyCompanyId } from './rik_api';

/**
 * Fetch construction objects with pagination
 * IMPORTANT: Guests should not see any objects - they need to select a role first
 */
export async function fetchObjects(limit = 50, offset = 0): Promise<ConstructionObject[]> {
    if (!supabase) return [];

    try {
        // Import getMyRole to check user's role
        const { getMyRole } = await import('./rik_api');
        const role = await getMyRole();

        // Guests should not see any objects - they must select a role first
        if (!role || role === 'guest') {
            console.log('[fetchObjects] Guest role detected - returning empty array');
            return [];
        }

        const companyId = await getMyCompanyId();

        // If user has no company_id, return empty (except for testing)
        if (!companyId) {
            console.warn('[fetchObjects] No companyId for role:', role, '- returning empty');
            return [];
        }

        const { data, error } = await supabase
            .from('objects')
            .select('id, name, address, phone, company_id, created_at')
            .eq('company_id', companyId)
            .order('name')
            .range(offset, offset + limit - 1);

        if (error) {
            console.warn('[fetchObjects] error:', error.message);
            return [];
        }

        console.log('[fetchObjects] Loaded', data?.length, 'objects for company:', companyId);
        return (data || []) as ConstructionObject[];
    } catch (e) {
        console.warn('[fetchObjects] error:', e);
        return [];
    }
}

/**
 * Fetch objects assigned to current user
 * IMPORTANT: Guests should not see any objects
 */
export async function fetchMyObjects(limit = 50): Promise<ConstructionObject[]> {
    if (!supabase) return [];
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        // Check role - guests should not see any objects
        const { getMyRole } = await import('./rik_api');
        const role = await getMyRole();
        if (!role || role === 'guest') {
            console.log('[fetchMyObjects] Guest role - returning empty');
            return [];
        }

        // Use object_members table (exists in DB) to get assigned objects
        const { data, error } = await supabase
            .from('object_members')
            .select(`
                object:objects(id, name, address, phone, company_id, created_at)
            `)
            .eq('user_id', user.id)
            .limit(limit);

        if (error || !data || data.length === 0) {
            // Fallback to company objects if no specific assignments
            return fetchObjects(limit);
        }

        return data.map((d: any) => d.object) as ConstructionObject[];
    } catch (e) {
        console.warn('[fetchMyObjects] error:', e);
        return [];
    }
}

/**
 * Get object by ID
 */
export async function getObjectById(id: string): Promise<ConstructionObject | null> {
    if (!supabase || !id) return null;

    try {
        const { data, error } = await supabase
            .from('objects')
            .select('id, name, address, phone, created_at')
            .eq('id', id)
            .maybeSingle();

        if (error || !data) return null;
        return data as ConstructionObject;
    } catch {
        return null;
    }
}

/**
 * Create new construction object
 */
export async function createObject(name: string, address?: string, phone?: string): Promise<{ data: ConstructionObject | null; error?: string }> {
    console.log('[createObject] called with:', { name, address, phone });

    if (!supabase) {
        console.error('[createObject] supabase client is not initialized');
        return { data: null, error: 'Supabase client not initialized' };
    }

    if (!name || !name.trim()) {
        console.error('[createObject] name is empty');
        return { data: null, error: 'Name is required' };
    }

    try {
        // Get current user's company_id
        const companyId = await getMyCompanyId();
        console.log('[createObject] company_id:', companyId);

        const insertData: { name: string; address: string | null; phone?: string | null; company_id?: string } = {
            name: name.trim(),
            address: address?.trim() || null,
        };

        if (phone !== undefined) {
            insertData.phone = phone?.trim() || null;
        }

        // Attach company_id if user has one
        if (companyId) {
            insertData.company_id = companyId;
        }

        console.log('[createObject] inserting into objects table...', insertData);
        const { data, error } = await supabase
            .from('objects')
            .insert(insertData)
            .select('id, name, address, phone, company_id, created_at')
            .single();

        if (error) {
            console.error('[createObject] Supabase error:', error.message, error.code, error.details);
            return { data: null, error: error.message };
        }

        console.log('[createObject] success:', data);
        return { data: data as ConstructionObject };
    } catch (e: any) {
        console.error('[createObject] exception:', e?.message || e);
        return { data: null, error: e?.message || 'Unknown error' };
    }
}

/**
 * Link request to object (assuming requests table has object_id column)
 */
export async function linkRequestToObject(requestId: string, objectId: string): Promise<boolean> {
    if (!supabase || !requestId || !objectId) return false;

    try {
        const { error } = await supabase
            .from('requests')
            .update({ object_id: objectId })
            .eq('id', requestId);

        if (error) {
            console.error('[linkRequestToObject] error:', error.message);
            return false;
        }

        return true;
    } catch (e) {
        console.error('[linkRequestToObject] error:', e);
        return false;
    }
}

/**
 * Update existing construction object
 */
export async function updateObject(
    id: string,
    name: string,
    address?: string,
    phone?: string
): Promise<{ data: ConstructionObject | null; error?: string }> {
    console.log('[updateObject] called with:', { id, name, address, phone });

    if (!supabase) {
        return { data: null, error: 'Supabase client not initialized' };
    }

    if (!id || !name?.trim()) {
        return { data: null, error: 'ID and Name are required' };
    }

    try {
        const updatePayload: Record<string, string | null> = {
            name: name.trim(),
            address: address?.trim() || null,
        };

        if (phone !== undefined) {
            updatePayload.phone = phone?.trim() || null;
        }

        const { data, error } = await supabase
            .from('objects')
            .update(updatePayload)
            .eq('id', id)
            .select('id, name, address, phone, company_id, created_at')
            .single();

        if (error) {
            console.error('[updateObject] error:', error.message);
            return { data: null, error: error.message };
        }

        console.log('[updateObject] success:', data);
        return { data: data as ConstructionObject };
    } catch (e: any) {
        console.error('[updateObject] exception:', e?.message || e);
        return { data: null, error: e?.message || 'Unknown error' };
    }
}

/**
 * Delete construction object with cascade cleanup
 * Uses RPC function that nullifies references in related tables first
 */
export async function deleteObject(id: string): Promise<{ success: boolean; error?: string }> {
    console.log('[deleteObject] called with:', id);

    if (!supabase) {
        return { success: false, error: 'Supabase client not initialized' };
    }

    if (!id) {
        return { success: false, error: 'ID is required' };
    }

    try {
        const { data, error } = await supabase
            .rpc('delete_object_cascade', { p_object_id: id });

        if (error) {
            console.error('[deleteObject] RPC error:', error.message, 'Code:', error.code);
            return { success: false, error: `${error.message} (Code: ${error.code})` };
        }

        const result = data as { success: boolean; error?: string; deleted_object?: string };
        if (result && result.success) {
            console.log('[deleteObject] success, deleted:', result.deleted_object);
            return { success: true };
        }

        return { success: false, error: result?.error || 'Неизвестная ошибка' };
    } catch (e: any) {
        console.error('[deleteObject] exception:', e?.message || e);
        return { success: false, error: e?.message || 'Unknown error' };
    }
}

/**
 * Get members of an object
 */
export async function getObjectMembers(objectId: string) {
    if (!supabase || !objectId) return [];
    try {
        const { data, error } = await supabase
            .from('object_members')
            .select(`
                *,
                profile:profiles!user_id(name, full_name, role)
            `)
            .eq('object_id', objectId);

        if (error) throw error;
        return data || [];
    } catch (e) {
        console.warn('[getObjectMembers] error:', e);
        return [];
    }
}

/**
 * Add a member to an object
 */
export async function addObjectMember(objectId: string, userId: string, role?: string) {
    if (!supabase || !objectId || !userId) return { error: 'Missing params' };
    try {
        const { data, error } = await supabase
            .from('object_members')
            .insert({ object_id: objectId, user_id: userId, role })
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (e: any) {
        return { data: null, error: e.message };
    }
}

/**
 * Remove a member from an object
 */
export async function removeObjectMember(objectId: string, userId: string) {
    if (!supabase || !objectId || !userId) return { error: 'Missing params' };
    try {
        const { error } = await supabase
            .from('object_members')
            .delete()
            .eq('object_id', objectId)
            .eq('user_id', userId);

        if (error) throw error;
        return { success: true, error: null };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
