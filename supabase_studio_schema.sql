-- K-GNT 위키 스튜디오 - Phase 1: Authentication & Database Schema
-- Authentication: Google OAuth only (Email magic link removed per requirements)
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. PROFILES TABLE (User Tiers & Metadata)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    nickname TEXT,
    tier TEXT NOT NULL DEFAULT 'General' CHECK (tier IN ('Admin', 'Hardworking', 'Regular', 'General')),
    avatar_url TEXT,
    bio TEXT,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all profiles (needed for seeing authors)
CREATE POLICY "Allow public read access on profiles"
    ON profiles
    FOR SELECT
    TO PUBLIC
    USING (true);

-- Policy: Users can only update their own profile
CREATE POLICY "Allow users to update own profile"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy: Only admins can update tier and approval status
CREATE POLICY "Allow admin to manage all profiles"
    ON profiles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.tier = 'Admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.tier = 'Admin'
        )
    );

-- Trigger: Create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, tier, is_approved)
    VALUES (
        NEW.id, 
        NEW.email, 
        'General',  -- Default tier
        false       -- Needs admin approval
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. STUDY_NOTES TABLE (Private Ministry Notes)
-- ============================================
CREATE TABLE IF NOT EXISTS study_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    verse_ref TEXT NOT NULL,  -- Format: "Matthew 1:1"
    book TEXT NOT NULL,
    chapter INTEGER NOT NULL,
    verse INTEGER NOT NULL,
    content TEXT NOT NULL,
    is_private BOOLEAN DEFAULT true,  -- Ministry notes are private by default
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on study_notes
ALTER TABLE study_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own study notes
CREATE POLICY "Allow users to view own study_notes"
    ON study_notes
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Policy: Only Admin and Hardworking can create study_notes
CREATE POLICY "Allow Admin/Hardworking to create study_notes"
    ON study_notes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.tier IN ('Admin', 'Hardworking')
        )
    );

-- Policy: Users can only update/delete their own study_notes
CREATE POLICY "Allow users to update own study_notes"
    ON study_notes
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to delete own study_notes"
    ON study_notes
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================
-- 3. REFLECTIONS TABLE (Public Feed)
-- ============================================
CREATE TABLE IF NOT EXISTS reflections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    verse_ref TEXT NOT NULL,
    book TEXT NOT NULL,
    chapter INTEGER NOT NULL,
    verse INTEGER NOT NULL,
    content TEXT NOT NULL,
    is_public BOOLEAN DEFAULT true,
    is_best BOOLEAN DEFAULT false,  -- Admin can mark as best
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on reflections
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;

-- Policy: Public can view public reflections
CREATE POLICY "Allow public to view public reflections"
    ON reflections
    FOR SELECT
    TO PUBLIC
    USING (is_public = true);

-- Policy: Users can view their own reflections (even if private)
CREATE POLICY "Allow users to view own reflections"
    ON reflections
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Policy: Authenticated users can create reflections
CREATE POLICY "Allow authenticated to create reflections"
    ON reflections
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Policy: Users can update/delete their own reflections
CREATE POLICY "Allow users to update own reflections"
    ON reflections
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to delete own reflections"
    ON reflections
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Policy: Admin can update is_best flag on any reflection
CREATE POLICY "Allow admin to update is_best on any reflection"
    ON reflections
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.tier = 'Admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.tier = 'Admin'
        )
    );

-- ============================================
-- 4. LIKES TABLE (Reflection Likes)
-- ============================================
CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reflection_id UUID NOT NULL REFERENCES reflections(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, reflection_id)  -- One like per user per reflection
);

-- Enable RLS on likes
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Policy: Public can view likes count
CREATE POLICY "Allow public to view likes"
    ON likes
    FOR SELECT
    TO PUBLIC
    USING (true);

-- Policy: Authenticated users can create likes
CREATE POLICY "Allow authenticated to create likes"
    ON likes
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Policy: Users can only delete their own likes
CREATE POLICY "Allow users to delete own likes"
    ON likes
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Trigger: Update likes_count on reflections when like is added/removed
CREATE OR REPLACE FUNCTION update_reflection_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE reflections SET likes_count = likes_count + 1 WHERE id = NEW.reflection_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE reflections SET likes_count = likes_count - 1 WHERE id = OLD.reflection_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_like_changed ON likes;
CREATE TRIGGER on_like_changed
    AFTER INSERT OR DELETE ON likes
    FOR EACH ROW
    EXECUTE FUNCTION update_reflection_likes_count();

-- ============================================
-- 5. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON profiles(tier);
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON profiles(is_approved);
CREATE INDEX IF NOT EXISTS idx_study_notes_user_id ON study_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_study_notes_verse_ref ON study_notes(verse_ref);
CREATE INDEX IF NOT EXISTS idx_reflections_user_id ON reflections(user_id);
CREATE INDEX IF NOT EXISTS idx_reflections_verse_ref ON reflections(verse_ref);
CREATE INDEX IF NOT EXISTS idx_reflections_is_public ON reflections(is_public);
CREATE INDEX IF NOT EXISTS idx_reflections_is_best ON reflections(is_best);
CREATE INDEX IF NOT EXISTS idx_reflections_created_at ON reflections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_reflection_id ON likes(reflection_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

-- ============================================
-- 6. INITIAL ADMIN SETUP (Manual step required)
-- ============================================
-- After creating your first user, run this to make them admin:
-- UPDATE profiles SET tier = 'Admin', is_approved = true WHERE email = 'your-email@example.com';
