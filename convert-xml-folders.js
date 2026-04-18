const fs = require('fs');
const path = require('path');

const RAW_XML_DIR = './raw_json';
const OUTPUT_FILE = './public/data/sblgnt.json';

// Book folder mapping to Korean Protestant names
const BOOK_FOLDERS = [
  { folder: 'Matt', abbrev: 'MAT', greek: 'ΚΑΤΑ ΜΑΘΘΑΙΟΝ', korean: '마태복음' },
  { folder: 'Mark', abbrev: 'MRK', greek: 'ΚΑΤΑ ΜΑΡΚΟΝ', korean: '마가복음' },
  { folder: 'Luke', abbrev: 'LUK', greek: 'ΚΑΤΑ ΛΟΥΚΑΝ', korean: '누가복음' },
  { folder: 'John', abbrev: 'JHN', greek: 'ΚΑΤΑ ΙΩΑΝΝΗΝ', korean: '요한복음' },
  { folder: 'Acts', abbrev: 'ACT', greek: 'ΠΡΑΞΕΙΣ ΑΠΟΣΤΟΛΩΝ', korean: '사도행전' },
  { folder: 'Rom', abbrev: 'ROM', greek: 'ΠΡΟΣ ΡΩΜΑΙΟΥΣ', korean: '로마서' },
  { folder: '1Cor', abbrev: '1CO', greek: 'ΠΡΟΣ ΚΟΡΙΝΘΙΟΥΣ Α', korean: '고린도전서' },
  { folder: '2Cor', abbrev: '2CO', greek: 'ΠΡΟΣ ΚΟΡΙΝΘΙΟΥΣ Β', korean: '고린도후서' },
  { folder: 'Gal', abbrev: 'GAL', greek: 'ΠΡΟΣ ΓΑΛΑΤΑΣ', korean: '갈라디아서' },
  { folder: 'Eph', abbrev: 'EPH', greek: 'ΠΡΟΣ ΕΦΕΣΙΟΥΣ', korean: '에베소서' },
  { folder: 'Phil', abbrev: 'PHP', greek: 'ΠΡΟΣ ΦΙΛΙΠΠΗΣΙΟΥΣ', korean: '빌립보서' },
  { folder: 'Col', abbrev: 'COL', greek: 'ΠΡΟΣ ΚΟΛΟΣΣΑΕΙΣ', korean: '골로새서' },
  { folder: '1Thess', abbrev: '1TH', greek: 'ΠΡΟΣ ΘΕΣΣΑΛΟΝΙΚΕΙΣ Α', korean: '데살로니가전서' },
  { folder: '2Thess', abbrev: '2TH', greek: 'ΠΡΟΣ ΘΕΣΣΑΛΟΝΙΚΕΙΣ Β', korean: '데살로니가후서' },
  { folder: '1Tim', abbrev: '1TM', greek: 'ΠΡΟΣ ΤΙΜΟΘΕΟΝ Α', korean: '디모데전서' },
  { folder: '2Tim', abbrev: '2TM', greek: 'ΠΡΟΣ ΤΙΜΟΘΕΟΝ Β', korean: '디모데후서' },
  { folder: 'Tit', abbrev: 'TIT', greek: 'ΠΡΟΣ ΤΙΤΟΝ', korean: '디도서' },
  { folder: 'Phlm', abbrev: 'PHM', greek: 'ΠΡΟΣ ΦΙΛΗΜΟΝΑ', korean: '빌레몬서' },
  { folder: 'Heb', abbrev: 'HEB', greek: 'ΠΡΟΣ ΕΒΡΑΙΟΥΣ', korean: '히브리서' },
  { folder: 'Jas', abbrev: 'JAS', greek: 'ΙΑΚΩΒΟΥ ΕΠΙΣΤΟΛΗ', korean: '야고보서' },
  { folder: '1Pet', abbrev: '1PE', greek: 'ΠΕΤΡΟΥ ΕΠΙΣΤΟΛΗ Α', korean: '베드로전서' },
  { folder: '2Pet', abbrev: '2PE', greek: 'ΠΕΤΡΟΥ ΕΠΙΣΤΟΛΗ Β', korean: '베드로후서' },
  { folder: '1John', abbrev: '1JN', greek: 'ΙΩΑΝΝΟΥ ΕΠΙΣΤΟΛΗ Α', korean: '요한일서' },
  { folder: '2John', abbrev: '2JN', greek: 'ΙΩΑΝΝΟΥ ΕΠΙΣΤΟΛΗ Β', korean: '요한이서' },
  { folder: '3John', abbrev: '3JN', greek: 'ΙΩΑΝΝΟΥ ΕΠΙΣΤΟΛΗ Γ', korean: '요한삼서' },
  { folder: 'Jud', abbrev: 'JUD', greek: 'ΙΟΥΔΑ ΕΠΙΣΤΟΛΗ', korean: '유다서' },
  { folder: 'Rev', abbrev: 'REV', greek: 'ΑΠΟΚΑΛΥΨΙΣ ΙΩΑΝΝΟΥ', korean: '요한계시록' },
];

function cleanText(text) {
  return text
    .replace(/<w>([^<]*)<\/w>/g, '$1')
    .replace(/<suffix>([^<]*)<\/suffix>/g, '$1')
    .replace(/<note[^>]*>.*?<\/note>/gs, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseChapter(xmlContent) {
  const verses = [];
  
  // Find all paragraphs
  const pRegex = /<p>([\s\S]*?)<\/p>/g;
  let pMatch;
  
  while ((pMatch = pRegex.exec(xmlContent)) !== null) {
    const pContent = pMatch[1];
    
    // Find all verse-number tags and their positions
    const verseNumRegex = /<verse-number\s+id="([^"]*)"[^>]*>(?:\d+:\d+)?<\/verse-number>/g;
    const verseMatches = Array.from(pContent.matchAll(verseNumRegex));
    
    for (let i = 0; i < verseMatches.length; i++) {
      const match = verseMatches[i];
      const idAttr = match[1]; // e.g., "Matthew 1:1"
      
      // Extract chapter:verse from id
      const idMatch = idAttr.match(/(\d+):(\d+)$/);
      if (!idMatch) continue;
      
      const chapter = parseInt(idMatch[1]);
      const verse = parseInt(idMatch[2]);
      
      // Calculate verse text range
      const verseStart = match.index + match[0].length;
      const verseEnd = i < verseMatches.length - 1 ? verseMatches[i + 1].index : pContent.length;
      let verseText = pContent.substring(verseStart, verseEnd);
      
      verses.push({
        chapter,
        verse,
        text: cleanText(verseText)
      });
    }
  }
  
  // Get chapter number from first verse
  const firstChapter = verses.length > 0 ? verses[0].chapter : 1;
  return { chapterNum: firstChapter, verses };
}

function convertBook(bookInfo) {
  const bookDir = path.join(RAW_XML_DIR, bookInfo.folder);
  
  if (!fs.existsSync(bookDir)) {
    console.log(`⚠️  Directory not found: ${bookInfo.folder}`);
    return null;
  }
  
  const files = fs.readdirSync(bookDir)
    .filter(f => f.endsWith('.xml'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/(\d+)/)?.[1] || 0);
      const numB = parseInt(b.match(/(\d+)/)?.[1] || 0);
      return numA - numB;
    });
  
  const chapters = [];
  let totalVerses = 0;
  
  for (const file of files) {
    const filePath = path.join(bookDir, file);
    const xmlContent = fs.readFileSync(filePath, 'utf-8');
    
    const { chapterNum, verses } = parseChapter(xmlContent);
    
    // Sort verses by number
    verses.sort((a, b) => a.verse - b.verse);
    
    // Build verse array
    if (verses.length > 0) {
      const maxVerse = Math.max(...verses.map(v => v.verse));
      const verseArray = new Array(maxVerse).fill('');
      
      for (const v of verses) {
        verseArray[v.verse - 1] = v.text;
      }
      
      chapters.push(verseArray);
      totalVerses += verses.length;
    }
  }
  
  return {
    abbrev: bookInfo.abbrev,
    book: bookInfo.greek,
    korean_name: bookInfo.korean,
    chapters,
    totalVerses
  };
}

function main() {
  console.log('Starting XML conversion...\n');
  
  const books = [];
  let grandTotalVerses = 0;
  
  for (const bookInfo of BOOK_FOLDERS) {
    const result = convertBook(bookInfo);
    if (result) {
      books.push(result);
      grandTotalVerses += result.totalVerses;
      console.log(`✓ ${result.korean_name} (${result.abbrev}) - ${result.chapters.length} chapters, ${result.totalVerses} verses`);
    }
  }
  
  // Remove totalVerses from output
  const outputBooks = books.map(({ totalVerses, ...rest }) => rest);
  const output = { books: outputBooks };
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  
  console.log(`\n✅ Conversion complete!`);
  console.log(`📚 ${books.length}/27 books`);
  console.log(`📖 ${books.reduce((s, b) => s + b.chapters.length, 0)} chapters`);
  console.log(`📜 ${grandTotalVerses} verses`);
  console.log(`📁 Output: ${OUTPUT_FILE}`);
  
  // Verification
  console.log('\n📋 Verification against expected verse counts:');
  const expected = {
    'MAT': 1071, 'MRK': 678, 'LUK': 1151, 'JHN': 879, 'ACT': 1007,
    'ROM': 433, '1CO': 437, '2CO': 257, 'GAL': 149, 'EPH': 155,
    'PHP': 104, 'COL': 95, '1TH': 89, '2TH': 47, '1TM': 113,
    '2TM': 83, 'TIT': 46, 'PHM': 25, 'HEB': 303, 'JAS': 108,
    '1PE': 105, '2PE': 61, '1JN': 105, '2JN': 13, '3JN': 15,
    'JUD': 25, 'REV': 404
  };
  
  for (const b of books) {
    const exp = expected[b.abbrev];
    const match = b.totalVerses === exp ? '✓' : '⚠️';
    console.log(`${match} ${b.korean_name}: ${b.totalVerses}/${exp || '?'} verses`);
  }
}

main();
