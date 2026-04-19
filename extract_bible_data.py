#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extract Bible data from GitHub open sources
- Korean: wlghks/openbible (KRV)
- English: scrollmapper/bible_databases (NET/KJV/WEB)
- Applies Protestant terminology standardization
"""

import json
import urllib.request
import ssl
from pathlib import Path

ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# Book mapping (SBLGNT -> standard names)
BOOK_MAP = {
    'MAT': ('Matthew', '마태복음', 28),
    'MRK': ('Mark', '마가복음', 16),
    'LUK': ('Luke', '누가복음', 24),
    'JHN': ('John', '요한복음', 21),
    'ACT': ('Acts', '사도행전', 28),
    'ROM': ('Romans', '로마서', 16),
    '1CO': ('1 Corinthians', '고린도전서', 16),
    '2CO': ('2 Corinthians', '고린도후서', 13),
    'GAL': ('Galatians', '갈라디아서', 6),
    'EPH': ('Ephesians', '에베소서', 6),
    'PHP': ('Philippians', '빌립보서', 4),
    'COL': ('Colossians', '골로새서', 4),
    '1TH': ('1 Thessalonians', '데살로니가전서', 5),
    '2TH': ('2 Thessalonians', '데살로니가후서', 3),
    '1TM': ('1 Timothy', '디모데전서', 6),
    '2TM': ('2 Timothy', '디모데후서', 4),
    'TIT': ('Titus', '디도서', 3),
    'PHM': ('Philemon', '빌레몬서', 1),
    'HEB': ('Hebrews', '히브리서', 13),
    'JAS': ('James', '야고보서', 5),
    '1PE': ('1 Peter', '베드로전서', 5),
    '2PE': ('2 Peter', '베드로후서', 3),
    '1JN': ('1 John', '요한일서', 5),
    '2JN': ('2 John', '요한이서', 1),
    '3JN': ('3 John', '요한삼서', 1),
    'JUD': ('Jude', '유다서', 1),
    'REV': ('Revelation', '요한계시록', 22),
}

# Protestant terminology standardization
PROTESTANT_TERMS_KO = {
    '아우구스티누스': '어거스틴',
    '아우구스티누스의': '어거스틴의',
    '크리소스토무스': '크리소스톰',
    '크리소스토무스의': '크리소스톰의',
    '요한네스': '요한',
    '마르코스': '마가',
    '마테오': '마태',
    '루카스': '누가',
}

PROTESTANT_TERMS_EN = {
    'Augustinus': 'Augustine',
    'Chrysostomus': 'Chrysostom',
    'Matteo': 'Matthew',
    'Marcos': 'Mark',
    'Lukas': 'Luke',
    'Johannes': 'John',
}

def standardize_korean(text):
    """Apply Protestant terminology standardization for Korean"""
    if not text:
        return text
    for old, new in PROTESTANT_TERMS_KO.items():
        text = text.replace(old, new)
    return text

def standardize_english(text):
    """Apply Protestant terminology standardization for English"""
    if not text:
        return text
    for old, new in PROTESTANT_TERMS_EN.items():
        text = text.replace(old, new)
    return text

def download_json(url):
    """Download JSON from URL"""
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ssl_context, timeout=60) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"  ✗ Failed: {e}")
        return None

def try_openbible_krv():
    """Try to get Korean Revised Version from wlghks/openbible"""
    print("🇰🇷 Trying wlghks/openbible for KRV...")
    
    # Try multiple possible URLs
    urls = [
        "https://raw.githubusercontent.com/wlghks/openbible/master/bibles/kjv.json",
        "https://raw.githubusercontent.com/wlghks/openbible/main/bibles/kjv.json",
    ]
    
    for url in urls:
        print(f"  → {url}")
        data = download_json(url)
        if data:
            print(f"  ✓ Got KRV data!")
            return data
    
    return None

def try_scrollmapper(version='web'):
    """Try to get English Bible from scrollmapper"""
    print(f"🌐 Trying scrollmapper for {version.upper()}...")
    
    # World English Bible (public domain)
    url = f"https://raw.githubusercontent.com/scrollmapper/bible_databases/master/txt/{version}/{version}.json"
    print(f"  → {url}")
    
    return download_json(url)

def convert_to_verse_map(data, is_korean=False):
    """Convert API data to our verse map format"""
    verse_map = {}
    
    if not data:
        return verse_map
    
    # Handle different JSON structures
    if isinstance(data, dict):
        # If it's already in book/chapter/verse format
        for book_key, book_data in data.items():
            if isinstance(book_data, dict):
                for chapter_key, chapter_data in book_data.items():
                    if isinstance(chapter_data, dict):
                        for verse_key, verse_text in chapter_data.items():
                            key = f"{book_key}_{chapter_key}_{verse_key}"
                            if is_korean:
                                verse_text = standardize_korean(str(verse_text))
                            else:
                                verse_text = standardize_english(str(verse_text))
                            verse_map[key] = verse_text
    
    return verse_map

def generate_sample_data_with_real_format():
    """Generate comprehensive sample data in correct format"""
    
    # Matthew chapter 1 (first 17 verses)
    matthew_1_krv = [
        "아브라함과 다윗의 자손 예수 그리스도의 족보",
        "아브라함이 이삭을 낳고, 이삭은 야곱을 낳고, 야곱은 유다와 그의 형제들을 낳고",
        "유다는 타마르에게서 베레스와 세라를 낳고, 베레스는 에스롬을 낳고, 에스롬은 아람을 낳고",
        "아람은 아미나답을 낳고, 아미나답은 나손을 낳고, 나손은 살몬을 낳고",
        "살몬은 라합에게서 보아스를 낳고, 보아스는 룻에게서 오벳을 낳고, 오벳은 예시를 낳고",
        "예시는 다윗 왕을 낳고, 다윗은 우리아의 아내에게서 솔로몬을 낳고",
        "솔로몬은 르호보암을 낳고, 르호보암은 아비야를 낳고, 아비야는 아사를 낳고",
        "아사는 여호사밧을 낳고, 여호사밧은 요람을 낳고, 요람은 웃시야를 낳고",
        "웃시야는 요담을 낳고, 요담은 아하스를 낳고, 아하스는 히스기야를 낳고",
        "히스기야는 므낫세를 낳고, 므낫세는 아몬을 낳고, 아몬은 요시야를 낳고",
        "바벨론 포로 때에 요시야는 여고냐와 그의 형제들을 낳고",
        "포로 된 후에 여고냐는 스알디엘을 낳고, 스알디엘은 스룹바벨을 낳고",
        "스룹바벨은 아비둇을 낳고, 아비둇은 엘라김을 낳고, 엘라김은 아소르를 낳고",
        "아소르는 사독을 낳고, 사독은 아킴을 낳고, 아킴은 엘리웃을 낳고",
        "엘리웃은 엘르아살을 낳고, 엘르아살은 맛단을 낳고, 맛단은 야곱을 낳고",
        "야곱은 마리아의 남편 요셉을 낳았으니, 마리아에게서 그리스도가 나시니라",
        "그러므로 아브라함부터 다윗까지 열네 대요, 다윗부터 바벨론으로 사로잡혀 갈 때까지 열네 대요, 바벨론으로 사로잡혀 간 후부터 그리스도까지 열네 대더라",
    ]
    
    matthew_1_net = [
        "This is the record of the genealogy of Jesus Christ, the son of David, the son of Abraham.",
        "Abraham was the father of Isaac, Isaac the father of Jacob, Jacob the father of Judah and his brothers,",
        "Judah the father of Perez and Zerah (by Tamar), Perez the father of Hezron, Hezron the father of Ram,",
        "Ram the father of Amminadab, Amminadab the father of Nahshon, Nahshon the father of Salmon,",
        "Salmon the father of Boaz (by Rahab), Boaz the father of Obed (by Ruth), Obed the father of Jesse,",
        "Jesse the father of David the king. David the father of Solomon (by Uriah's wife),",
        "Solomon the father of Rehoboam, Rehoboam the father of Abijah, Abijah the father of Asa,",
        "Asa the father of Jehoshaphat, Jehoshaphat the father of Joram, Joram the father of Uzziah,",
        "Uzziah the father of Jotham, Jotham the father of Ahaz, Ahaz the father of Hezekiah,",
        "Hezekiah the father of Manasseh, Manasseh the father of Amon, Amon the father of Josiah,",
        "Josiah the father of Jeconiah and his brothers, at the time of the deportation to Babylon.",
        "After the deportation to Babylon, Jeconiah the father of Shealtiel, Shealtiel the father of Zerubbabel,",
        "Zerubbabel the father of Abiud, Abiud the father of Eliakim, Eliakim the father of Azor,",
        "Azor the father of Zadok, Zadok the father of Achim, Achim the father of Eliud,",
        "Eliud the father of Eleazar, Eleazar the father of Matthan, Matthan the father of Jacob,",
        "Jacob the father of Joseph, the husband of Mary, by whom Jesus was born, who is called Christ.",
        "So all the generations from Abraham to David are fourteen generations, and from David to the deportation to Babylon, fourteen generations, and from the deportation to Babylon to Christ, fourteen generations.",
    ]
    
    # Build verse maps
    krv_map = {}
    net_map = {}
    
    for i, (krv, net) in enumerate(zip(matthew_1_krv, matthew_1_net), 1):
        krv_map[f"MAT_1_{i}"] = standardize_korean(krv)
        net_map[f"MAT_1_{i}"] = standardize_english(net)
    
    # Add John 3:16
    krv_map["JHN_3_16"] = standardize_korean("하나님이 세상을 이처럼 사랑하사 독생자를 주셨으니, 누구든지 그를 믿는 자는 멸망하지 않고 영생을 얻게 하려 하심이라")
    net_map["JHN_3_16"] = standardize_english("For this is the way God loved the world: He gave his one and only Son, so that everyone who believes in him will not perish but have eternal life.")
    
    return krv_map, net_map

def main():
    print("=" * 60)
    print("📚 Bible Data Extractor")
    print("=" * 60)
    
    # Try to fetch from GitHub
    krv_data = try_openbible_krv()
    net_data = try_scrollmapper('web')  # World English Bible (public domain)
    
    # Convert to verse maps
    krv_map = convert_to_verse_map(krv_data, is_korean=True) if krv_data else {}
    net_map = convert_to_verse_map(net_data, is_korean=False) if net_data else {}
    
    # If failed, use sample data
    if not krv_map or not net_map:
        print(f"\n⚠️  API fetch incomplete, using sample data...")
        sample_krv, sample_net = generate_sample_data_with_real_format()
        
        krv_map.update(sample_krv)
        net_map.update(sample_net)
    
    # Statistics
    print(f"\n📊 Results:")
    print(f"   KRV verses: {len(krv_map)}")
    print(f"   NET verses: {len(net_map)}")
    
    # Save
    print(f"\n💾 Saving...")
    with open('krv_data.json', 'w', encoding='utf-8') as f:
        json.dump(krv_map, f, ensure_ascii=False, indent=2)
    
    with open('net_data.json', 'w', encoding='utf-8') as f:
        json.dump(net_map, f, ensure_ascii=False, indent=2)
    
    print(f"   ✓ krv_data.json ({len(krv_map)} verses)")
    print(f"   ✓ net_data.json ({len(net_map)} verses)")
    
    print(f"\n✅ Done! Run: python3 merge_translations.py")

if __name__ == "__main__":
    main()
