const fs = require('fs');
const xml2js = require('xml2js');

const BOOK_MAPPING = {
  'Mt': ['MAT', 'ΚΑΤΑ ΜΑΘΘΑΙΟΝ', '마태복음'],
  'Mk': ['MRK', 'ΚΑΤΑ ΜΑΡΚΟΝ', '마가복음'],
  'Lk': ['LUK', 'ΚΑΤΑ ΛΟΥΚΑΝ', '누가복음'],
  'Jn': ['JHN', 'ΚΑΤΑ ΙΩΑΝΝΗΝ', '요한복음'],
  'Ac': ['ACT', 'ΠΡΑΞΕΙΣ ΑΠΟΣΤΟΛΩΝ', '사도행전'],
  'Ro': ['ROM', 'ΠΡΟΣ ΡΩΜΑΙΟΥΣ', '로마서'],
  '1Co': ['1CO', 'ΠΡΟΣ ΚΟΡΙΝΘΙΟΥΣ Α', '고린도전서'],
  '2Co': ['2CO', 'ΠΡΟΣ ΚΟΡΙΝΘΙΟΥΣ Β', '고린도후서'],
  'Ga': ['GAL', 'ΠΡΟΣ ΓΑΛΑΤΑΣ', '갈라디아서'],
  'Eph': ['EPH', 'ΠΡΟΣ ΕΦΕΣΙΟΥΣ', '에베소서'],
  'Php': ['PHP', 'ΠΡΟΣ ΦΙΛΙΠΠΗΣΙΟΥΣ', '빌립보서'],
  'Col': ['COL', 'ΠΡΟΣ ΚΟΛΟΣΣΑΕΙΣ', '골로새서'],
  '1Th': ['1TH', 'ΠΡΟΣ ΘΕΣΣΑΛΟΝΙΚΕΙΣ Α', '데살로니가전서'],
  '2Th': ['2TH', 'ΠΡΟΣ ΘΕΣΣΑΛΟΝΙΚΕΙΣ Β', '데살로니가후서'],
  '1Tm': ['1TM', 'ΠΡΟΣ ΤΙΜΟΘΕΟΝ Α', '디모데전서'],
  '2Tm': ['2TM', 'ΠΡΟΣ ΤΙΜΟΘΕΟΝ Β', '디모데후서'],
  'Tt': ['TIT', 'ΠΡΟΣ ΤΙΤΟΝ', '디도서'],
  'Phm': ['PHM', 'ΠΡΟΣ ΦΙΛΗΜΟΝΑ', '빌레몬서'],
  'Heb': ['HEB', 'ΠΡΟΣ ΕΒΡΑΙΟΥΣ', '히브리서'],
  'Jas': ['JAS', 'ΙΑΚΩΒΟΥ ΕΠΙΣΤΟΛΗ', '야고보서'],
  '1Pe': ['1PE', 'ΠΕΤΡΟΥ ΕΠΙΣΤΟΛΗ Α', '베드로전서'],
  '2Pe': ['2PE', 'ΠΕΤΡΟΥ ΕΠΙΣΤΟΛΗ Β', '베드로후서'],
  '1Jn': ['1JN', 'ΙΩΑΝΝΟΥ ΕΠΙΣΤΟΛΗ Α', '요한일서'],
  '2Jn': ['2JN', 'ΙΩΑΝΝΟΥ ΕΠΙΣΤΟΛΗ Β', '요한이서'],
  '3Jn': ['3JN', 'ΙΩΑΝΝΟΥ ΕΠΙΣΤΟΛΗ Γ', '요한삼서'],
  'Jude': ['JUD', 'ΙΟΥΔΑ ΕΠΙΣΤΟΛΗ', '유다서'],
  'Re': ['REV', 'ΑΠΟΚΑΛΥΨΙΣ ΙΩΑΝΝΟΥ', '요한계시록'],
};

async function convert() {
  console.log('Reading XML file...');
  const xmlData = fs.readFileSync('./new-testament.xml', 'utf-8');
  
  console.log('Parsing XML...');
  const parser = new xml2js.Parser({ explicitArray: false });
  const result = await parser.parseStringPromise(xmlData);
  
  const books = [];
  
  for (const bookElem of result.sblgnt.book) {
    const bookId = bookElem.$.id;
    if (!BOOK_MAPPING[bookId]) {
      console.log(`Warning: Unknown book ID: ${bookId}`);
      continue;
    }
    
    const [abbrev, greekName, koreanName] = BOOK_MAPPING[bookId];
    const greekTitle = bookElem.title || greekName;
    
    const chapters = [];
    let currentChapterIdx = -1;
    let currentVerses = [];
    
    const paragraphs = Array.isArray(bookElem.p) ? bookElem.p : [bookElem.p];
    
    for (const pElem of paragraphs) {
      if (!pElem) continue;
      
      const verseNumElem = pElem['verse-number'];
      if (!verseNumElem) continue;
      
      const verseRef = verseNumElem.$.id || '';
      const match = verseRef.match(/.*?\s*(\d+):(\d+)$/);
      if (!match) continue;
      
      const chapterNum = parseInt(match[1]);
      const verseNum = parseInt(match[2]);
      const chapterIdx = chapterNum - 1;
      
      // Build verse text
      let verseText = '';
      if (pElem.w) {
        const words = Array.isArray(pElem.w) ? pElem.w : [pElem.w];
        const suffixes = pElem.suffix ? (Array.isArray(pElem.suffix) ? pElem.suffix : [pElem.suffix]) : [];
        
        for (let i = 0; i < words.length; i++) {
          verseText += words[i];
          if (suffixes[i]) verseText += suffixes[i];
        }
      }
      
      verseText = verseText.replace(/\s+/g, ' ').trim();
      
      if (chapterIdx !== currentChapterIdx) {
        if (currentVerses.length > 0) {
          chapters.push(currentVerses);
        }
        while (chapters.length < chapterIdx) {
          chapters.push([]);
        }
        currentVerses = [];
        currentChapterIdx = chapterIdx;
      }
      
      const verseIdx = verseNum - 1;
      while (currentVerses.length < verseIdx) {
        currentVerses.push('');
      }
      
      if (verseIdx < currentVerses.length) {
        currentVerses[verseIdx] = verseText;
      } else {
        currentVerses.push(verseText);
      }
    }
    
    if (currentVerses.length > 0) {
      chapters.push(currentVerses);
    }
    while (chapters.length > 0 && chapters[chapters.length - 1].length === 0) {
      chapters.pop();
    }
    
    const bookObj = {
      abbrev,
      book: greekTitle,
      korean_name: koreanName,
      chapters
    };
    books.push(bookObj);
    console.log(`Processed: ${koreanName} (${abbrev}) - ${chapters.length} chapters, ${chapters.reduce((a, c) => a + c.length, 0)} verses`);
  }
  
  const output = { books };
  fs.writeFileSync('./public/data/sblgnt.json', JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\nTotal: ${books.length} books converted!`);
  console.log('Output: public/data/sblgnt.json');
}

convert().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
