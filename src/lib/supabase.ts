import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  language_pref: 'id' | 'en';
  subscription_tier: 'free' | 'premium';
  streak_count: number;
  longest_streak: number;
  xp_total: number;
  last_checkin_at: string | null;
};

export type Mood = 'on_fire' | 'need_chill' | 'overthinking' | 'burnout' | 'inspired';

export type QuestCategory = {
  id: string;
  slug: string;
  name_id: string;
  name_en: string;
  icon: string | null;
  sort_order: number;
};

export type Quest = {
  id: string;
  category_id: string;
  title_id: string;
  title_en: string;
  description_id: string | null;
  description_en: string | null;
  tier_required: 'free' | 'premium';
  xp_reward: number;
  sort_order: number;
};

export type QuestOption = {
  value: string;
  label_id: string;
  label_en: string;
};

export type QuestQuestion = {
  id: string;
  quest_id: string;
  question_type: 'single_choice' | 'multi_choice' | 'scale' | 'text';
  question_id: string;
  question_en: string;
  options: QuestOption[] | null;
  sort_order: number;
};

export type ChatMessage = {
  id: string;
  session_id: string;
  role: 'user' | 'tarsy';
  content: string;
  created_at: string;
};
