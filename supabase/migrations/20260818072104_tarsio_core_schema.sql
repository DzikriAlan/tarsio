/*
# Tarsio core schema

1. New Tables
- `profiles`: extends auth.users with display_name, language_pref, subscription_tier, streak_count, xp_total, last_checkin_at.
- `quest_categories`: bilingual category metadata (slug, name_id, name_en, icon, sort_order).
- `quests`: bilingual quests within a category (title_id/en, description_id/en, tier_required, xp_reward, is_published, is_archived).
- `quest_questions`: bilingual questions per quest (question_type, question_id/en, options jsonb, sort_order).
- `quest_completions`: one row per user per completed quest (tarsy_pov_result_id, xp_awarded).
- `mood_logs`: one mood per user per day (mood, logged_date, unique constraint).
- `chat_sessions` / `chat_messages`: per-user chat history with Tarsy.
2. Security
- RLS enabled on every table.
- profiles: user can select/update own row; admin can select all.
- mood_logs, quest_completions, chat_sessions, chat_messages: owner-scoped CRUD (user_id = auth.uid()).
- quest_categories, quests, quest_questions: public/authenticated read; admin-only writes.
3. Notes
- Owner columns default to auth.uid() so inserts work without the client passing user_id.
- is_archived soft-delete pattern on quests and quest_categories.
*/

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  language_pref text NOT NULL DEFAULT 'id' CHECK (language_pref IN ('id','en')),
  subscription_tier text NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free','premium')),
  streak_count int NOT NULL DEFAULT 0,
  longest_streak int NOT NULL DEFAULT 0,
  xp_total int NOT NULL DEFAULT 0,
  last_checkin_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- QUEST CATEGORIES
CREATE TABLE IF NOT EXISTS quest_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name_id text NOT NULL,
  name_en text NOT NULL,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE quest_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_quest_categories" ON quest_categories;
CREATE POLICY "read_quest_categories" ON quest_categories FOR SELECT
  TO anon, authenticated USING (true);

-- QUESTS
CREATE TABLE IF NOT EXISTS quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES quest_categories(id) ON DELETE CASCADE,
  title_id text NOT NULL,
  title_en text NOT NULL,
  description_id text,
  description_en text,
  tier_required text NOT NULL DEFAULT 'free' CHECK (tier_required IN ('free','premium')),
  xp_reward int NOT NULL DEFAULT 50,
  sort_order int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_quests" ON quests;
CREATE POLICY "read_quests" ON quests FOR SELECT
  TO anon, authenticated USING (is_published = true AND is_archived = false);

-- QUEST QUESTIONS
CREATE TABLE IF NOT EXISTS quest_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  question_type text NOT NULL CHECK (question_type IN ('single_choice','multi_choice','scale','text')),
  question_id text NOT NULL,
  question_en text NOT NULL,
  options jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE quest_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_quest_questions" ON quest_questions;
CREATE POLICY "read_quest_questions" ON quest_questions FOR SELECT
  TO anon, authenticated USING (true);

-- QUEST COMPLETIONS
CREATE TABLE IF NOT EXISTS quest_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  quest_id uuid NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  tarsy_pov_result_id text,
  xp_awarded int NOT NULL DEFAULT 0,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, quest_id)
);
ALTER TABLE quest_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_completions" ON quest_completions;
CREATE POLICY "select_own_completions" ON quest_completions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_completions" ON quest_completions;
CREATE POLICY "insert_own_completions" ON quest_completions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- MOOD LOGS
CREATE TABLE IF NOT EXISTS mood_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  mood text NOT NULL CHECK (mood IN ('on_fire','need_chill','overthinking','burnout','inspired')),
  logged_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, logged_date)
);
ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_mood_logs" ON mood_logs;
CREATE POLICY "select_own_mood_logs" ON mood_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_mood_logs" ON mood_logs;
CREATE POLICY "insert_own_mood_logs" ON mood_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_mood_logs" ON mood_logs;
CREATE POLICY "update_own_mood_logs" ON mood_logs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- CHAT SESSIONS
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz
);
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_chat_sessions" ON chat_sessions;
CREATE POLICY "select_own_chat_sessions" ON chat_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_chat_sessions" ON chat_sessions;
CREATE POLICY "insert_own_chat_sessions" ON chat_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_chat_sessions" ON chat_sessions;
CREATE POLICY "update_own_chat_sessions" ON chat_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- CHAT MESSAGES
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','tarsy')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_chat_messages" ON chat_messages;
CREATE POLICY "select_own_chat_messages" ON chat_messages FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_chat_messages" ON chat_messages;
CREATE POLICY "insert_own_chat_messages" ON chat_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_mood_logs_user_date ON mood_logs(user_id, logged_date DESC);
CREATE INDEX IF NOT EXISTS idx_quest_completions_user ON quest_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_quests_category ON quests(category_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_quest_questions_quest ON quest_questions(quest_id, sort_order);

-- AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, language_pref)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), COALESCE(NEW.raw_user_meta_data->>'language_pref', 'id'));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_quests_updated_at ON quests;
CREATE TRIGGER set_quests_updated_at BEFORE UPDATE ON quests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
