const fs = require('fs');
const path = require('path');

const MORPH_DIR = './morphgnt';
const OUTPUT_FILE = './public/data/sblgnt.json';

// 27 books mapping (MorphGNT filename -> abbrev, Greek, Korean)
const BOOKS = [
  { file: '61-Mt-morphgnt.txt', abbrev: 'MAT', greek: 'ΚΑΤΑ ΜΑΘΘΑΙΟΝ', korean: '마태복음' },
  { file: '62-Mk-morphgnt.txt', abbrev: 'MRK', greek: 'ΚΑΤΑ ΜΑΡΚΟΝ', korean: '마가복음' },
  { file: '63-Lk-morphgnt.txt', abbrev: 'LUK', greek: 'ΚΑΤΑ ΛΟΥΚΑΝ', korean: '누가복음' },
  { file: '64-Jn-morphgnt.txt', abbrev: 'JHN', greek: 'ΚΑΤΑ ΙΩΑΝΝΗΝ', korean: '요한복음' },
  { file: '65-Ac-morphgnt.txt', abbrev: 'ACT', greek: 'ΠΡΑΞΕΙΣ ΑΠΟΣΤΟΛΩΝ', korean: '사도행전' },
  { file: '66-Ro-morphgnt.txt', abbrev: 'ROM', greek: 'ΠΡΟΣ ΡΩΜΑΙΟΥΣ', korean: '로마서' },
  { file: '67-1Co-morphgnt.txt', abbrev: '1CO', greek: 'ΠΡΟΣ ΚΟΡΙΝΘΙΟΥΣ Α', korean: '고린도전서' },
  { file: '68-2Co-morphgnt.txt', abbrev: '2CO', greek: 'ΠΡΟΣ ΚΟΡΙΝΘΙΟΥΣ Β', korean: '고린도후서' },
  { file: '69-Ga-morphgnt.txt', abbrev: 'GAL', greek: 'ΠΡΟΣ ΓΑΛΑΤΑΣ', korean: '갈라디아서' },
  { file: '70-Eph-morphgnt.txt', abbrev: 'EPH', greek: 'ΠΡΟΣ ΕΦΕΣΙΟΥΣ', korean: '에베소서' },
  { file: '71-Php-morphgnt.txt', abbrev: 'PHP', greek: 'ΠΡΟΣ ΦΙΛΙΠΠΗΣΙΟΥΣ', korean: '빌립보서' },
  { file: '72-Col-morphgnt.txt', abbrev: 'COL', greek: 'ΠΡΟΣ ΚΟΛΟΣΣΑΕΙΣ', korean: '골로새서' },
  { file: '73-1Th-morphgnt.txt', abbrev: '1TH', greek: 'ΠΡΟΣ ΘΕΣΣΑΛΟΝΙΚΕΙΣ Α', korean: '데살로니가전서' },
  { file: '74-2Th-morphgnt.txt', abbrev: '2TH', greek: 'ΠΡΟΣ ΘΕΣΣΑΛΟΝΙΚΕΙΣ Β', korean: '데살로니가후서' },
  { file: '75-1Ti-morphgnt.txt', abbrev: '1TM', greek: 'ΠΡΟΣ ΤΙΜΟΘΕΟΝ Α', korean: '디모데전서' },
  { file: '76-2Ti-morphgnt.txt', abbrev: '2TM', greek: 'ΠΡΟΣ ΤΙΜΟΘΕΟΝ Β', korean: '디모데후서' },
  { file: '77-Tit-morphgnt.txt', abbrev: 'TIT', greek: 'ΠΡΟΣ ΤΙΤΟΝ', korean: '디도서' },
  { file: '78-Phm-morphgnt.txt', abbrev: 'PHM', greek: 'ΠΡΟΣ ΦΙΛΗΜΟΝΑ', korean: '빌레몬서' },
  { file: '79-Heb-morphgnt.txt', abbrev: 'HEB', greek: 'ΠΡΟΣ ΕΒΡΑΙΟΥΣ', korean: '히브리서' },
  { file: '80-Jas-morphgnt.txt', abbrev: 'JAS', greek: 'ΙΑΚΩΒΟΥ ΕΠΙΣΤΟΛΗ', korean: '야고보서' },
  { file: '81-1Pe-morphgnt.txt', abbrev: '1PE', greek: 'ΠΕΤΡΟΥ ΕΠΙΣΤΟΛΗ Α', korean: '베드로전서' },
  { file: '82-2Pe-morphgnt.txt', abbrev: '2PE', greek: 'ΠΕΤΡΟΥ ΕΠΙΣΤΟΛΗ Β', korean: '베드로후서' },
  { file: '83-1Jn-morphgnt.txt', abbrev: '1JN', greek: 'ΙΩΑΝΝΟΥ ΕΠΙΣΤΟΛΗ Α', korean: '요한일서' },
  { file: '84-2Jn-morphgnt.txt', abbrev: '2JN', greek: 'ΙΩΑΝΝΟΥ ΕΠΙΣΤΟΛΗ Β', korean: '요한이서' },
  { file: '85-3Jn-morphgnt.txt', abbrev: '3JN', greek: 'ΙΩΑΝΝΟΥ ΕΠΙΣΤΟΛΗ Γ', korean: '요한삼서' },
  { file: '86-Jud-morphgnt.txt', abbrev: 'JUD', greek: 'ΙΟΥΔΑ ΕΠΙΣΤΟΛΗ', korean: '유다서' },
  { file: '87-Re-morphgnt.txt', abbrev: 'REV', greek: 'ΑΠΟΚΑΛΥΨΙΣ ΙΩΑΝΝΟΥ', korean: '요한계시록' },
];

function parseMorphFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  
  // Structure: { chapterNum: { verseNum: [{t, l, m}, ...] } }
  const bookData = new Map();
  let wordCount = 0;
  
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 6) continue;
    
    // Parse: 010101 N- ----NSF- Βίβλος Βίβλος βίβλος βίβλος
    const bcv = parts[0]; // BookChapterVerse: 010101
    const chapter = parseInt(bcv.substring(2, 4)); // 01
    const verse = parseInt(bcv.substring(4, 6)); // 01
    
    const pos = parts[1]; // Part of speech: N-, V-, etc.
    const morph = parts[2]; // Morphology: ----NSF-
    const text = parts[3]; // Surface form: Βίβλος
    const lemma = parts[5]; // Lemma: βίβλος
    
    // Compact morph code: part-of-speech + morphology
    const compactMorph = pos.replace(/-$/, '') + morph;
    
    if (!bookData.has(chapter)) {
      bookData.set(chapter, new Map());
    }
    const chapterMap = bookData.get(chapter);
    
    if (!chapterMap.has(verse)) {
      chapterMap.set(verse, []);
    }
    
    chapterMap.get(verse).push({
      t: text,      // text
      l: lemma,     // lemma (lexicon form)
      m: compactMorph // morphology code
    });
    wordCount++;
  }
  
  // Convert to arrays
  const sortedChapters = Array.from(bookData.keys()).sort((a, b) => a - b);
  const chapters = [];
  
  for (const chNum of sortedChapters) {
    const chapterMap = bookData.get(chNum);
    const sortedVerses = Array.from(chapterMap.keys()).sort((a, b) => a - b);
    const verseArray = [];
    
    for (const vNum of sortedVerses) {
      verseArray.push(chapterMap.get(vNum));
    }
    
    chapters.push(verseArray);
  }
  
  return { chapters, wordCount };
}

function main() {
  console.log('📖 MorphGNT Parser - 고도화된 SBLGNT 생성\n');
  
  const books = [];
  let totalWords = 0;
  let totalVerses = 0;
  
  for (const bookInfo of BOOKS) {
    const filePath = path.join(MORPH_DIR, bookInfo.file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Missing: ${bookInfo.file}`);
      continue;
    }
    
    const { chapters, wordCount } = parseMorphFile(filePath);
    
    const verseCount = chapters.reduce((sum, ch) => sum + ch.length, 0);
    totalVerses += verseCount;
    totalWords += wordCount;
    
    books.push({
      abbrev: bookInfo.abbrev,
      book: bookInfo.greek,
      korean_name: bookInfo.korean,
      chapters
    });
    
    console.log(`✓ ${bookInfo.korean_name} (${bookInfo.abbrev}) - ${chapters.length}장, ${verseCount}절, ${wordCount}단어`);
  }
  
  // Write output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ books }, null, 2), 'utf-8');
  
  console.log(`\n✅ CONVERSION COMPLETE!`);
  console.log(`📚 ${books.length}/27 books`);
  console.log(`📖 ${books.reduce((s, b) => s + b.chapters.length, 0)} chapters`);
  console.log(`📜 ${totalVerses} verses`);
  console.log(`🔤 ${totalWords.toLocaleString()} words`);
  console.log(`📁 Output: ${OUTPUT_FILE}`);
  
  // Sample output
  console.log(`\n📋 SAMPLE (마태복음 1:1):`);
  const sample = books[0].chapters[0][0];
  console.log(JSON.stringify(sample.slice(0, 3), null, 2));
}

main();
