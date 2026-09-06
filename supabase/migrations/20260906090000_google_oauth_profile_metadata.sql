/*
# Google OAuth profile metadata

1. Changes
- `handle_new_user()`: when a user signs in with Google, Supabase stores the
  provider profile in `raw_user_meta_data` under `full_name` / `name` /
  `avatar_url` / `picture` (not `display_name`). Widen the COALESCE chain so
  the auto-created profile row picks up the Google display name and avatar
  instead of always falling back to the email local-part.
2. Notes
- Username sign-up still sends `display_name` explicitly, so that path is
  unchanged — it is simply first in the COALESCE order.
- Backfills existing profiles whose `display_name` is null/empty but whose
  auth user has a Google name, and fills a missing `avatar_url` the same way.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, language_pref)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
      NULLIF(NEW.raw_user_meta_data->>'picture', '')
    ),
    COALESCE(NEW.raw_user_meta_data->>'language_pref', 'id')
  );
  RETURN NEW;
END;
$$;

-- Backfill profiles that predate this change.
UPDATE public.profiles p
SET display_name = COALESCE(
  NULLIF(u.raw_user_meta_data->>'full_name', ''),
  NULLIF(u.raw_user_meta_data->>'name', '')
)
FROM auth.users u
WHERE u.id = p.id
  AND (p.display_name IS NULL OR p.display_name = '')
  AND COALESCE(
    NULLIF(u.raw_user_meta_data->>'full_name', ''),
    NULLIF(u.raw_user_meta_data->>'name', '')
  ) IS NOT NULL;

UPDATE public.profiles p
SET avatar_url = COALESCE(
  NULLIF(u.raw_user_meta_data->>'avatar_url', ''),
  NULLIF(u.raw_user_meta_data->>'picture', '')
)
FROM auth.users u
WHERE u.id = p.id
  AND (p.avatar_url IS NULL OR p.avatar_url = '')
  AND COALESCE(
    NULLIF(u.raw_user_meta_data->>'avatar_url', ''),
    NULLIF(u.raw_user_meta_data->>'picture', '')
  ) IS NOT NULL;
