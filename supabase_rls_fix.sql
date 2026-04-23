-- ============================================
-- GNT Reader - Supabase RLS Security Fix
-- CRITICAL: Apply this SQL to secure all tables
-- ============================================

-- ============================================
-- 0. Add auth_uid columns for proper RLS (if not exists)
-- ============================================
-- Study notes need owner tracking
ALTER TABLE IF EXISTS study_notes 
ADD COLUMN IF NOT EXISTS auth_uid UUID REFERENCES auth.users(id);

-- ============================================
-- 1. WORDS TABLE (Public Bible Data - Read Only)
-- ============================================

-- Enable RLS on words table
ALTER TABLE words ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read Greek words (public bible data)
CREATE POLICY IF NOT EXISTS "Allow public read access on words" 
ON words FOR SELECT 
USING (true);

-- Only admins can modify words (via service role or admin bypass)
-- No INSERT/UPDATE/DELETE policies for regular users

-- ============================================
-- 2. KRV_TRANSLATIONS TABLE (Public Bible Data - Read Only)
-- ============================================

ALTER TABLE krv_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow public read access on KRV translations" 
ON krv_translations FOR SELECT 
USING (true);

-- Only admins can modify translations

-- ============================================
-- 3. NET_TRANSLATIONS TABLE (Public Bible Data - Read Only)
-- ============================================

ALTER TABLE net_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow public read access on NET translations" 
ON net_translations FOR SELECT 
USING (true);

-- Only admins can modify translations

-- ============================================
-- 4. STUDY_NOTES TABLE (User-Generated Content - Owner Only)
-- ============================================

-- First ensure RLS is enabled
ALTER TABLE study_notes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own notes
CREATE POLICY IF NOT EXISTS "Users can read own study notes" 
ON study_notes FOR SELECT 
TO authenticated 
USING (auth_uid = auth.uid());

-- Allow authenticated users to insert their own notes
CREATE POLICY IF NOT EXISTS "Users can insert own study notes" 
ON study_notes FOR INSERT 
TO authenticated 
WITH CHECK (auth_uid = auth.uid());

-- Allow authenticated users to update their own notes
CREATE POLICY IF NOT EXISTS "Users can update own study notes" 
ON study_notes FOR UPDATE 
TO authenticated 
USING (auth_uid = auth.uid())
WITH CHECK (auth_uid = auth.uid());

-- Allow authenticated users to delete their own notes
CREATE POLICY IF NOT EXISTS "Users can delete own study notes" 
ON study_notes FOR DELETE 
TO authenticated 
USING (auth_uid = auth.uid());

-- ============================================
-- 5. REFLECTIONS TABLE (User-Generated Content - Owner Only)
-- ============================================

-- Add auth_uid if table exists and column missing
ALTER TABLE IF EXISTS reflections 
ADD COLUMN IF NOT EXISTS auth_uid UUID REFERENCES auth.users(id);

ALTER TABLE IF EXISTS reflections ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own reflections
CREATE POLICY IF NOT EXISTS "Users can read own reflections" 
ON reflections FOR SELECT 
TO authenticated 
USING (auth_uid = auth.uid());

-- Allow authenticated users to insert their own reflections
CREATE POLICY IF NOT EXISTS "Users can insert own reflections" 
ON reflections FOR INSERT 
TO authenticated 
WITH CHECK (auth_uid = auth.uid());

-- Allow authenticated users to update their own reflections
CREATE POLICY IF NOT EXISTS "Users can update own reflections" 
ON reflections FOR UPDATE 
TO authenticated 
USING (auth_uid = auth.uid())
WITH CHECK (auth_uid = auth.uid());

-- Allow authenticated users to delete their own reflections
CREATE POLICY IF NOT EXISTS "Users can delete own reflections" 
ON reflections FOR DELETE 
TO authenticated 
USING (auth_uid = auth.uid());

-- ============================================
-- 6. MIGRATION: Update existing rows to set auth_uid from user_nickname
-- (Run this after implementing auth in the app)
-- ============================================
/*
-- This matches user_nickname with auth.users email/metadata
UPDATE study_notes sn
SET auth_uid = au.id
FROM auth.users au
WHERE sn.user_nickname = au.raw_user_meta_data->>'nickname'
  OR sn.user_nickname = au.email;

UPDATE reflections r
SET auth_uid = au.id
FROM auth.users au
WHERE r.user_nickname = au.raw_user_meta_data->>'nickname'
  OR r.user_nickname = au.email;
*/

-- ============================================
-- 7. FORCE RLS FOR TABLE OWNERS (Critical: even table owners follow RLS)
-- ============================================

ALTER TABLE words FORCE ROW LEVEL SECURITY;
ALTER TABLE krv_translations FORCE ROW LEVEL SECURITY;
ALTER TABLE net_translations FORCE ROW LEVEL SECURITY;
ALTER TABLE study_notes FORCE ROW LEVEL SECURITY;
ALTER TABLE reflections FORCE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION QUERIES (Run after applying)
-- ============================================
/*
-- Check RLS is enabled:
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename IN ('words', 'krv_translations', 'net_translations', 'study_notes', 'reflections');

-- Check policies exist:
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('words', 'krv_translations', 'net_translations', 'study_notes', 'reflections');
*/
