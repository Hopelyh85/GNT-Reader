#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Merge Bible Translations with GNT Master Data

This script expects translation data from external sources:
1. KRV (Korean Revised Version) - 개역한글
2. NET (New English Translation)

Data sources to obtain:
- Open Bible Dataset: https://github.com/scrollmapper/bible_databases
- Korean Bible: https://github.com/wlghks/openbible (KRV)
- API.Bible: https://scripture.api.bible (NET, requires API key)

Output: gnt_master_data_final.csv
"""

import csv
import json
from pathlib import Path
from collections import defaultdict

# Input/Output files
INPUT_CSV = 'gnt_master_data.csv'
OUTPUT_CSV = 'gnt_master_data_final.csv'
KRV_JSON = 'krv_data.json'  # Korean Revised Version
NET_JSON = 'net_data.json'  # NET Bible

def load_csv_data(filepath):
    """Load GNT CSV data"""
    data = []
    with open(filepath, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            data.append({
                'book': row['book'],
                'chapter': int(row['chapter']),
                'verse': int(row['verse']),
                'text': row['text'],
                'lemma': row['lemma'],
                'morph': row['morph'],
                'definition': row['definition'],
                'krv': '',
                'net': ''
            })
    return data

def load_translation_json(filepath):
    """Load translation data from JSON if exists"""
    if Path(filepath).exists():
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def build_verse_map(data):
    """Build map of verse references to translation text"""
    verse_map = {}
    for item in data:
        # item should have: book, chapter, verse, text
        key = f"{item['book']}_{item['chapter']}_{item['verse']}"
        verse_map[key] = item.get('text', '')
    return verse_map

def merge_data(gnt_data, krv_map, net_map):
    """Merge translations into GNT data"""
    merged = []
    
    for row in gnt_data:
        key = f"{row['book']}_{row['chapter']}_{row['verse']}"
        
        # For word-level data, all words in same verse get same translation
        # (This is correct - translation is verse-level, not word-level)
        krv_text = krv_map.get(key, '')
        net_text = net_map.get(key, '')
        
        merged.append({
            'book': row['book'],
            'chapter': row['chapter'],
            'verse': row['verse'],
            'text': row['text'],
            'lemma': row['lemma'],
            'morph': row['morph'],
            'definition': row['definition'],
            'krv': krv_text,
            'net': net_text
        })
    
    return merged

def save_csv(data, filepath):
    """Save merged data to CSV"""
    fieldnames = ['book', 'chapter', 'verse', 'text', 'lemma', 'morph', 'definition', 'krv', 'net']
    
    with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)

def generate_sample_data():
    """Generate sample translation data for first few verses"""
    krv_samples = {
        'MAT_1_1': '아브라함과 다윗의 자손 예수 그리스도의 족보',
        'MAT_1_2': '아브라함이 이삭을 낳고, 이삭은 야곱을 낳고, 야곱은 유다와 그의 형제들을 낳고',
        'MAT_1_3': '유다는 타마르에게서 베레스와 세라를 낳고, 베레스는 에스롬을 낳고, 에스롬은 아람을 낳고',
        'MAT_1_4': '아람은 아미나답을 낳고, 아미나답은 나손을 낳고, 나손은 살몬을 낳고',
        'MAT_1_5': '살몬은 라합에게서 보아스를 낳고, 보아스는 룻에게서 오벳을 낳고, 오벳은 예시를 낳고',
        'JHN_3_16': '하나님이 세상을 이처럼 사랑하사 독생자를 주셨으니, 누구든지 그를 믿는 자는 멸망하지 않고 영생을 얻게 하려 하심이라',
    }
    
    net_samples = {
        'MAT_1_1': 'This is the record of the genealogy of Jesus Christ, the son of David, the son of Abraham.',
        'MAT_1_2': 'Abraham was the father of Isaac, Isaac the father of Jacob, Jacob the father of Judah and his brothers,',
        'MAT_1_3': 'Judah the father of Perez and Zerah (by Tamar), Perez the father of Hezron, Hezron the father of Ram,',
        'MAT_1_4': 'Ram the father of Amminadab, Amminadab the father of Nahshon, Nahshon the father of Salmon,',
        'MAT_1_5': 'Salmon the father of Boaz (by Rahab), Boaz the father of Obed (by Ruth), Obed the father of Jesse,',
        'JHN_3_16': 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
    }
    
    # Save sample data
    with open(KRV_JSON, 'w', encoding='utf-8') as f:
        json.dump(krv_samples, f, ensure_ascii=False, indent=2)
    
    with open(NET_JSON, 'w', encoding='utf-8') as f:
        json.dump(net_samples, f, ensure_ascii=False, indent=2)
    
    print(f"   Created sample: {KRV_JSON}")
    print(f"   Created sample: {NET_JSON}")
    
    return krv_samples, net_samples

def main():
    print("📖 GNT Translation Merger")
    print("=" * 50)
    
    # Load GNT data
    print(f"📥 Loading {INPUT_CSV}...")
    gnt_data = load_csv_data(INPUT_CSV)
    print(f"   Total words: {len(gnt_data):,}")
    
    # Count unique verses
    verses = set()
    for row in gnt_data:
        verses.add((row['book'], row['chapter'], row['verse']))
    print(f"   Unique verses: {len(verses):,}")
    
    # Try to load translation data
    print(f"\n📥 Loading translation data...")
    krv_data = load_translation_json(KRV_JSON)
    net_data = load_translation_json(NET_JSON)
    
    print(f"   KRV verses loaded: {len(krv_data)}")
    print(f"   NET verses loaded: {len(net_data)}")
    
    # If no data, create samples
    if not krv_data and not net_data:
        print(f"\n⚠️  No translation data found!")
        print(f"   Creating sample data...")
        krv_data, net_data = generate_sample_data()
    
    # Build verse maps
    print(f"\n🔨 Building verse maps...")
    krv_map = krv_data  # Already in correct format
    net_map = net_data  # Already in correct format
    
    # Merge data
    print(f"\n🔗 Merging translations...")
    merged_data = merge_data(gnt_data, krv_map, net_map)
    
    # Statistics
    krv_filled = sum(1 for r in merged_data if r['krv'])
    net_filled = sum(1 for r in merged_data if r['net'])
    
    print(f"\n📊 Statistics:")
    print(f"   Total words: {len(merged_data):,}")
    print(f"   KRV filled: {krv_filled:,} ({krv_filled/len(merged_data)*100:.2f}%)")
    print(f"   NET filled: {net_filled:,} ({net_filled/len(merged_data)*100:.2f}%)")
    
    # Save
    print(f"\n💾 Saving to {OUTPUT_CSV}...")
    save_csv(merged_data, OUTPUT_CSV)
    
    print(f"\n✅ Done!")
    print(f"\n💡 To get complete translations:")
    print(f"   1. Download open Bible databases:")
    print(f"      git clone https://github.com/scrollmapper/bible_databases")
    print(f"      git clone https://github.com/wlghks/openbible  (Korean)")
    print(f"   ")
    print(f"   2. Or get API keys:")
    print(f"      - API.Bible: https://scripture.api.bible")
    print(f"      - Bible Gateway: https://www.biblegateway.com/api")
    print(f"   ")
    print(f"   3. Convert to JSON format: {KRV_JSON}, {NET_JSON}")
    print(f"      Format: {{'BOOK_chapter_verse': 'translation text', ...}}")
    print(f"   ")
    print(f"   4. Re-run this script")

if __name__ == "__main__":
    main()
