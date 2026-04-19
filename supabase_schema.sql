-- GNT Reader - Supabase Database Schema
-- For Korean Revised Version (KRV) and NET English translations
-- Designed to receive unified CSV data from Director Ji-hye

-- ============================================
-- 1. KRV (개역한글) Translations Table
-- ============================================
CREATE TABLE IF NOT EXISTS krv_translations (
    id SERIAL PRIMARY KEY,
    book VARCHAR(10) NOT NULL,           -- Book abbreviation (MAT, MRK, LUK, etc.)
    chapter INTEGER NOT NULL,            -- Chapter number
    verse INTEGER NOT NULL,              -- Verse number
    verse_ref VARCHAR(20) NOT NULL,      -- Combined reference (e.g., "MAT 1:1")
    text TEXT NOT NULL,                  -- Korean translation text
    
    -- Extended fields for theological terminology (ready for CSV import)
    theological_term_1 VARCHAR(255),     -- Reserved: 주요 신학 용어 1
    theological_term_2 VARCHAR(255),     -- Reserved: 주요 신학 용어 2
    theological_term_3 VARCHAR(255),     -- Reserved: 주요 신학 용어 3
    protestant_term VARCHAR(255),        -- Reserved: 개신교 특화 용어 (e.g., 어거스틴)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(book, chapter, verse)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_krv_book_chapter ON krv_translations(book, chapter);
CREATE INDEX IF NOT EXISTS idx_krv_verse_ref ON krv_translations(verse_ref);

-- ============================================
-- 2. NET (New English Translation) Table
-- ============================================
CREATE TABLE IF NOT EXISTS net_translations (
    id SERIAL PRIMARY KEY,
    book VARCHAR(10) NOT NULL,           -- Book abbreviation
    chapter INTEGER NOT NULL,            -- Chapter number
    verse INTEGER NOT NULL,              -- Verse number
    verse_ref VARCHAR(20) NOT NULL,      -- Combined reference
    text TEXT NOT NULL,                  -- English translation text
    
    -- Extended fields for theological terminology
    theological_term_1 VARCHAR(255),     -- Reserved: Key theological term 1
    theological_term_2 VARCHAR(255),     -- Reserved: Key theological term 2
    theological_term_3 VARCHAR(255),     -- Reserved: Key theological term 3
    historical_term VARCHAR(255),        -- Reserved: Historical/protestant terminology
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(book, chapter, verse)
);

CREATE INDEX IF NOT EXISTS idx_net_book_chapter ON net_translations(book, chapter);
CREATE INDEX IF NOT EXISTS idx_net_verse_ref ON net_translations(verse_ref);

-- ============================================
-- 3. Words Table (GNT Greek Words with Lemmas)
-- ============================================
-- Current issue: l (lemma) field contains surface forms instead of true lemmas
-- Solution: Re-import with correct lemma parsing from MorphGNT

CREATE TABLE IF NOT EXISTS words (
    id SERIAL PRIMARY KEY,
    book VARCHAR(10) NOT NULL,           -- Book abbreviation
    chapter INTEGER NOT NULL,            -- Chapter number
    verse INTEGER NOT NULL,              -- Verse number
    word_position INTEGER NOT NULL,      -- Position in verse (0-indexed)
    
    -- Core fields
    t TEXT NOT NULL,                     -- Text (surface form, e.g., Χριστοῦ)
    l TEXT NOT NULL,                     -- Lemma (lexical form, e.g., Χριστός) ← CRITICAL
    m TEXT,                              -- Morphology code
    
    -- Strong's number for lexicon lookup
    strongs VARCHAR(10),
    
    -- Extended fields for CSV import flexibility
    lemma_transliteration VARCHAR(100), -- Transliteration of lemma
    parsing_notes TEXT,                   -- Morphology parsing notes
    
    verse_ref VARCHAR(20) NOT NULL,      -- Combined reference for joins
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(book, chapter, verse, word_position)
);

CREATE INDEX IF NOT EXISTS idx_words_book_chapter ON words(book, chapter);
CREATE INDEX IF NOT EXISTS idx_words_verse_ref ON words(verse_ref);
CREATE INDEX IF NOT EXISTS idx_words_lemma ON words(l);  -- For lexicon lookups

-- ============================================
-- 4. CSV Import Function (for Director Ji-hye's data)
-- ============================================
-- Example CSV format expected:
-- book,chapter,verse,verse_ref,krv_text,net_text,theological_term_1,protestant_term

-- Function to upsert translation data from CSV
CREATE OR REPLACE FUNCTION upsert_translations_from_csv()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-update verse_ref
    NEW.verse_ref := NEW.book || ' ' || NEW.chapter || ':' || NEW.verse;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for KRV
DROP TRIGGER IF EXISTS trigger_krv_upsert ON krv_translations;
CREATE TRIGGER trigger_krv_upsert
    BEFORE INSERT OR UPDATE ON krv_translations
    FOR EACH ROW
    EXECUTE FUNCTION upsert_translations_from_csv();

-- Trigger for NET
DROP TRIGGER IF EXISTS trigger_net_upsert ON net_translations;
CREATE TRIGGER trigger_net_upsert
    BEFORE INSERT OR UPDATE ON net_translations
    FOR EACH ROW
    EXECUTE FUNCTION upsert_translations_from_csv();

-- Trigger for Words
DROP TRIGGER IF EXISTS trigger_words_upsert ON words;
CREATE TRIGGER trigger_words_upsert
    BEFORE INSERT OR UPDATE ON words
    FOR EACH ROW
    EXECUTE FUNCTION upsert_translations_from_csv();

-- ============================================
-- 5. Sample Data Insert (for testing)
-- ============================================

-- Insert sample KRV data (Matthew 1:1)
INSERT INTO krv_translations (book, chapter, verse, text, protestant_term)
VALUES 
    ('MAT', 1, 1, '아브라함과 다윗의 자손 예수 그리스도의 족보', '개신교 족보 개념'),
    ('MAT', 1, 2, '아브라함이 이삭을 낳고, 이삭은 야곱을 낳고, 야곱은 유다와 그의 형제들을 낳고', NULL)
ON CONFLICT (book, chapter, verse) DO UPDATE SET
    text = EXCLUDED.text,
    protestant_term = EXCLUDED.protestant_term,
    updated_at = NOW();

-- Insert sample NET data (Matthew 1:1)
INSERT INTO net_translations (book, chapter, verse, text, historical_term)
VALUES 
    ('MAT', 1, 1, 'This is the record of the genealogy of Jesus Christ, the son of David, the son of Abraham.', 'Protestant genealogy'),
    ('MAT', 1, 2, 'Abraham was the father of Isaac, Isaac the father of Jacob, Jacob the father of Judah and his brothers.', NULL)
ON CONFLICT (book, chapter, verse) DO UPDATE SET
    text = EXCLUDED.text,
    historical_term = EXCLUDED.historical_term,
    updated_at = NOW();

-- ============================================
-- 6. Lemma Fix Instructions
-- ============================================
-- Current words table has l field = surface form (WRONG)
-- Need to re-import with correct lemma from MorphGNT

-- Check current state:
-- SELECT t, l, m FROM words WHERE book = 'MAT' AND chapter = 1 AND verse = 1 LIMIT 5;

-- If l = t (lemma equals text), data is corrupted
-- Fix with: UPDATE words SET l = correct_lemma_from_morphgnt WHERE condition;

-- ============================================
-- CSV Import Instructions for Director Ji-hye
-- ============================================
/*
CSV Format for Supabase Import:

1. krv_translations.csv:
book,chapter,verse,text,theological_term_1,protestant_term
MAT,1,1,"아브라함과...",,
MAT,1,2,"아브라함이...",,

2. net_translations.csv:
book,chapter,verse,text,theological_term_1,historical_term
MAT,1,1,"This is the record...",,
MAT,1,2,"Abraham was...",,

3. words.csv (with CORRECT lemmas):
book,chapter,verse,word_position,t,l,m,strongs
MAT,1,1,0,"Βίβλος","Βίβλος","N----NSF-","G0976"
MAT,1,1,1,"γενέσεως","γένεσις","N----GSF-","G1078"

Import via: Supabase Dashboard → Table Editor → Import Data
*/
