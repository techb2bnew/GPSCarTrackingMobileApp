import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase URL and ANON key from Supabase dashboard
const supabaseUrl = 'https://rgddlworlyuvvtwvsofo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnZGRsd29ybHl1dnZ0d3Zzb2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNjEzMjUsImV4cCI6MjA2ODczNzMyNX0.suljQ88eDZhvQ5lK6oTSzfxXXWvbKiQxangn9M4HsiM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
