import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { loadMyProfile, clearProfileCache } from '../lib/rik_api';

interface Profile {
    id: string;
    user_id: string;
    full_name?: string;
    avatar_url?: string;
    role?: string;
    company_id?: string;
    company_name?: string;
    phone?: string;
    invite_code?: string;
    inn?: string;
    legal_address?: string;
    bank_name?: string;
    bank_account?: string;
    [key: string]: any;
}

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    refreshProfile: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = useCallback(async (_userId: string) => {
        try {
            console.log('[AuthContext] Fetching via unified loader...');
            const profileData = await loadMyProfile();

            if (profileData) {
                // Map to context's Profile type if necessary
                setProfile({
                    id: profileData.id,
                    user_id: profileData.userId,
                    full_name: profileData.fullName || undefined,
                    avatar_url: profileData.avatarUrl || undefined,
                    role: profileData.role || undefined,
                    company_id: profileData.companyId || undefined,
                    company_name: profileData.companyName || undefined,
                    phone: profileData.phone || undefined,
                    is_contractor: profileData.isContractor,
                });
            } else {
                // Avoid wiping an existing profile on transient timeout/fetch issues.
                // Keep current state and wait for the next successful refresh.
                console.warn('[AuthContext] Failed to resolve profile via unified loader');
            }
        } catch (err) {
            console.error('[AuthContext] Unexpected error:', err);
        }
    }, []);

    const refreshProfile = useCallback(async () => {
        if (user) {
            await fetchProfile(user.id);
        }
    }, [user, fetchProfile]);

    useEffect(() => {
        let mounted = true;

        // Safety timeout: if auth takes more than 5s, we proceed anyway
        const timer = setTimeout(() => {
            if (!mounted) return;
            setLoading((prev) => {
                if (prev) {
                    console.warn('[AuthProvider] Auth check timed out (5s) - force-proceeding');
                }
                return false;
            });
        }, 5000);

        // Check active sessions and sets the user
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (!mounted) return;
            console.log('[AuthProvider] getSession result:', !!session?.user);
            setUser(session?.user ?? null);
            if (session?.user) {
                await fetchProfile(session.user.id);
            }
            if (mounted) setLoading(false);
            clearTimeout(timer);
        }).catch(err => {
            console.error('[AuthProvider] getSession error:', err);
            if (mounted) setLoading(false);
            clearTimeout(timer);
        });

        // Listen for changes on auth state (logged in, signed out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;
            console.log('[AuthProvider] onAuthStateChange:', event, !!session?.user);

            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
                clearProfileCache();
            }
            setUser(session?.user ?? null);
            if (session?.user) {
                await fetchProfile(session.user.id);
            } else {
                setProfile(null);
            }
            if (mounted) setLoading(false);
            clearTimeout(timer);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
            clearTimeout(timer);
        };
    }, [fetchProfile]);

    const signOut = async () => {
        clearProfileCache();
        await supabase.auth.signOut();
    };

    const value = {
        user,
        profile,
        loading,
        refreshProfile,
        signOut
    };

    // ALWAYS render children so RootLayout can show its own loading/debug state
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
