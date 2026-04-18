const fs = require('fs');
const path = require('path');

const RAW_XML_DIR = './raw_xml';
const OUTPUT_FILE = './public/data/sblgnt.json';

// 27 books in canonical order with Korean Protestant names
const BOOKS = [
  { id: 'Mt', abbrev: 'MAT', greek: 'ΚΑΤΑ ΜΑΘΘΑΙΟΝ', korean: '마태복음', folder: 'Matt' },
  { id: 'Mk', abbrev: 'MRK', greek: 'ΚΑΤΑ ΜΑΡΚΟΝ', korean: '마가복음', folder: 'Mark' },
  { id: 'Lu', abbrev: 'LUK', greek: 'ΚΑΤΑ ΛΟΥΚΑΝ', korean: '누가복음', folder: 'Luke' },
  { id: 'Jn', abbrev: 'JHN', greek: 'ΚΑΤΑ ΙΩΑΝΝΗΝ', korean: '요한복음', folder: 'John' },
  { id: 'Ac', abbrev: 'ACT', greek: 'ΠΡΑΞΕΙΣ ΑΠΟΣΤΟΛΩΝ', korean: '사도행전', folder: 'Acts' },
  { id: 'Ro', abbrev: 'ROM', greek: 'ΠΡΟΣ ΡΩΜΑΙΟΥΣ', korean: '로마서', folder: 'Rom' },
  { id: '1Co', abbrev: '1CO', greek: 'ΠΡΟΣ ΚΟΡΙΝΘΙΟΥΣ Α', korean: '고린도전서', folder: '1Cor' },
  { id: '2Co', abbrev: '2CO', greek: 'ΠΡΟΣ ΚΟΡΙΝΘΙΟΥΣ Β', korean: '고린도후서', folder: '2Cor' },
  { id: 'Ga', abbrev: 'GAL', greek: 'ΠΡΟΣ ΓΑΛΑΤΑΣ', korean: '갈라디아서', folder: 'Gal' },
  { id: 'Eph', abbrev: 'EPH', greek: 'ΠΡΟΣ ΕΦΕΣΙΟΥΣ', korean: '에베소서', folder: 'Eph' },
  { id: 'Php', abbrev: 'PHP', greek: 'ΠΡΟΣ ΦΙΛΙΠΠΗΣΙΟΥΣ', korean: '빌립보서', folder: 'Phil' },
  { id: 'Col', abbrev: 'COL', greek: 'ΠΡΟΣ ΚΟΛΟΣΣΑΕΙΣ', korean: '골로새서', folder: 'Col' },
  { id: '1Th', abbrev: '1TH', greek: 'ΠΡΟΣ ΘΕΣΣΑΛΟΝΙΚΕΙΣ Α', korean: '데살로니가전서', folder: '1Thess' },
  { id: '2Th', abbrev: '2TH', greek: 'ΠΡΟΣ ΘΕΣΣΑΛΟΝΙΚΕΙΣ Β', korean: '데살로니가후서', folder: '2Thess' },
  { id: '1Tm', abbrev: '1TM', greek: 'ΠΡΟΣ ΤΙΜΟΘΕΟΝ Α', korean: '디모데전서', folder: '1Tim' },
  { id: '2Tm', abbrev: '2TM', greek: 'ΠΡΟΣ ΤΙΜΟΘΕΟΝ Β', korean: '디모데후서', folder: '2Tim' },
  { id: 'Tt', abbrev: 'TIT', greek: 'ΠΡΟΣ ΤΙΤΟΝ', korean: '디도서', folder: 'Tit' },
  { id: 'Phm', abbrev: 'PHM', greek: 'ΠΡΟΣ ΦΙΛΗΜΟΝΑ', korean: '빌레몬서', folder: 'Phlm' },
  { id: 'Heb', abbrev: 'HEB', greek: 'ΠΡΟΣ ΕΒΡΑΙΟΥΣ', korean: '히브리서', folder: 'Heb' },
  { id: 'Jas', abbrev: 'JAS', greek: 'ΙΑΚΩΒΟΥ ΕΠΙΣΤΟΛΗ', korean: '야고보서', folder: 'Jas' },
  { id: '1Pe', abbrev: '1PE', greek: 'ΠΕΤΡΟΥ ΕΠΙΣΤΟΛΗ Α', korean: '베드로전서', folder: '1Pet' },
  { id: '2Pe', abbrev: '2PE', greek: 'ΠΕΤΡΟΥ ΕΠΙΣΤΟΛΗ Β', korean: '베드로후서', folder: '2Pet' },
  { id: '1Jn', abbrev: '1JN', greek: 'ΙΩΑΝΝΟΥ ΕΠΙΣΤΟΛΗ Α', korean: '요한일서', folder: '1John' },
  { id: '2Jn', abbrev: '2JN', greek: 'ΙΩΑΝΝΟΥ ΕΠΙΣΤΟΛΗ Β', korean: '요한이서', folder: '2John' },
  { id: '3Jn', abbrev: '3JN', greek: 'ΙΩΑΝΝΟΥ ΕΠΙΣΤΟΛΗ Γ', korean: '요한삼서', folder: '3John' },
  { id: 'Jude', abbrev: 'JUD', greek: 'ΙΟΥΔΑ ΕΠΙΣΤΟΛΗ', korean: '유다서', folder: 'Jude' },
  { id: 'Re', abbrev: 'REV', greek: 'ΑΠΟΚΑΛΥΨΙΣ ΙΩΑΝΝΟΥ', korean: '요한계시록', folder: 'Rev' },
];

function parseParagraph(pContent) {
  const verses = [];
  
  // Find all verse-number positions
  const vnRegex = /<verse-number\s+id="([^"]*)"[^>]*>(?:[\d:]+)?<\/verse-number>/g;
  const matches = Array.from(pContent.matchAll(vnRegex));
  
  if (matches.length === 0) return verses;
  
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const idAttr = match[1]; // e.g., "Matthew 1:1"
    
    // Extract chapter and verse from id
    const cvMatch = idAttr.match(/(\d+):(\d+)$/);
    if (!cvMatch) continue;
    
    const chapter = parseInt(cvMatch[1]);
    const verse = parseInt(cvMatch[2]);
    
    // Text starts after this verse-number and ends before next verse-number or </p>
    const textStart = match.index + match[0].length;
    const textEnd = i < matches.length - 1 ? matches[i + 1].index : pContent.length;
    let text = pContent.substring(textStart, textEnd);
    
    // Extract text from <w> and <suffix> tags
    let verseText = '';
    const tagRegex = /<(w|suffix)>([^<]*)<\/\1>/g;
    let tagMatch;
    while ((tagMatch = tagRegex.exec(text)) !== null) {
      verseText += tagMatch[2];
    }
    
    // Clean up
    verseText = verseText.replace(/\s+/g, ' ').trim();
    
    verses.push({ chapter, verse, text: verseText });
  }
  
  return verses;
}

function parseChapterFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const allVerses = [];
  
  // Find all <p> tags
  const pRegex = /<p>([\s\S]*?)<\/p>/g;
  let pMatch;
  
  while ((pMatch = pRegex.exec(content)) !== null) {
    const pContent = pMatch[1];
    const verses = parseParagraph(pContent);
    allVerses.push(...verses);
  }
  
  return allVerses;
}

function processBook(bookInfo) {
  const bookDir = path.join(RAW_XML_DIR, bookInfo.folder);
  
  if (!fs.existsSync(bookDir)) {
    console.log(`⚠️  Directory not found: ${bookInfo.folder}`);
    return null;
  }
  
  // Get all XML files and sort by chapter number
  const files = fs.readdirSync(bookDir)
    .filter(f => f.endsWith('.xml'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/^(\d+)/)?.[1] || '0');
      const numB = parseInt(b.match(/^(\d+)/)?.[1] || '0');
      return numA - numB;
    });
  
  const chapters = [];
  let totalVerses = 0;
  
  for (const file of files) {
    const filePath = path.join(bookDir, file);
    const verses = parseChapterFile(filePath);
    
    if (verses.length === 0) continue;
    
    // Group by chapter number (should all be same chapter in one file)
    const chapterNum = verses[0].chapter;
    
    // Sort by verse number
    verses.sort((a, b) => a.verse - b.verse);
    
    // Build verse array
    const maxVerse = Math.max(...verses.map(v => v.verse));
    const verseArray = new Array(maxVerse).fill('');
    
    for (const v of verses) {
      verseArray[v.verse - 1] = v.text;
    }
    
    chapters.push(verseArray);
    totalVerses += verses.length;
  }
  
  return {
    abbrev: bookInfo.abbrev,
    book: bookInfo.greek,
    korean_name: bookInfo.korean,
    chapters,
    _totalVerses: totalVerses
  };
}

function main() {
  console.log('📖 Starting perfect XML conversion...\n');
  
  const books = [];
  let grandTotalVerses = 0;
  
  for (const bookInfo of BOOKS) {
    const result = processBook(bookInfo);
    if (result) {
      books.push(result);
      grandTotalVerses += result._totalVerses;
      console.log(`✓ ${result.korean_name} (${result.abbrev}) - ${result.chapters.length} chapters, ${result._totalVerses} verses`);
    }
  }
  
  // Remove internal tracking field
  const outputBooks = books.map(({ _totalVerses, ...rest }) => rest);
  const output = { books: outputBooks };
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  
  console.log(`\n✅ CONVERSION COMPLETE!`);
  console.log(`📚 ${books.length}/27 books`);
  console.log(`📖 ${books.reduce((s, b) => s + b.chapters.length, 0)} chapters`);
  console.log(`📜 ${grandTotalVerses} verses`);
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
  
  console.log('\n📋 VERIFICATION SUMMARY:');
  let perfect = 0, missing = 0;
  for (const b of books) {
    const exp = expected[b.abbrev];
    const actual = b._totalVerses;
    const diff = actual - exp;
    
    if (diff === 0) {
      console.log(`✓ PERFECT ${b.korean_name}: ${actual}/${exp} verses`);
      perfect++;
    } else if (diff < 0) {
      console.log(`⚠️  MISSING ${Math.abs(diff)} ${b.korean_name}: ${actual}/${exp} verses`);
      missing++;
    } else {
      console.log(`⚠️  EXTRA +${diff} ${b.korean_name}: ${actual}/${exp} verses`);
    }
  }
  
  console.log(`\n📊 ${perfect}/27 books perfect, ${missing} with missing verses`);
  console.log(`📈 Total: ${grandTotalVerses}/7957 expected (${((grandTotalVerses/7957)*100).toFixed(1)}%)`);
}

main();
