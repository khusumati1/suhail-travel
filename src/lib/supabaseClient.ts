// Helper for Supabase client with auth headers
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

/**
 * Retrieve the current session (if any) and build an Authorization header.
 * Returns an empty object for anonymous users.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('Failed to get Supabase session', e);
    }
  }

  // Fallback for guest users (safe for public Edge Functions)
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (anonKey) {
    return { Authorization: `Bearer ${anonKey}` };
  }
  
  return {};
}
