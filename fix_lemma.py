#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Lemma Fix Script
Re-parses MorphGNT files to extract TRUE lemma from parts[6]
and adds it to sblgnt.json as 'true_lemma' field.

MorphGNT format: BCV POS MORPH text text_normalized lemma ROOT_LEMMA
                                                        ^
                                                        parts[6] = TRUE LEMMA
"""

import json
import os

MORPH_DIR = './morphgnt'
SBLGNT_FILE = './public/data/sblgnt.json'
OUTPUT_FILE = './public/data/sblgnt_fixed.json'

# 27 books mapping (MorphGNT filename -> abbrev)
BOOKS = [
    ('61-Mt-morphgnt.txt', 'MAT'),
    ('62-Mk-morphgnt.txt', 'MRK'),
    ('63-Lk-morphgnt.txt', 'LUK'),
    ('64-Jn-morphgnt.txt', 'JHN'),
    ('65-Ac-morphgnt.txt', 'ACT'),
    ('66-Ro-morphgnt.txt', 'ROM'),
    ('67-1Co-morphgnt.txt', '1CO'),
    ('68-2Co-morphgnt.txt', '2CO'),
    ('69-Ga-morphgnt.txt', 'GAL'),
    ('70-Eph-morphgnt.txt', 'EPH'),
    ('71-Php-morphgnt.txt', 'PHP'),
    ('72-Col-morphgnt.txt', 'COL'),
    ('73-1Th-morphgnt.txt', '1TH'),
    ('74-2Th-morphgnt.txt', '2TH'),
    ('75-1Ti-morphgnt.txt', '1TM'),
    ('76-2Ti-morphgnt.txt', '2TM'),
    ('77-Tit-morphgnt.txt', 'TIT'),
    ('78-Phm-morphgnt.txt', 'PHM'),
    ('79-Heb-morphgnt.txt', 'HEB'),
    ('80-Jas-morphgnt.txt', 'JAS'),
    ('81-1Pe-morphgnt.txt', '1PE'),
    ('82-2Pe-morphgnt.txt', '2PE'),
    ('83-1Jn-morphgnt.txt', '1JN'),
    ('84-2Jn-morphgnt.txt', '2JN'),
    ('85-3Jn-morphgnt.txt', '3JN'),
    ('86-Jud-morphgnt.txt', 'JUD'),
    ('87-Re-morphgnt.txt', 'REV'),
]

def parse_morph_file(file_path):
    """
    Parse MorphGNT file and extract true lemmas from parts[6]
    
    Returns: {(chapter, verse, word_idx): true_lemma}
    """
    lemma_map = {}
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    word_idx = 0
    current_chapter = 0
    current_verse = 0
    
    for line in lines:
        parts = line.strip().split()
        if len(parts) < 7:
            continue
        
        # Parse BCV: 010101 = Book 01, Chapter 01, Verse 01
        bcv = parts[0]
        chapter = int(bcv[2:4])
        verse = int(bcv[4:6])
        
        # Reset word index when verse changes
        if chapter != current_chapter or verse != current_verse:
            word_idx = 0
            current_chapter = chapter
            current_verse = verse
        
        # TRUE LEMMA is at parts[6] (index 6)
        true_lemma = parts[6]
        
        # Store in map
        lemma_map[(chapter, verse, word_idx)] = true_lemma
        word_idx += 1
    
    return lemma_map

def fix_sblgnt_lemmas():
    """Fix lemmas in sblgnt.json using MorphGNT re-parse"""
    print("🔧 Lemma Fixer - MorphGNT 재파싱")
    print("=" * 50)
    
    # Load current sblgnt.json
    print(f"📥 Loading {SBLGNT_FILE}...")
    with open(SBLGNT_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Parse all MorphGNT files and build lemma maps
    print(f"📖 Parsing MorphGNT files from {MORPH_DIR}...")
    book_lemma_maps = {}
    
    for morph_file, abbrev in BOOKS:
        file_path = os.path.join(MORPH_DIR, morph_file)
        if os.path.exists(file_path):
            lemma_map = parse_morph_file(file_path)
            book_lemma_maps[abbrev] = lemma_map
            print(f"   ✓ {morph_file} ({abbrev}): {len(lemma_map)} words")
        else:
            print(f"   ⚠ {morph_file} not found")
    
    # Apply fixes to sblgnt data
    print(f"\n🔨 Applying lemma fixes...")
    fix_count = 0
    issue_samples = []
    
    for book in data['books']:
        abbrev = book['abbrev']
        lemma_map = book_lemma_maps.get(abbrev, {})
        
        for ch_idx, chapter_verses in enumerate(book['chapters']):
            chapter_num = ch_idx + 1
            
            for v_idx, verse_words in enumerate(chapter_verses):
                verse_num = v_idx + 1
                
                for w_idx, word in enumerate(verse_words):
                    # Get current lemma (which may be wrong)
                    current_lemma = word.get('l', '')
                    
                    # Get true lemma from MorphGNT re-parse
                    true_lemma = lemma_map.get((chapter_num, verse_num, w_idx), current_lemma)
                    
                    # Check if fix is needed
                    if current_lemma != true_lemma:
                        fix_count += 1
                        if len(issue_samples) < 10:
                            issue_samples.append({
                                'ref': f"{abbrev} {chapter_num}:{v_idx+1}",
                                'text': word.get('t', ''),
                                'old': current_lemma,
                                'new': true_lemma
                            })
                    
                    # Add true_lemma field
                    word['true_lemma'] = true_lemma
    
    # Save fixed JSON
    print(f"\n💾 Saving fixed data to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    # Report
    print(f"\n📊 Results:")
    print(f"   Total words: {sum(len(m) for m in book_lemma_maps.values())}")
    print(f"   Lemma fixes applied: {fix_count}")
    
    if issue_samples:
        print(f"\n📝 Sample fixes (showing first 10):")
        for s in issue_samples:
            print(f"      {s['ref']}: {s['text']}")
            print(f"         {s['old']} → {s['new']}")
    
    print(f"\n✅ Done! Now run: python3 generate_master_csv.py")
    print(f"   (It will automatically use 'true_lemma' field)")

if __name__ == "__main__":
    fix_sblgnt_lemmas()
