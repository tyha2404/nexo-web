import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://uayleossvvnlzyewojap.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVheWxlb3NzdnZubHp5ZXdvamFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyOTU2MDYsImV4cCI6MjEwNDg3MTYwNn0.p8Ap0Ay6GQE5Brgy95Hg5J--k1iqSgspD9n1tkBELW4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
