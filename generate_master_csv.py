#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GNT Master Data CSV Generator
Reads public/data/sblgnt.json and generates gnt_master_data.csv
for all 27 New Testament books.

CSV Fields: book, chapter, verse, text, lemma, morph, definition, krv, net
"""

import json
import csv
import os

# Load SBLGNT data from JSON
SBLGNT_FILE = './public/data/sblgnt.json'
OUTPUT_FILE = 'gnt_master_data.csv'

def load_sblgnt_data():
    """Load SBLGNT JSON data"""
    with open(SBLGNT_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def flatten_gnt_data(data):
    """
    Flatten the nested SBLGNT structure into a list of word records.
    
    Structure: {books: [{abbrev, book, korean_name, chapters: [[[word]]]}]}
    Where word = {t: text, l: lemma, m: morph}
    """
    records = []
    
    for book in data['books']:
        book_abbrev = book['abbrev']
        
        # Iterate through chapters (index 0 = chapter 1)
        for chapter_idx, chapter_verses in enumerate(book['chapters'], start=1):
            # Iterate through verses (index 0 = verse 1)
            for verse_idx, verse_words in enumerate(chapter_verses, start=1):
                # Iterate through words in verse
                for word in verse_words:
                    record = {
                        'book': book_abbrev,
                        'chapter': chapter_idx,
                        'verse': verse_idx,
                        'text': word['t'],      # Surface form (e.g., Χριστοῦ)
                        'lemma': word['l'],     # Lemma (e.g., Χριστός) ← May need correction
                        'morph': word['m'],     # Morphology code
                        'definition': '',       # Empty - to be filled later
                        'krv': '',              # Empty - Korean translation to be added
                        'net': ''               # Empty - NET translation to be added
                    }
                    records.append(record)
    
    return records

def generate_csv():
    """Generate the master CSV file"""
    print("📖 GNT Master Data CSV Generator")
    print("=" * 50)
    
    # Check if source file exists
    if not os.path.exists(SBLGNT_FILE):
        print(f"❌ Error: {SBLGNT_FILE} not found!")
        print("   Run: node convert-morph.js first")
        return
    
    # Load data
    print(f"📥 Loading {SBLGNT_FILE}...")
    data = load_sblgnt_data()
    
    # Flatten data
    print("🔨 Flattening nested structure...")
    records = flatten_gnt_data(data)
    
    # Count statistics
    total_books = len(data['books'])
    total_words = len(records)
    
    # Count by book
    book_counts = {}
    for r in records:
        book_counts[r['book']] = book_counts.get(r['book'], 0) + 1
    
    print(f"\n📊 Statistics:")
    print(f"   Books: {total_books}")
    print(f"   Total words: {total_words:,}")
    print(f"\n   Words per book:")
    for book, count in sorted(book_counts.items()):
        print(f"      {book}: {count:,} words")
    
    # Check for lemma issues (where text == lemma might indicate a problem)
    potential_issues = [r for r in records if r['text'] == r['lemma']]
    print(f"\n⚠️  Potential lemma issues (text == lemma): {len(potential_issues)}")
    if potential_issues[:5]:
        print("   Sample issues:")
        for r in potential_issues[:5]:
            print(f"      {r['book']} {r['chapter']}:{r['verse']} - text: {r['text']}, lemma: {r['lemma']}")
    
    # Generate CSV
    print(f"\n💾 Generating {OUTPUT_FILE}...")
    fields = ["book", "chapter", "verse", "text", "lemma", "morph", "definition", "krv", "net"]
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(records)
    
    print(f"\n✅ {OUTPUT_FILE} 생성 완료!")
    print(f"   Location: {os.path.abspath(OUTPUT_FILE)}")
    print(f"   Total records: {total_words:,}")
    print(f"\n💡 다음 단계:")
    print(f"   1. CSV 파일을 엑셀이나 LibreOffice로 열어 확인")
    print(f"   2. definition, krv, net 컬럼에 데이터 채우기")
    print(f"   3. Supabase에 업로드")

if __name__ == "__main__":
    generate_csv()
