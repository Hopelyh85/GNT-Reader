#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Parse KRV (Korean Revised Version) source files from data/krv_source/
Extracts chapter/verse/text and converts to krv_data.json format

Applies Protestant terminology standardization:
- 아우구스티누스 → 어거스틴
- 크리소스토무스 → 크리소스톰
"""

import os
import re
import json
from pathlib import Path

# KRV source directory
KRV_SOURCE_DIR = Path('./data/krv_source')

# Book mapping (folder name pattern -> SBLGNT abbrev)
# Folders 40-66 are New Testament books
BOOK_MAPPING = {
    '40마태복음': 'MAT',   # Matthew
    '41마가복음': 'MRK',   # Mark
    '42누가복음': 'LUK',   # Luke
    '43요한복음': 'JHN',   # John
    '44사도행전': 'ACT',   # Acts
    '45로마서': 'ROM',       # Romans
    '46고린도전서': '1CO', # 1 Corinthians
    '47고린도후서': '2CO', # 2 Corinthians
    '48갈라디아서': 'GAL', # Galatians
    '49에베소서': 'EPH',    # Ephesians
    '50빌립보서': 'PHP',   # Philippians
    '51골로새서': 'COL',   # Colossians
    '52데살로니가전서': '1TH', # 1 Thessalonians
    '53데살로니가후서': '2TH', # 2 Thessalonians
    '54디모데전서': '1TM', # 1 Timothy
    '55디모데후서': '2TM', # 2 Timothy
    '56디도서': 'TIT',       # Titus
    '57빌레몬서': 'PHM',   # Philemon
    '58히브리서': 'HEB',    # Hebrews
    '59야고보서': 'JAS',    # James
    '60베드로전서': '1PE', # 1 Peter
    '61베드로후서': '2PE', # 2 Peter
    '62요한1서': '1JN',     # 1 John
    '63요한2서': '2JN',     # 2 John
    '64요한3서': '3JN',     # 3 John
    '65유다서': 'JUD',       # Jude
    '66요한계시록': 'REV',  # Revelation
}

# Protestant terminology standardization
TERMINOLOGY_FIXES = {
    '아우구스티누스': '어거스틴',
    '아우구스티누스의': '어거스틴의',
    '크리소스토무스': '크리소스톰',
    '크리소스토무스의': '크리소스톰의',
    '크리소스톰스': '크리소스톰',
    '요한네스': '요한',
    '마르코스': '마가',
    '마테오': '마태',
    '루카스': '누가',
    '마태오': '마태',
}

def apply_terminology_fixes(text):
    """Apply Protestant terminology standardization"""
    for old_term, new_term in TERMINOLOGY_FIXES.items():
        text = text.replace(old_term, new_term)
    return text

def parse_md_file(filepath, book_abbrev):
    """
    Parse a single .md file and extract verses
    
    Format:
    ###### 1
    절 내용...
    
    ###### 2
    절 내용...
    """
    verses = {}
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract chapter number from filename (e.g., "마1.md" -> 1)
    filename = Path(filepath).stem
    # Remove book prefix (마, 마태, etc.) to get chapter number
    chapter_match = re.search(r'(\d+)$', filename)
    if not chapter_match:
        return verses
    
    chapter = int(chapter_match.group(1))
    
    # Parse verses using pattern: ###### verse_number\ncontent
    # Handle various header formats: ###### 1, ####### 1, etc.
    pattern = r'#{3,6}\s*(\d+)\s*\n([^#]+?)(?=#{3,6}|$)'
    matches = re.findall(pattern, content, re.DOTALL)
    
    for verse_num_str, verse_content in matches:
        verse_num = int(verse_num_str)
        # Clean up the content
        text = verse_content.strip()
        # Remove newlines within verse
        text = text.replace('\n', ' ')
        # Remove reference links like [[...]]
        text = re.sub(r'\[\[.*?\]\]', '', text)
        # Remove navigation arrows and symbols
        text = re.sub(r'[◁▷\*\|]+', '', text)
        # Clean up extra spaces
        text = re.sub(r'\s+', ' ', text).strip()
        
        if text:
            # Apply terminology fixes
            text = apply_terminology_fixes(text)
            
            key = f"{book_abbrev}_{chapter}_{verse_num}"
            verses[key] = text
    
    return verses

def parse_all_krv_files():
    """Parse all KRV source files and build verse map"""
    all_verses = {}
    stats = {}
    
    print("📖 Parsing KRV Source Files")
    print("=" * 60)
    
    for folder_name, book_abbrev in sorted(BOOK_MAPPING.items()):
        folder_path = KRV_SOURCE_DIR / folder_name
        
        if not folder_path.exists():
            print(f"⚠️  Folder not found: {folder_name}")
            continue
        
        book_verses = {}
        
        # Find all .md files in folder (excluding the main book file)
        md_files = sorted([f for f in folder_path.glob('*.md') 
                          if not re.search(r'^[가-힣]+$', f.stem)])  # Exclude files with only Korean chars
        
        for md_file in md_files:
            try:
                verses = parse_md_file(md_file, book_abbrev)
                book_verses.update(verses)
            except Exception as e:
                print(f"  ✗ Error parsing {md_file}: {e}")
        
        all_verses.update(book_verses)
        stats[book_abbrev] = len(book_verses)
        print(f"✓ {book_abbrev}: {len(book_verses)} verses")
    
    return all_verses, stats

def main():
    print("=" * 60)
    print("📚 KRV Source Parser")
    print("=" * 60)
    print(f"Source: {KRV_SOURCE_DIR}")
    print(f"Books: {len(BOOK_MAPPING)} New Testament books")
    print("=" * 60)
    
    # Parse all files
    verses, stats = parse_all_krv_files()
    
    # Summary
    total_verses = len(verses)
    print(f"\n📊 Summary:")
    print(f"   Total verses parsed: {total_verses}")
    print(f"   Expected (approx): ~7,927")
    
    # Show sample verses
    print(f"\n📝 Sample verses:")
    sample_keys = ['MAT_1_1', 'MAT_1_2', 'JHN_3_16', 'ROM_1_1']
    for key in sample_keys:
        if key in verses:
            print(f"   {key}: {verses[key][:50]}...")
    
    # Check for terminology fixes applied
    fix_count = 0
    for text in verses.values():
        for old_term in TERMINOLOGY_FIXES.keys():
            if old_term in text:
                fix_count += 1
    
    if fix_count > 0:
        print(f"\n🔧 Terminology fixes applied: {fix_count} instances")
    else:
        print(f"\n✓ No non-standard terminology found (or all already standardized)")
    
    # Save to JSON
    output_file = 'krv_data.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(verses, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 Saved: {output_file}")
    print(f"   Total verses: {total_verses}")
    print(f"\n🚀 Ready to run: python3 merge_translations.py")

if __name__ == "__main__":
    main()
