// src/lib/api/profile_api.ts
// Profile and auth-related functions extracted from rik_api.ts

import { supabase } from '../supabaseClient';
import type { UserProfile } from './types';

export { UserProfile };

let cachedProfile: UserProfile | null = null;
let cachedProfileUserId: string | null = null;
let profilePromise: Promise<UserProfile | null> | null = null;
let profilePromiseUserId: string | null = null;

type TimeoutError = { error: { message: string } };

const withTimeoutNull = async <T>(
    promise: Promise<T>,
    ms: number,
    label: string
): Promise<T | null> => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => {
            console.warn(`[profile_api] ${label} TIMED OUT (${ms}ms)`);
            resolve(null);
        }, ms);
    });

    try {
        const result = await Promise.race([promise, timeoutPromise]);
        return (result ?? null) as T | null;
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
};

const withTimeoutError = async <T>(
    promise: Promise<T>,
    ms: number
): Promise<T | TimeoutError> => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<TimeoutError>((resolve) => {
        timeoutId = setTimeout(() => {
            resolve({ error: { message: `Operation timed out after ${ms}ms` } });
        }, ms);
    });

    try {
        const result = await Promise.race([promise, timeoutPromise]);
        return result as T | TimeoutError;
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
};

export const clearProfileCache = (): void => {
    cachedProfile = null;
    cachedProfileUserId = null;
    profilePromise = null;
    profilePromiseUserId = null;
};

/**
 * Robust singleton profile loader.
 * Prevents multiple concurrent calls to Supabase.
 */
export const loadMyProfile = async (): Promise<UserProfile | null> => {
    if (!supabase) {
        clearProfileCache();
        return null;
    }

    const sessionResult = await withTimeoutNull(supabase.auth.getSession(), 5000, 'auth.getSession')
        .catch((e) => {
            console.warn('[profile_api] auth.getSession failed:', e);
            return null;
        });
    const currentUserId = (sessionResult as any)?.data?.session?.user?.id ?? null;

    if (!currentUserId) {
        clearProfileCache();
        return null;
    }

    if (cachedProfile && cachedProfileUserId === currentUserId) {
        return cachedProfile;
    }
    if (cachedProfile && cachedProfileUserId !== currentUserId) {
        clearProfileCache();
    }

    if (profilePromise && profilePromiseUserId === currentUserId) {
        return profilePromise;
    }
    if (profilePromise && profilePromiseUserId !== currentUserId) {
        profilePromise = null;
        profilePromiseUserId = null;
    }

    profilePromiseUserId = currentUserId;

    profilePromise = (async () => {
        console.log('[profile_api] Start profile fetch...');

        const timeout = new Promise<null>((res) => setTimeout(() => {
            console.warn('[profile_api] loadMyProfile TIMED OUT (10s)');
            res(null);
        }, 10000));

        const fetcher = (async (): Promise<UserProfile | null> => {
            try {
                const userResult = await withTimeoutNull(supabase.auth.getUser(), 3000, 'auth.getUser');
                const user = (userResult as any)?.data?.user ?? null;
                if (!user) return null;

                const profileQuery = supabase
                    .from("profiles")
                    .select("id, user_id, role, company_id, full_name, avatar_url, phone, companies(name)")
                    .eq("user_id", user.id)
                    .maybeSingle();

                const userProfileQuery = supabase
                    .from("user_profiles")
                    .select("is_contractor")
                    .eq("user_id", user.id)
                    .maybeSingle();

                const [pRes, upRes] = await Promise.all([
                    withTimeoutError(profileQuery as any, 10000),
                    withTimeoutError(userProfileQuery as any, 10000)
                ]);

                // Type assertion for easier access
                const profileResult = pRes as any;
                const userProfileResult = upRes as any;

                // Check for errors
                if (profileResult?.error) {
                    console.warn('[profile_api] profile fetch error or timeout:', profileResult.error);
                }

                const profileRow = profileResult?.data;
                const userProfileRow = userProfileResult?.data;

                if (profileRow) {
                    const profileIsContractor =
                        typeof profileRow?.is_contractor === "boolean"
                            ? profileRow.is_contractor
                            : undefined;
                    const isContractor = profileIsContractor ?? userProfileRow?.is_contractor ?? false;
                    cachedProfile = {
                        id: profileRow.id,
                        userId: profileRow.user_id,
                        role: profileRow.role || 'guest',
                        companyId: profileRow.company_id,
                        companyName: (profileRow as any).companies?.name || null,
                        fullName: profileRow.full_name,
                        avatarUrl: profileRow.avatar_url,
                        phone: profileRow.phone,
                        isContractor: isContractor,
                    };
                    cachedProfileUserId = user.id;
                    return cachedProfile;
                }

                // Legacy Fallback
                const { data: fallback } = await supabase
                    .from('company_members')
                    .select('user_id, role, company_id')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (fallback) {
                    cachedProfile = {
                        id: user.id, // Fallback ID
                        userId: fallback.user_id,
                        role: fallback.role || 'guest',
                        companyId: fallback.company_id,
                        fullName: null,
                        avatarUrl: null,
                        phone: null,
                        isContractor: userProfileRow?.is_contractor ?? false,
                    };
                    cachedProfileUserId = user.id;
                    return cachedProfile;
                }

                return null;
            } catch (e) {
                console.error('[profile_api] fetch error:', e);
                return null;
            }
        })();

        return Promise.race([fetcher, timeout]);
    })();

    try {
        const result = await profilePromise;
        if (!result) return null; // Ensure we don't return undefined/null unexpectedly
        return result;
    } finally {
        profilePromise = null;
    }
};

/**
 * @deprecated Use loadMyProfile() instead
 */
export const ensureMyProfile = async (): Promise<boolean> => {
    const p = await loadMyProfile();
    return !!p;
};

/**
 * Get current user's role.
 */
export const getMyRole = async (): Promise<string | null> => {
    const profile = await loadMyProfile();
    return profile?.role || null;
};

/**
 * Get current user's company ID.
 */
export const getMyCompanyId = async (): Promise<string | null> => {
    const profile = await loadMyProfile();
    return profile?.companyId || null;
};
