-- Greek Morphology Table Schema for Supabase
-- Run this in Supabase SQL Editor

-- 1. Create the greek_morphology table
CREATE TABLE IF NOT EXISTS greek_morphology (
    id SERIAL PRIMARY KEY,
    location TEXT NOT NULL,  -- 6-digit code (book+chapter+verse)
    pos TEXT NOT NULL,       -- Part of speech code (N-, V-, RA, etc.)
    parsing TEXT,            -- Parsing code (----NSF-, 3AAI-S--)
    text TEXT NOT NULL,      -- Text with punctuation
    word TEXT NOT NULL,      -- Word without punctuation
    normalized TEXT,         -- Normalized form
    lemma TEXT NOT NULL,     -- Lemma (root form for dictionary lookup)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_greek_morphology_word ON greek_morphology(word);
CREATE INDEX IF NOT EXISTS idx_greek_morphology_lemma ON greek_morphology(lemma);
CREATE INDEX IF NOT EXISTS idx_greek_morphology_location ON greek_morphology(location);

-- 3. Enable RLS (public read access for Bible data)
ALTER TABLE greek_morphology ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access (Bible data is public)
CREATE POLICY "Allow public read access on greek_morphology"
    ON greek_morphology
    FOR SELECT
    TO PUBLIC
    USING (true);

-- Policy: Only authenticated users can insert/update/delete (admin only)
CREATE POLICY "Allow authenticated users to manage greek_morphology"
    ON greek_morphology
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
