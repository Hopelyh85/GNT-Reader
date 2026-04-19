#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Download Open Source Bible Data
Fetches KRV and NET from public repositories
"""

import json
import csv
import urllib.request
import os
from pathlib import Path

# Open Bible Database URLs
# Source: https://github.com/scrollmapper/bible_databases
BIBLE_SOURCES = {
    'krv': {
        'name': 'Korean Revised Version (개역한글)',
        'source': 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/txt/%1s/%2s.txt',
        'books': {
            'MAT': 'matthew', 'MRK': 'mark', 'LUK': 'luke', 'JHN': 'john',
            'ACT': 'acts', 'ROM': 'romans', '1CO': '1corinthians', '2CO': '2corinthians',
            'GAL': 'galatians', 'EPH': 'ephesians', 'PHP': 'philippians', 'COL': 'colossians',
            '1TH': '1thessalonians', '2TH': '2thessalonians', '1TM': '1timothy', '2TM': '2timothy',
            'TIT': 'titus', 'PHM': 'philemon', 'HEB': 'hebrews', 'JAS': 'james',
            '1PE': '1peter', '2PE': '2peter', '1JN': '1john', '2JN': '2john',
            '3JN': '3john', 'JUD': 'jude', 'REV': 'revelation'
        }
    },
    'net': {
        'name': 'NET Bible (English)',
        'source': 'https://labs.bible.org/api/?passage=%s+%d:%d&formatting=plain&type=json',
        'api_based': True
    }
}

def download_krv_data():
    """
    Try to download KRV data from open sources
    """
    print("📥 Attempting to download KRV (개역한글)...")
    
    # Try Korean open bible first
    krv_url = "https://raw.githubusercontent.com/wlghks/openbible/master/bibles/kjv.json"
    
    try:
        print(f"   Trying: {krv_url}")
        with urllib.request.urlopen(krv_url, timeout=30) as response:
            data = json.loads(response.read().decode('utf-8'))
            print(f"   ✓ Success! Loaded KRV data")
            return data
    except Exception as e:
        print(f"   ✗ Failed: {e}")
    
    # Fallback: Create template for manual import
    print("\n   ℹ️  Automatic download failed. Manual steps required:")
    print("   1. Download KRV from: https://www.bsk.or.kr/ (Bible Society of Korea)")
    print("   2. Or use: https://github.com/wlghks/openbible")
    print("   3. Convert to JSON format: krv_data.json")
    
    return None

def download_net_data():
    """
    Try to download NET Bible data
    """
    print("\n📥 Attempting to download NET Bible...")
    
    # NET Bible Labs API
    # Note: This is a demo API with rate limits
    # For production, get API key from https://labs.bible.org/
    
    verses_to_fetch = [
        ('Matthew', 1, 1), ('Matthew', 1, 2), ('Matthew', 1, 3),
        ('John', 3, 16), ('Romans', 1, 1), ('1Corinthians', 13, 4),
    ]
    
    net_data = {}
    
    for book, chapter, verse in verses_to_fetch:
        try:
            passage = f"{book}+{chapter}:{verse}"
            url = f"https://labs.bible.org/api/?passage={passage}&formatting=plain&type=json"
            
            print(f"   Fetching {book} {chapter}:{verse}...")
            with urllib.request.urlopen(url, timeout=10) as response:
                data = json.loads(response.read().decode('utf-8'))
                if data and len(data) > 0:
                    text = data[0].get('text', '')
                    # Convert to our format
                    abbrev = book[:3].upper()
                    if book == 'Matthew': abbrev = 'MAT'
                    elif book == 'Mark': abbrev = 'MRK'
                    elif book == 'Luke': abbrev = 'LUK'
                    elif book == 'John': abbrev = 'JHN'
                    elif book == 'Acts': abbrev = 'ACT'
                    elif book == 'Romans': abbrev = 'ROM'
                    elif book == '1Corinthians': abbrev = '1CO'
                    
                    key = f"{abbrev}_{chapter}_{verse}"
                    net_data[key] = text
                    print(f"   ✓ {key}: {text[:50]}...")
            
            time.sleep(0.5)  # Be polite to the API
            
        except Exception as e:
            print(f"   ✗ Failed: {e}")
    
    if net_data:
        print(f"   ✓ Fetched {len(net_data)} verses from NET API")
    else:
        print("\n   ℹ️  Limited API access. Manual steps:")
        print("   1. Get API key: https://labs.bible.org/")
        print("   2. Or use: https://github.com/scrollmapper/bible_databases")
    
    return net_data

def create_template_files():
    """Create template JSON files for manual filling"""
    
    # Load existing verse references from GNT data
    verses = set()
    with open('gnt_master_data.csv', 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            key = f"{row['book']}_{row['chapter']}_{row['verse']}"
            verses.add(key)
    
    print(f"\n📋 Creating template files for {len(verses)} verses...")
    
    # Create empty templates
    krv_template = {v: "" for v in sorted(verses)}
    net_template = {v: "" for v in sorted(verses)}
    
    # Save templates
    with open('krv_template.json', 'w', encoding='utf-8') as f:
        json.dump(krv_template, f, ensure_ascii=False, indent=2)
    
    with open('net_template.json', 'w', encoding='utf-8') as f:
        json.dump(net_template, f, ensure_ascii=False, indent=2)
    
    print(f"   Created: krv_template.json ({len(verses)} entries)")
    print(f"   Created: net_template.json ({len(verses)} entries)")
    
    return krv_template, net_template

def main():
    print("📖 Bible Data Downloader")
    print("=" * 50)
    
    import time
    
    # Try to download KRV
    krv_data = download_krv_data()
    
    # Try to download NET
    net_data = download_net_data()
    
    # Create templates for manual filling
    print("\n📋 Creating template files...")
    create_template_files()
    
    # Save any downloaded data
    if krv_data:
        with open('krv_downloaded.json', 'w', encoding='utf-8') as f:
            json.dump(krv_data, f, ensure_ascii=False, indent=2)
        print(f"\n💾 Saved: krv_downloaded.json")
    
    if net_data:
        with open('net_downloaded.json', 'w', encoding='utf-8') as f:
            json.dump(net_data, f, ensure_ascii=False, indent=2)
        print(f"💾 Saved: net_downloaded.json")
    
    print("\n" + "=" * 50)
    print("✅ Download attempts complete!")
    print("\n📖 Next steps:")
    print("   1. If downloads succeeded: cp krv_downloaded.json krv_data.json")
    print("   2. If downloads failed: Edit krv_template.json manually")
    print("   3. Run: python3 merge_translations.py")

if __name__ == "__main__":
    main()
