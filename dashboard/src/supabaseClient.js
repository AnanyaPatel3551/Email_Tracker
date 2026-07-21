import { createClient } from '@supabase/supabase-js';

// Retrieve Supabase URL and anon key from Vite environment variables
const rawUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Automatically sanitize URL to ensure no trailing '/rest/v1/' or slashes interfere with Auth endpoints
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

// Initialize and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

