const fs = require('fs');

const OUTPUT_FILE = './public/data/sblgnt.json';

// Book ID mapping (SBLGNT XML ID -> abbrev, Greek name, Korean Protestant name)
const BOOK_MAP = {
  'Mt':   ['MAT', 'ΚΑΤΑ ΜΑΘΘΑΙΟΝ', '마태복음'],
  'Mk':   ['MRK', 'ΚΑΤΑ ΜΑΡΚΟΝ', '마가복음'],
  'Lk':   ['LUK', 'ΚΑΤΑ ΛΟΥΚΑΝ', '누가복음'],
  'Jn':   ['JHN', 'ΚΑΤΑ ΙΩΑΝΝΗΝ', '요한복음'],
  'Ac':   ['ACT', 'ΠΡΑΞΕΙΣ ΑΠΟΣΤΟΛΩΝ', '사도행전'],
  'Ro':   ['ROM', 'ΠΡΟΣ ΡΩΜΑΙΟΥΣ', '로마서'],
  '1Co':  ['1CO', 'ΠΡΟΣ ΚΟΡΙΝΘΙΟΥΣ Α', '고린도전서'],
  '2Co':  ['2CO', 'ΠΡΟΣ ΚΟΡΙΝΘΙΟΥΣ Β', '고린도후서'],
  'Gal':  ['GAL', 'ΠΡΟΣ ΓΑΛΑΤΑΣ', '갈라디아서'],
  'Eph':  ['EPH', 'ΠΡΟΣ ΕΦΕΣΙΟΥΣ', '에베소서'],
  'Php':  ['PHP', 'ΠΡΟΣ ΦΙΛΙΠΠΗΣΙΟΥΣ', '빌립보서'],
  'Col':  ['COL', 'ΠΡΟΣ ΚΟΛΟΣΣΑΕΙΣ', '골로새서'],
  '1Th':  ['1TH', 'ΠΡΟΣ ΘΕΣΣΑΛΟΝΙΚΕΙΣ Α', '데살로니가전서'],
  '2Th':  ['2TH', 'ΠΡΟΣ ΘΕΣΣΑΛΟΝΙΚΕΙΣ Β', '데살로니가후서'],
  '1Tim': ['1TM', 'ΠΡΟΣ ΤΙΜΟΘΕΟΝ Α', '디모데전서'],
  '2Tim': ['2TM', 'ΠΡΟΣ ΤΙΜΟΘΕΟΝ Β', '디모데후서'],
  'Tit':  ['TIT', 'ΠΡΟΣ ΤΙΤΟΝ', '디도서'],
  'Phm':  ['PHM', 'ΠΡΟΣ ΦΙΛΗΜΟΝΑ', '빌레몬서'],
  'Heb':  ['HEB', 'ΠΡΟΣ ΕΒΡΑΙΟΥΣ', '히브리서'],
  'Jam':  ['JAS', 'ΙΑΚΩΒΟΥ ΕΠΙΣΤΟΛΗ', '야고보서'],
  '1Pe':  ['1PE', 'ΠΕΤΡΟΥ ΕΠΙΣΤΟΛΗ Α', '베드로전서'],
  '2Pe':  ['2PE', 'ΠΕΤΡΟΥ ΕΠΙΣΤΟΛΗ Β', '베드로후서'],
  '1Jn':  ['1JN', 'ΙΩΑΝΝΟΥ ΕΠΙΣΤΟΛΗ Α', '요한일서'],
  '2Jn':  ['2JN', 'ΙΩΑΝΝΟΥ ΕΠΙΣΤΟΛΗ Β', '요한이서'],
  '3Jn':  ['3JN', 'ΙΩΑΝΝΟΥ ΕΠΙΣΤΟΛΗ Γ', '요한삼서'],
  'Jud':  ['JUD', 'ΙΟΥΔΑ ΕΠΙΣΤΟΛΗ', '유다서'],
  'Re':   ['REV', 'ΑΠΟΚΑΛΥΨΙΣ ΙΩΑΝΝΟΥ', '요한계시록'],
};

function cleanText(text) {
  return text
    .replace(/<w>([^<]*)<\/w>/g, '$1')
    .replace(/<suffix>([^<]*)<\/suffix>/g, '$1')
    .replace(/<note[^>]*>.*?<\/note>/gs, '')
    .replace(/<.*?>/g, '') // Remove any remaining tags
    .replace(/\s+/g, ' ')
    .trim();
}

function parseBook(xml, startIdx, endIdx) {
  const bookXml = xml.slice(startIdx, endIdx);
  
  // Get book ID
  const idMatch = bookXml.match(/<book id="([^"]+)">/);
  if (!idMatch) return null;
  
  const bookId = idMatch[1];
  const mapping = BOOK_MAP[bookId];
  if (!mapping) {
    console.log(`⚠️  Unknown book ID: ${bookId}`);
    return null;
  }
  
  const [abbrev, greekName, koreanName] = mapping;
  
  // Get Greek title
  const titleMatch = bookXml.match(/<title>([^<]+)<\/title>/);
  const greekTitle = titleMatch ? titleMatch[1].trim() : greekName;
  
  // Parse verses
  const verses = [];
  const pRegex = /<p>([\s\S]*?)<\/p>/g;
  let pMatch;
  
  while ((pMatch = pRegex.exec(bookXml)) !== null) {
    const pContent = pMatch[1];
    
    // Find all verse numbers in this paragraph
    const vnRegex = /<verse-number\s+id="([^"]*)"[^>]*>(?:\d+:\d+)?<\/verse-number>/g;
    const vnMatches = Array.from(pContent.matchAll(vnRegex));
    
    for (let i = 0; i < vnMatches.length; i++) {
      const vnMatch = vnMatches[i];
      const idAttr = vnMatch[1]; // e.g., "Matthew 1:1"
      
      // Extract chapter:verse
      const cvMatch = idAttr.match(/(\d+):(\d+)$/);
      if (!cvMatch) continue;
      
      const chapter = parseInt(cvMatch[1]);
      const verse = parseInt(cvMatch[2]);
      
      // Get text between this verse-number and the next one
      const textStart = vnMatch.index + vnMatch[0].length;
      const textEnd = i < vnMatches.length - 1 ? vnMatches[i + 1].index : pContent.length;
      const verseText = pContent.substring(textStart, textEnd);
      
      verses.push({
        chapter,
        verse,
        text: cleanText(verseText)
      });
    }
  }
  
  // Group by chapter
  const chapterMap = new Map();
  for (const v of verses) {
    if (!chapterMap.has(v.chapter)) {
      chapterMap.set(v.chapter, []);
    }
    chapterMap.get(v.chapter).push(v);
  }
  
  // Build chapters array
  const sortedChapters = Array.from(chapterMap.keys()).sort((a, b) => a - b);
  const chapters = [];
  
  for (const chNum of sortedChapters) {
    const chVerses = chapterMap.get(chNum);
    chVerses.sort((a, b) => a.verse - b.verse);
    
    const maxVerse = Math.max(...chVerses.map(v => v.verse));
    const verseArray = new Array(maxVerse).fill('');
    
    for (const v of chVerses) {
      verseArray[v.verse - 1] = v.text;
    }
    
    chapters.push(verseArray);
  }
  
  return {
    abbrev,
    book: greekTitle,
    korean_name: koreanName,
    chapters,
    totalVerses: verses.length
  };
}

function main() {
  console.log('📖 Reading new-testament.xml...\n');
  
  const xml = fs.readFileSync('./new-testament.xml', 'utf-8');
  const books = [];
  
  // Find all book positions
  const bookRegex = /<book id="([^"]+)">/g;
  const bookMatches = [];
  let match;
  
  while ((match = bookRegex.exec(xml)) !== null) {
    bookMatches.push({ id: match[1], index: match.index });
  }
  
  console.log(`Found ${bookMatches.length} books\n`);
  
  // Parse each book
  for (let i = 0; i < bookMatches.length; i++) {
    const startIdx = bookMatches[i].index;
    const endIdx = i < bookMatches.length - 1 ? bookMatches[i + 1].index : xml.length;
    
    const result = parseBook(xml, startIdx, endIdx);
    if (result) {
      books.push(result);
      console.log(`✓ ${result.korean_name} (${result.abbrev}) - ${result.chapters.length} chapters, ${result.totalVerses} verses`);
    }
  }
  
  // Write output
  const outputBooks = books.map(({ totalVerses, ...rest }) => rest);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ books: outputBooks }, null, 2), 'utf-8');
  
  const totalChapters = books.reduce((s, b) => s + b.chapters.length, 0);
  const totalVerses = books.reduce((s, b) => s + b.totalVerses, 0);
  
  console.log(`\n✅ SUCCESS! ${books.length}/27 books converted`);
  console.log(`📚 Total: ${totalChapters} chapters, ${totalVerses} verses`);
  console.log(`📁 Output: ${OUTPUT_FILE}`);
  
  // Verification
  const expected = {
    'MAT': 1071, 'MRK': 678, 'LUK': 1151, 'JHN': 879, 'ACT': 1007,
    'ROM': 433, '1CO': 437, '2CO': 257, 'GAL': 149, 'EPH': 155,
    'PHP': 104, 'COL': 95, '1TH': 89, '2TH': 47, '1TM': 113,
    '2TM': 83, 'TIT': 46, 'PHM': 25, 'HEB': 303, 'JAS': 108,
    '1PE': 105, '2PE': 61, '1JN': 105, '2JN': 13, '3JN': 15,
    'JUD': 25, 'REV': 404
  };
  
  console.log('\n📋 Verification:');
  let perfect = 0, close = 0, missing = 0;
  for (const b of books) {
    const exp = expected[b.abbrev];
    const diff = b.totalVerses - exp;
    let status;
    if (diff === 0) {
      status = '✓ PERFECT';
      perfect++;
    } else if (Math.abs(diff) <= 5) {
      status = `~ CLOSE (${diff > 0 ? '+' : ''}${diff})`;
      close++;
    } else {
      status = `⚠️ MISSING ${Math.abs(diff)}`;
      missing++;
    }
    console.log(`${status} ${b.korean_name}: ${b.totalVerses}/${exp} verses`);
  }
  
  console.log(`\n📊 Summary: ${perfect} perfect, ${close} close, ${missing} with gaps`);
}

main();
