import { createClient } from '@supabase/supabase-js';
import { TOKEN_STORAGE_KEY } from '../commons/constants';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://uayleossvvnlzyewojap.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVheWxlb3NzdnZubHp5ZXdvamFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyOTU2MDYsImV4cCI6MjEwNDg3MTYwNn0.p8Ap0Ay6GQE5Brgy95Hg5J--k1iqSgspD9n1tkBELW4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Supabase refreshes its access token roughly hourly; the API bearer token in
// localStorage is a copy, so keep it in step or every call 401s after an hour.
export async function syncSupabaseToken(): Promise<void> {
  if (!localStorage.getItem(TOKEN_STORAGE_KEY)) return;
  try {
    const { data } = await supabase.auth.getSession();
    const fresh = data.session?.access_token;
    if (fresh && fresh !== localStorage.getItem(TOKEN_STORAGE_KEY))
      localStorage.setItem(TOKEN_STORAGE_KEY, fresh);
  } catch {
    /* Offline refresh failures fall back to the stored token. */
  }
}

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED' && session && localStorage.getItem(TOKEN_STORAGE_KEY)) {
    localStorage.setItem(TOKEN_STORAGE_KEY, session.access_token);
  }
});
