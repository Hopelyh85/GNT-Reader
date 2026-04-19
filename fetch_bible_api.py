#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fetch Bible translations from bible-api.com
- Supports multiple versions including Korean and English
- Fetches all 7,927 verses for New Testament 27 books
- Applies Protestant terminology standardization
"""

import json
import urllib.request
import urllib.error
import ssl
import time
from pathlib import Path
from collections import defaultdict

# Disable SSL verification for compatibility
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# Bible book mapping (SBLGNT abbrev -> bible-api.com format)
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

# Available translations on bible-api.com
TRANSLATIONS = {
    'krv': 'korean_rv',  # Korean Revised Version (개역한글)
    'net': 'net',        # NET Bible
    'kjv': 'kjv',        # King James Version (fallback)
    'web': 'web',        # World English Bible (fallback)
}

# Protestant terminology standardization
# Key: incorrect/non-standard term -> Value: standard Protestant term
PROTESTANT_TERMS = {
    # Korean terms
    '아우구스티누스': '어거스틴',
    '아우구스티누스의': '어거스틴의',
    '크리소스토무스': '크리소스톰',
    '크리소스토무스의': '크리소스톰의',
    '요한네스': '요한',
    '마르코스': '마가',
    '마테오': '마태',
    '루카스': '누가',
    '예수스': '예수',
    '그리스토스': '그리스도',
    
    # English terms  
    'Augustinus': 'Augustine',
    'Chrysostomus': 'Chrysostom',
    'Matteo': 'Matthew',
    'Marcos': 'Mark',
    'Lukas': 'Luke',
    'Johannes': 'John',
}

def standardize_terminology(text):
    """Apply Protestant terminology standardization"""
    if not text:
        return text
    
    for old_term, new_term in PROTESTANT_TERMS.items():
        text = text.replace(old_term, new_term)
    
    return text

def fetch_verse_from_api(book_api_name, chapter, verse, translation='net'):
    """
    Fetch a single verse from bible-api.com
    
    URL format: https://bible-api.com/{BOOK}+{CH}:{VERSE}?translation={TRANS}
    """
    # Format passage string
    passage = f"{book_api_name}+{chapter}:{verse}"
    url = f"https://bible-api.com/{passage}?translation={translation}"
    
    try:
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'Mozilla/5.0 (compatible; GNT-Reader/1.0)',
                'Accept': 'application/json'
            }
        )
        
        with urllib.request.urlopen(req, context=ssl_context, timeout=30) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            # Extract text from response
            if 'text' in data:
                return data['text'].strip()
            elif 'verses' in data and len(data['verses']) > 0:
                return data['verses'][0].get('text', '').strip()
            
            return None
            
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f"      ⚠️  Verse not found: {book_api_name} {chapter}:{verse}")
        else:
            print(f"      ✗ HTTP {e.code}: {book_api_name} {chapter}:{verse}")
        return None
    except Exception as e:
        print(f"      ✗ Error: {e}")
        return None

def fetch_book_translation(abbrev, book_name, chapters, translation_code, translation_name):
    """Fetch all verses for a single book"""
    verses_data = {}
    
    print(f"\n📖 {abbrev} ({book_name}) - {translation_name}")
    
    for chapter in range(1, chapters + 1):
        verse_num = 1
        consecutive_errors = 0
        
        while consecutive_errors < 3:  # Stop after 3 consecutive missing verses
            text = fetch_verse_from_api(book_name, chapter, verse_num, translation_code)
            
            if text:
                # Standardize terminology
                text = standardize_terminology(text)
                
                key = f"{abbrev}_{chapter}_{verse_num}"
                verses_data[key] = text
                
                print(f"   ✓ {key}: {text[:40]}...")
                consecutive_errors = 0
                verse_num += 1
                
                # Small delay to be polite to API
                time.sleep(0.3)
            else:
                consecutive_errors += 1
                verse_num += 1
                
                if consecutive_errors >= 3:
                    print(f"   📍 Chapter {chapter} complete ({verse_num - 3} verses)")
                    break
    
    return verses_data

def save_progress(data, filename):
    """Save current progress to JSON"""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"💾 Saved progress: {filename} ({len(data)} verses)")

def load_existing_data(filename):
    """Load existing data if available"""
    if Path(filename).exists():
        with open(filename, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def fetch_all_translations():
    """Fetch all translations for all books"""
    
    print("=" * 60)
    print("📚 Bible API Translation Fetcher")
    print("=" * 60)
    print(f"Target: {len(BOOKS)} books, ~7,927 verses")
    print(f"Sources: bible-api.com")
    print(f"Translations: NET (English), Korean RV (Korean)")
    print("=" * 60)
    
    # Load existing progress
    krv_data = load_existing_data('krv_fetched.json')
    net_data = load_existing_data('net_fetched.json')
    
    print(f"\n📦 Existing data:")
    print(f"   KRV: {len(krv_data)} verses")
    print(f"   NET: {len(net_data)} verses")
    
    # Fetch NET Bible (English)
    if len(net_data) < 7927:
        print(f"\n🌐 Fetching NET Bible...")
        for abbrev, book_name, chapters in BOOKS:
            # Skip if already fetched
            test_key = f"{abbrev}_1_1"
            if test_key in net_data:
                print(f"   ⏭️  {abbrev} already fetched, skipping")
                continue
            
            book_data = fetch_book_translation(
                abbrev, book_name, chapters, 
                TRANSLATIONS['net'], 'NET Bible'
            )
            net_data.update(book_data)
            
            # Save progress after each book
            save_progress(net_data, 'net_fetched.json')
            
            # Brief pause between books
            time.sleep(1)
    else:
        print(f"\n✅ NET Bible already complete ({len(net_data)} verses)")
    
    # Fetch Korean Revised Version
    if len(krv_data) < 7927:
        print(f"\n🇰🇷 Fetching Korean Revised Version...")
        for abbrev, book_name, chapters in BOOKS:
            test_key = f"{abbrev}_1_1"
            if test_key in krv_data:
                print(f"   ⏭️  {abbrev} already fetched, skipping")
                continue
            
            book_data = fetch_book_translation(
                abbrev, book_name, chapters,
                TRANSLATIONS['krv'], 'Korean RV'
            )
            krv_data.update(book_data)
            
            # Save progress after each book
            save_progress(krv_data, 'krv_fetched.json')
            
            time.sleep(1)
    else:
        print(f"\n✅ KRV already complete ({len(krv_data)} verses)")
    
    # Final summary
    print(f"\n" + "=" * 60)
    print(f"📊 FINAL RESULTS")
    print(f"=" * 60)
    print(f"NET (English): {len(net_data)} verses")
    print(f"KRV (Korean):  {len(krv_data)} verses")
    print(f"Target:        7,927 verses")
    
    if len(net_data) >= 7927 and len(krv_data) >= 7927:
        print(f"\n✅ ALL VERSES FETCHED!")
        
        # Copy to final data files
        save_progress(krv_data, 'krv_data.json')
        save_progress(net_data, 'net_data.json')
        
        print(f"\n💾 Final files created:")
        print(f"   - krv_data.json")
        print(f"   - net_data.json")
        print(f"\n🚀 Ready to run: python3 merge_translations.py")
    else:
        print(f"\n⚠️  INCOMPLETE - Run again to continue")
        print(f"   Progress saved in krv_fetched.json and net_fetched.json")
    
    return krv_data, net_data

if __name__ == "__main__":
    try:
        fetch_all_translations()
    except KeyboardInterrupt:
        print(f"\n\n⚠️  Interrupted by user")
        print(f"💾 Progress has been saved")
        print(f"   Run again to continue from where you left off")
