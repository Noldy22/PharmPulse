import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve stored Supabase credentials or use env vars
export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const storedUrl = localStorage.getItem('pharmpulse_supabase_url');
  const storedKey = localStorage.getItem('pharmpulse_supabase_key');

  const envUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_ANON_KEY || '';

  return {
    url: storedUrl || envUrl || 'https://mock-supabase.pharmpulse.internal',
    anonKey: storedKey || envKey || 'mock-anon-key-offline',
  };
}

export function saveSupabaseCredentials(url: string, anonKey: string) {
  if (url) localStorage.setItem('pharmpulse_supabase_url', url.trim());
  if (anonKey) localStorage.setItem('pharmpulse_supabase_key', anonKey.trim());
  cachedClient = null; // Reset client
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();

  // If mock credentials or empty, we return null to run local simulation mode
  if (!url || url.includes('mock-supabase') || !anonKey || anonKey.includes('mock-anon-key')) {
    return null;
  }

  if (!cachedClient) {
    try {
      cachedClient = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return cachedClient;
}

// Test connectivity to Supabase
export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const testClient = createClient(url, anonKey);
    // Simple light query to check connection
    const { error } = await testClient.from('products').select('count', { count: 'exact', head: true });
    
    if (error && error.code !== 'PGRST116') {
      // If error is about missing table or unauthorized, connection reached server
      if (error.message.includes('relation "public.products" does not exist')) {
        return { 
          success: true, 
          message: 'Connected to Supabase! (Database tables need schema migration - see supabase/schema.sql)' 
        };
      }
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Successfully connected to remote Supabase database!' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Connection failed: ${errorMsg}` };
  }
}
