const fs = require('fs');

const BOOK_MAPPING = {
  'Mt': ['MAT', 'ΚΑΤΑ ΜΑΘΘΑΙΟΝ', '마태복음'],
  'Mk': ['MRK', 'ΚΑΤΑ ΜΑΡΚΟΝ', '마가복음'],
  'Lu': ['LUK', 'ΚΑΤΑ ΛΟΥΚΑΝ', '누가복음'],
  'Jn': ['JHN', 'ΚΑΤΑ ΙΩΑΝΝΗΝ', '요한복음'],
  'Ac': ['ACT', 'ΠΡΑΞΕΙΣ ΑΠΟΣΤΟΛΩΝ', '사도행전'],
  'Ro': ['ROM', 'ΠΡΟΣ ΡΩΜΑΙΟΥΣ', '로마서'],
  '1Co': ['1CO', 'ΠΡΟΣ ΚΟΡΙΝΘΙΟΥΣ Α', '고린도전서'],
  '2Co': ['2CO', 'ΠΡΟΣ ΚΟΡΙΝΘΙΟΥΣ Β', '고린도후서'],
  'Gal': ['GAL', 'ΠΡΟΣ ΓΑΛΑΤΑΣ', '갈라디아서'],
  'Eph': ['EPH', 'ΠΡΟΣ ΕΦΕΣΙΟΥΣ', '에베소서'],
  'Php': ['PHP', 'ΠΡΟΣ ΦΙΛΙΠΠΗΣΙΟΥΣ', '빌립보서'],
  'Col': ['COL', 'ΠΡΟΣ ΚΟΛΟΣΣΑΕΙΣ', '골로새서'],
  '1Th': ['1TH', 'ΠΡΟΣ ΘΕΣΣΑΛΟΝΙΚΕΙΣ Α', '데살로니가전서'],
  '2Th': ['2TH', 'ΠΡΟΣ ΘΕΣΣΑΛΟΝΙΚΕΙΣ Β', '데살로니가후서'],
  '1Tim': ['1TM', 'ΠΡΟΣ ΤΙΜΟΘΕΟΝ Α', '디모데전서'],
  '2Tim': ['2TM', 'ΠΡΟΣ ΤΙΜΟΘΕΟΝ Β', '디모데후서'],
  'Tit': ['TIT', 'ΠΡΟΣ ΤΙΤΟΝ', '디도서'],
  'Phm': ['PHM', 'ΠΡΟΣ ΦΙΛΗΜΟΝΑ', '빌레몬서'],
  'Heb': ['HEB', 'ΠΡΟΣ ΕΒΡΑΙΟΥΣ', '히브리서'],
  'Jam': ['JAS', 'ΙΑΚΩΒΟΥ ΕΠΙΣΤΟΛΗ', '야고보서'],
  '1Pe': ['1PE', 'ΠΕΤΡΟΥ ΕΠΙΣΤΟΛΗ Α', '베드로전서'],
  '2Pe': ['2PE', 'ΠΕΤΡΟΥ ΕΠΙΣΤΟΛΗ Β', '베드로후서'],
  '1Jn': ['1JN', 'ΙΩΑΝΝΟΥ ΕΠΙΣΤΟΛΗ Α', '요한일서'],
  '2Jn': ['2JN', 'ΙΩΑΝΝΟΥ ΕΠΙΣΤΟΛΗ Β', '요한이서'],
  '3Jn': ['3JN', 'ΙΩΑΝΝΟΥ ΕΠΙΣΤΟΛΗ Γ', '요한삼서'],
  'Jud': ['JUD', 'ΙΟΥΔΑ ΕΠΙΣΤΟΛΗ', '유다서'],
  'Re': ['REV', 'ΑΠΟΚΑΛΥΨΙΣ ΙΩΑΝΝΟΥ', '요한계시록'],
};

function cleanText(text) {
  return text
    .replace(/<w>([^<]*)<\/w>/g, '$1')
    .replace(/<suffix>([^<]*)<\/suffix>/g, '$1')
    .replace(/<note[^>]*>(?:[^<]*)<\/note>/g, '')
    .replace(/<\/note>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function convert() {
  console.log('Reading XML file...');
  const xml = fs.readFileSync('./new-testament.xml', 'utf-8');
  
  const books = [];
  let totalVerses = 0;
  
  // Match each book
  const bookRegex = /<book id="([^"]+)">/g;
  let bookMatch;
  const bookMatches = [];
  
  while ((bookMatch = bookRegex.exec(xml)) !== null) {
    bookMatches.push({ id: bookMatch[1], index: bookMatch.index });
  }
  
  for (let i = 0; i < bookMatches.length; i++) {
    const bookId = bookMatches[i].id;
    const startIdx = bookMatches[i].index;
    const endIdx = i < bookMatches.length - 1 ? bookMatches[i + 1].index : xml.length;
    const bookXml = xml.slice(startIdx, endIdx);
    
    if (!BOOK_MAPPING[bookId]) {
      console.log(`⚠️  Skipping: ${bookId}`);
      continue;
    }
    
    const [abbrev, defaultGreek, koreanName] = BOOK_MAPPING[bookId];
    
    // Extract title
    const titleMatch = bookXml.match(/<title>([^<]+)<\/title>/);
    const greekTitle = titleMatch ? titleMatch[1].trim() : defaultGreek;
    
    // Extract all verses
    const verses = [];
    const verseRegex = /<verse-number id="[^"]*\s*(\d+):(\d+)"[^>]*>(?:\d+:\d+)?<\/verse-number>([\s\S]*?)(?=<verse-number|$)/g;
    let verseMatch;
    
    while ((verseMatch = verseRegex.exec(bookXml)) !== null) {
      const chapterNum = parseInt(verseMatch[1]);
      const verseNum = parseInt(verseMatch[2]);
      const verseContent = verseMatch[3];
      
      // Clean up until </p> or end
      let cleanContent = verseContent;
      const pEndMatch = cleanContent.match(/^(.*?)<\/p>/);
      if (pEndMatch) {
        cleanContent = pEndMatch[1];
      }
      
      const verseText = cleanText(cleanContent);
      
      verses.push({
        chapter: chapterNum,
        verse: verseNum,
        text: verseText
      });
    }
    
    // Group by chapter
    const chapterMap = new Map();
    for (const v of verses) {
      if (!chapterMap.has(v.chapter)) {
        chapterMap.set(v.chapter, []);
      }
      chapterMap.get(v.chapter).push(v);
    }
    
    // Sort chapters and build array
    const sortedChapters = Array.from(chapterMap.keys()).sort((a, b) => a - b);
    const chapters = [];
    
    for (const chNum of sortedChapters) {
      const chVerses = chapterMap.get(chNum);
      // Sort verses by number
      chVerses.sort((a, b) => a.verse - b.verse);
      
      // Build verse array with proper indexing
      const maxVerse = Math.max(...chVerses.map(v => v.verse));
      const verseArray = new Array(maxVerse).fill('');
      
      for (const v of chVerses) {
        verseArray[v.verse - 1] = v.text;
      }
      
      chapters.push(verseArray);
    }
    
    const bookVerses = verses.length;
    totalVerses += bookVerses;
    
    const bookObj = {
      abbrev,
      book: greekTitle,
      korean_name: koreanName,
      chapters
    };
    books.push(bookObj);
    
    console.log(`✓ ${koreanName} (${abbrev}) - ${chapters.length} chapters, ${bookVerses} verses`);
  }
  
  // Verify order
  const expectedOrder = ['MAT','MRK','LUK','JHN','ACT','ROM','1CO','2CO','GAL','EPH','PHP','COL','1TH','2TH','1TM','2TM','TIT','PHM','HEB','JAS','1PE','2PE','1JN','2JN','3JN','JUD','REV'];
  
  const actualOrder = books.map(b => b.abbrev);
  let orderCorrect = true;
  for (let i = 0; i < expectedOrder.length; i++) {
    if (actualOrder[i] !== expectedOrder[i]) {
      orderCorrect = false;
      console.log(`⚠️  Order mismatch at ${i}: expected ${expectedOrder[i]}, got ${actualOrder[i] || 'none'}`);
    }
  }
  
  if (orderCorrect && books.length === 27) {
    console.log('✓ Book order verified');
  }
  
  const output = { books };
  fs.writeFileSync('./public/data/sblgnt.json', JSON.stringify(output, null, 2), 'utf-8');
  
  console.log(`\n✅ Success! ${books.length}/27 books`);
  console.log(`📊 Total: ${books.reduce((s, b) => s + b.chapters.length, 0)} chapters, ${totalVerses} verses`);
  console.log(`📁 Output: public/data/sblgnt.json`);
  
  // Verification
  const expectedVerses = {
    'MAT': 1071, 'MRK': 678, 'LUK': 1151, 'JHN': 879,
    'ACT': 1007, 'ROM': 433, '1CO': 437, '2CO': 257,
    'GAL': 149, 'EPH': 155, 'PHP': 104, 'COL': 95,
    '1TH': 89, '2TH': 47, '1TM': 113, '2TM': 83,
    'TIT': 46, 'PHM': 25, 'HEB': 303, 'JAS': 108,
    '1PE': 105, '2PE': 61, '1JN': 105, '2JN': 13,
    '3JN': 15, 'JUD': 25, 'REV': 404
  };
  
  console.log('\n📋 Verification:');
  for (const b of books) {
    const expected = expectedVerses[b.abbrev];
    const actual = b.chapters.reduce((s, ch) => s + ch.filter(v => v).length, 0);
    const status = actual === expected ? '✓' : '⚠️';
    console.log(`${status} ${b.korean_name}: ${actual}/${expected || '?'} verses`);
  }
}

convert();
