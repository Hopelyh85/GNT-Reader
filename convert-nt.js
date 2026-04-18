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

function parseBook(xml, startIdx) {
  const bookMatch = xml.slice(startIdx).match(/<book id="([^"]+)">/);
  if (!bookMatch) return null;
  
  const bookId = bookMatch[1];
  const bookStart = startIdx + xml.slice(startIdx).indexOf(`<book id="${bookId}">`);
  const bookEndMatch = xml.slice(bookStart).match(/<\/book>/);
  if (!bookEndMatch) return null;
  
  const bookEnd = bookStart + bookEndMatch.index + bookEndMatch[0].length;
  const bookXml = xml.slice(bookStart, bookEnd);
  
  // Parse title
  const titleMatch = bookXml.match(/<title>([^<]+)<\/title>/);
  const greekTitle = titleMatch ? titleMatch[1] : '';
  
  // Parse paragraphs
  const chapters = [];
  let currentChapter = 0;
  let currentVerses = [];
  
  const pRegex = /<p>([\s\S]*?)<\/p>/g;
  let pMatch;
  
  while ((pMatch = pRegex.exec(bookXml)) !== null) {
    const pContent = pMatch[1];
    
    // Parse verse number
    const verseNumMatch = pContent.match(/<verse-number id="[^"]*\s*(\d+):(\d+)"\s*\/>/);
    if (!verseNumMatch) continue;
    
    const chapterNum = parseInt(verseNumMatch[1]);
    const verseNum = parseInt(verseNumMatch[2]);
    
    // Build verse text
    let verseText = pContent
      .replace(/<verse-number[^>]*>/g, '')
      .replace(/<\/verse-number>/g, '')
      .replace(/<w>([^<]*)<\/w>/g, '$1')
      .replace(/<suffix>([^<]*)<\/suffix>/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (chapterNum !== currentChapter) {
      if (currentVerses.length > 0) {
        chapters.push(currentVerses);
      }
      while (chapters.length < chapterNum - 1) {
        chapters.push([]);
      }
      currentVerses = [];
      currentChapter = chapterNum;
    }
    
    while (currentVerses.length < verseNum - 1) {
      currentVerses.push('');
    }
    
    if (verseNum <= currentVerses.length) {
      currentVerses[verseNum - 1] = verseText;
    } else {
      currentVerses.push(verseText);
    }
  }
  
  if (currentVerses.length > 0) {
    chapters.push(currentVerses);
  }
  
  return { bookId, greekTitle, chapters, bookEnd };
}

function convert() {
  console.log('Reading XML file...');
  const xml = fs.readFileSync('./new-testament.xml', 'utf-8');
  
  const books = [];
  let idx = 0;
  
  while (idx < xml.length) {
    const result = parseBook(xml, idx);
    if (!result) break;
    
    const { bookId, greekTitle, chapters, bookEnd } = result;
    idx = bookEnd;
    
    if (!BOOK_MAPPING[bookId]) {
      console.log(`Warning: Unknown book ID: ${bookId}`);
      continue;
    }
    
    const [abbrev, defaultGreek, koreanName] = BOOK_MAPPING[bookId];
    const finalGreekTitle = greekTitle || defaultGreek;
    
    const bookObj = {
      abbrev,
      book: finalGreekTitle,
      korean_name: koreanName,
      chapters
    };
    books.push(bookObj);
    console.log(`Processed: ${koreanName} (${abbrev}) - ${chapters.length} chapters, ${chapters.reduce((a, c) => a + c.length, 0)} verses`);
  }
  
  const output = { books };
  fs.writeFileSync('./public/data/sblgnt.json', JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n✅ Total: ${books.length} books converted successfully!`);
  console.log('📁 Output: public/data/sblgnt.json');
}

convert();
