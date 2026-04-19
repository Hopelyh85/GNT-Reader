#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate Full Bible Data using bible-api.com
Fetches ALL 7,927 verses for both KRV and NET
"""

import json
import urllib.request
import urllib.error
import ssl
import time
from pathlib import Path

ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# 27 New Testament books with chapter counts
BOOKS = [
    ('MAT', 'Matthew', 28),
    ('MRK', 'Mark', 16),
    ('LUK', 'Luke', 24),
    ('JHN', 'John', 21),
    ('ACT', 'Acts', 28),
    ('ROM', 'Romans', 16),
    ('1CO', '1 Corinthians', 16),
    ('2CO', '2 Corinthians', 13),
    ('GAL', 'Galatians', 6),
    ('EPH', 'Ephesians', 6),
    ('PHP', 'Philippians', 4),
    ('COL', 'Colossians', 4),
    ('1TH', '1 Thessalonians', 5),
    ('2TH', '2 Thessalonians', 3),
    ('1TM', '1 Timothy', 6),
    ('2TM', '2 Timothy', 4),
    ('TIT', 'Titus', 3),
    ('PHM', 'Philemon', 1),
    ('HEB', 'Hebrews', 13),
    ('JAS', 'James', 5),
    ('1PE', '1 Peter', 5),
    ('2PE', '2 Peter', 3),
    ('1JN', '1 John', 5),
    ('2JN', '2 John', 1),
    ('3JN', '3 John', 1),
    ('JUD', 'Jude', 1),
    ('REV', 'Revelation', 22),
]

# Protestant terminology fixes
KO_FIXES = {
    '아우구스티누스': '어거스틴',
    '크리소스토무스': '크리소스톰',
}

EN_FIXES = {
    'Augustinus': 'Augustine',
    'Chrysostomus': 'Chrysostom',
}

def fix_terms(text, fixes):
    for old, new in fixes.items():
        text = text.replace(old, new)
    return text

def fetch_verse(book, chapter, verse, translation):
    """Fetch single verse from bible-api.com"""
    url = f"https://bible-api.com/{book}+{chapter}:{verse}?translation={translation}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=30)
        with urllib.request.urlopen(req, context=ssl_context) as r:
            data = json.loads(r.read().decode())
            return data.get('text', '').strip()
    except:
        return None

def fetch_all_verses():
    """Fetch all verses for both translations"""
    krv_data = {}
    net_data = {}
    
    total_verses = sum(chapters for _, _, chapters in BOOKS)
    print(f"📊 Target: 27 books, ~{total_verses} chapters")
    print("=" * 60)
    
    for abbrev, book_name, num_chapters in BOOKS:
        print(f"\n📖 {abbrev} ({book_name})")
        
        for chapter in range(1, num_chapters + 1):
            verse = 1
            empty_count = 0
            
            while empty_count < 3:
                # Fetch KRV
                krv_text = fetch_verse(book_name, chapter, verse, 'korean_rv')
                if krv_text:
                    key = f"{abbrev}_{chapter}_{verse}"
                    krv_data[key] = fix_terms(krv_text, KO_FIXES)
                
                # Fetch NET
                net_text = fetch_verse(book_name, chapter, verse, 'net')
                if net_text:
                    key = f"{abbrev}_{chapter}_{verse}"
                    net_data[key] = fix_terms(net_text, EN_FIXES)
                
                if krv_text or net_text:
                    verse += 1
                    empty_count = 0
                    if verse <= 3:  # Print first 3 verses
                        print(f"   {abbrev}_{chapter}_{verse-1}: {krv_text[:30] if krv_text else 'N/A'}...")
                else:
                    empty_count += 1
                    verse += 1
                
                time.sleep(0.2)  # Rate limiting
        
        # Save progress
        with open('krv_partial.json', 'w', encoding='utf-8') as f:
            json.dump(krv_data, f, ensure_ascii=False)
        with open('net_partial.json', 'w', encoding='utf-8') as f:
            json.dump(net_data, f, ensure_ascii=False)
        
        print(f"   💾 Progress: KRV={len(krv_data)}, NET={len(net_data)}")
    
    return krv_data, net_data

def main():
    print("📚 Full Bible Data Generator")
    print("Source: bible-api.com")
    print("=" * 60)
    
    krv, net = fetch_all_verses()
    
    # Save final
    with open('krv_data.json', 'w', encoding='utf-8') as f:
        json.dump(krv, f, ensure_ascii=False, indent=2)
    with open('net_data.json', 'w', encoding='utf-8') as f:
        json.dump(net, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Done!")
    print(f"KRV: {len(krv)} verses")
    print(f"NET: {len(net)} verses")
    print(f"\nRun: python3 merge_translations.py")

if __name__ == "__main__":
    main()
