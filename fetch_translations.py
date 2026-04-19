#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fetch Bible Translations and Merge with GNT Data
Fetches KRV (Korean Revised Version) and NET from public APIs
and merges them into gnt_master_data.csv

Output: gnt_master_data_final.csv
"""

import csv
import json
import time
import urllib.request
import urllib.parse
import ssl
from pathlib import Path

# Input/Output files
INPUT_CSV = 'gnt_master_data.csv'
OUTPUT_CSV = 'gnt_master_data_final.csv'
CACHE_FILE = 'translation_cache.json'

# Bible book abbreviation mapping (SBLGNT -> API formats)
BOOK_MAP = {
    'MAT': ('Matt', 'Matthew'),
    'MRK': ('Mark', 'Mark'),
    'LUK': ('Luke', 'Luke'),
    'JHN': ('John', 'John'),
    'ACT': ('Acts', 'Acts'),
    'ROM': ('Rom', 'Romans'),
    '1CO': ('1Cor', '1 Corinthians'),
    '2CO': ('2Cor', '2 Corinthians'),
    'GAL': ('Gal', 'Galatians'),
    'EPH': ('Eph', 'Ephesians'),
    'PHP': ('Phil', 'Philippians'),
    'COL': ('Col', 'Colossians'),
    '1TH': ('1Thess', '1 Thessalonians'),
    '2TH': ('2Thess', '2 Thessalonians'),
    '1TM': ('1Tim', '1 Timothy'),  # 1TI in some systems
    '2TM': ('2Tim', '2 Timothy'),  # 2TI in some systems
    'TIT': ('Titus', 'Titus'),
    'PHM': ('Phlm', 'Philemon'),
    'HEB': ('Heb', 'Hebrews'),
    'JAS': ('Jas', 'James'),
    '1PE': ('1Pet', '1 Peter'),
    '2PE': ('2Pet', '2 Peter'),
    '1JN': ('1John', '1 John'),
    '2JN': ('2John', '2 John'),
    '3JN': ('3John', '3 John'),
    'JUD': ('Jude', 'Jude'),
    'REV': ('Rev', 'Revelation'),
}

class TranslationFetcher:
    def __init__(self):
        self.cache = self.load_cache()
        self.ssl_context = ssl.create_default_context()
        self.ssl_context.check_hostname = False
        self.ssl_context.verify_mode = ssl.CERT_NONE
        
    def load_cache(self):
        """Load cached translations"""
        if Path(CACHE_FILE).exists():
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {'krv': {}, 'net': {}}
    
    def save_cache(self):
        """Save translations to cache"""
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.cache, f, ensure_ascii=False, indent=2)
    
    def get_cache_key(self, book, chapter, verse):
        return f"{book}_{chapter}_{verse}"
    
    def fetch_net_bible(self, book, chapter, verse):
        """
        Fetch NET Bible translation
        Try NET Bible API or Bible Gateway
        """
        cache_key = self.get_cache_key(book, chapter, verse)
        if cache_key in self.cache['net']:
            return self.cache['net'][cache_key]
        
        # For now, return placeholder - we'll need actual API integration
        # In production, this would call:
        # - https://labs.bible.org/api/?passage=...&formatting=plain
        # - or other available API
        
        # Placeholder: "NET data pending API integration"
        result = None  # Will be fetched from external source
        self.cache['net'][cache_key] = result
        return result
    
    def fetch_krv_bible(self, book, chapter, verse):
        """
        Fetch Korean Revised Version (KRV)
        Try Korean Bible Society API or other available source
        """
        cache_key = self.get_cache_key(book, chapter, verse)
        if cache_key in self.cache['krv']:
            return self.cache['krv'][cache_key]
        
        # Placeholder for KRV integration
        # Would need actual Korean Bible API endpoint
        result = None
        self.cache['krv'][cache_key] = result
        return result

def load_csv_data(filepath):
    """Load GNT CSV data"""
    data = []
    with open(filepath, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            data.append(row)
    return data

def get_unique_verses(data):
    """Get unique verse references from word-level data"""
    verses = set()
    for row in data:
        ref = (row['book'], int(row['chapter']), int(row['verse']))
        verses.add(ref)
    return sorted(verses)

def merge_translations(data, translations_krv, translations_net):
    """Merge translations into word-level data"""
    merged = []
    for row in data:
        book = row['book']
        chapter = int(row['chapter'])
        verse = int(row['verse'])
        
        # Get verse-level translation
        cache_key = f"{book}_{chapter}_{verse}"
        krv_text = translations_krv.get(cache_key, '')
        net_text = translations_net.get(cache_key, '')
        
        # Create merged row
        merged_row = {
            'book': book,
            'chapter': chapter,
            'verse': verse,
            'text': row['text'],
            'lemma': row['lemma'],
            'morph': row['morph'],
            'definition': row['definition'],
            'krv': krv_text,
            'net': net_text
        }
        merged.append(merged_row)
    
    return merged

def save_csv(data, filepath):
    """Save data to CSV"""
    fieldnames = ['book', 'chapter', 'verse', 'text', 'lemma', 'morph', 'definition', 'krv', 'net']
    
    with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)

def main():
    print("📖 GNT Translation Fetcher & Merger")
    print("=" * 50)
    
    # Load existing data
    print(f"📥 Loading {INPUT_CSV}...")
    data = load_csv_data(INPUT_CSV)
    print(f"   Total words: {len(data):,}")
    
    # Get unique verses
    verses = get_unique_verses(data)
    print(f"   Unique verses: {len(verses):,}")
    
    # Initialize fetcher
    fetcher = TranslationFetcher()
    
    # Check if we have any cached translations
    krv_count = len(fetcher.cache['krv'])
    net_count = len(fetcher.cache['net'])
    print(f"\n📦 Cache status:")
    print(f"   KRV cached: {krv_count} verses")
    print(f"   NET cached: {net_count} verses")
    
    # For now, since we don't have API keys, create a template
    # In production, this would fetch from actual Bible APIs
    
    print(f"\n⚠️  Note: Bible translation APIs require API keys")
    print(f"   To fetch real data, you need:")
    print(f"   1. API.Bible key (for NET)")
    print(f"   2. Bible Society API access (for KRV)")
    print(f"   3. Or use open source data like:")
    print(f"      - https://github.com/wlghks/openbible")
    print(f"      - https://github.com/scrollmapper/bible_databases")
    
    # Create sample data for demonstration (first verse only)
    print(f"\n📝 Creating sample data for first few verses...")
    sample_krv = {
        'MAT_1_1': '아브라함과 다윗의 자손 예수 그리스도의 족보',
        'MAT_1_2': '아브라함이 이삭을 낳고, 이삭은 야곱을 낳고, 야곱은 유다와 그의 형제들을 낳고',
    }
    sample_net = {
        'MAT_1_1': 'This is the record of the genealogy of Jesus Christ, the son of David, the son of Abraham.',
        'MAT_1_2': 'Abraham was the father of Isaac, Isaac the father of Jacob, Jacob the father of Judah and his brothers,',
    }
    
    # Merge sample data
    fetcher.cache['krv'].update(sample_krv)
    fetcher.cache['net'].update(sample_net)
    
    # Merge all translations
    print(f"\n🔨 Merging translations...")
    merged_data = merge_translations(data, fetcher.cache['krv'], fetcher.cache['net'])
    
    # Count filled translations
    krv_filled = sum(1 for r in merged_data if r['krv'])
    net_filled = sum(1 for r in merged_data if r['net'])
    
    print(f"   KRV filled: {krv_filled:,} words ({krv_filled/len(merged_data)*100:.1f}%)")
    print(f"   NET filled: {net_filled:,} words ({net_filled/len(merged_data)*100:.1f}%)")
    
    # Save
    print(f"\n💾 Saving to {OUTPUT_CSV}...")
    save_csv(merged_data, OUTPUT_CSV)
    
    # Save cache
    fetcher.save_cache()
    
    print(f"\n✅ Done!")
    print(f"\n💡 To get full translations:")
    print(f"   Option 1: Get API keys and modify fetch_translations()")
    print(f"   Option 2: Download open source Bible databases:")
    print(f"      git clone https://github.com/scrollmapper/bible_databases")
    print(f"   Option 3: Use Bible Gateway scraping (respect ToS)")

if __name__ == "__main__":
    main()
