import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export function useRole() {
  const [role, setRole] = useState<'foreman' | 'director' | 'viewer' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        if (mounted) { setRole(null); setLoading(false); }
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      if (!mounted) return;
      if (error) {
        console.warn('useRole error:', error.message);
        setRole(null);
      } else {
        setRole((data?.role ?? null) as any);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  return { role, loading };
}

