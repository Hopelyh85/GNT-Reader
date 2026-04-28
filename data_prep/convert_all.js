const fs = require('fs');
const path = require('path');

const inputDir = path.resolve(__dirname, '../data/prep');
const outputBiblePath = path.resolve(__dirname, '../public/data/parsed_original_bible.json');
const outputLexiconPath = path.resolve(__dirname, '../public/data/step_lexicon.json');

const bookMap = { 'Mat': 'MAT', 'Mrk': 'MRK', 'Luk': 'LUK', 'Jhn': 'JHN', 'Act': 'ACT', 'Rom': 'ROM', '1Co': '1CO', '2Co': '2CO', 'Gal': 'GAL', 'Eph': 'EPH', 'Php': 'PHP', 'Col': 'COL', '1Th': '1TH', '2Th': '2TH', '1Ti': '1TI', '2Ti': '2TI', 'Tit': 'TIT', 'Phm': 'PHM', 'Heb': 'HEB', 'Jas': 'JAS', '1Pe': '1PE', '2Pe': '2PE', '1Jn': '1JN', '2Jn': '2JN', '3Jn': '3JN', 'Jud': 'JUD', 'Rev': 'REV', 'Gen': 'GEN', 'Exo': 'EXO', 'Lev': 'LEV', 'Num': 'NUM', 'Deu': 'DEU', 'Jos': 'JOS', 'Jdg': 'JDG', 'Rut': 'RUT', '1Sa': '1SA', '2Sa': '2SA', '1Ki': '1KI', '2Ki': '2KI', '1Ch': '1CH', '2Ch': '2CH', 'Ezr': 'EZR', 'Neh': 'NEH', 'Est': 'EST', 'Job': 'JOB', 'Psa': 'PSA', 'Pro': 'PRO', 'Ecc': 'ECC', 'Sng': 'SNG', 'Isa': 'ISA', 'Jer': 'JER', 'Lam': 'LAM', 'Ezk': 'EZK', 'Dan': 'DAN', 'Hos': 'HOS', 'Jol': 'JOL', 'Amo': 'AMO', 'Oba': 'OBA', 'Jon': 'JON', 'Mic': 'MIC', 'Nam': 'NAM', 'Hab': 'HAB', 'Zep': 'ZEP', 'Hag': 'HAG', 'Zec': 'ZEC', 'Mal': 'MAL' };

const bibleResult = {};
const lexicon = {};
const morphMap = {};

function getAllFiles(dirPath, arrayOfFiles) {
  if (!fs.existsSync(dirPath)) return [];
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });
  return arrayOfFiles;
}

console.log('🚀 [초강력 파싱 엔진] 가동을 시작합니다!');
const allFiles = getAllFiles(inputDir);
let totalVerses = 0;

allFiles.forEach(filePath => {
  const file = path.basename(filePath);
  if (!file.endsWith('.txt')) return;

  if (file.startsWith('TBESG') || file.startsWith('TBESH') || file.startsWith('TFLSJ')) {
      const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
      lines.forEach(line => {
          const parts = line.split('\t');
          if (parts.length < 5) return;
          const match = parts[0].match(/([GH]\d+[A-Za-z]*)/);
          if (!match) return;
          const strong = match[1];
          if (!lexicon[strong]) lexicon[strong] = { strong, word: '', translit: '', brief_def: '', full_def: '' };
          if (file.startsWith('TBE')) {
              lexicon[strong].word = parts[3] || lexicon[strong].word;
              lexicon[strong].translit = parts[4] || lexicon[strong].translit;
              lexicon[strong].brief_def = parts[6] || lexicon[strong].brief_def;
          } else if (file.startsWith('TFLSJ')) {
              lexicon[strong].full_def = parts[6] || parts[5] || lexicon[strong].full_def;
          }
      });
  }
  
  if (file.startsWith('TAGNT') || file.startsWith('TAHOT')) {
    console.log(`📖 본문 파싱 중: ${file}`);
    const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('=') || trimmed.startsWith('TAGNT') || trimmed.startsWith('TAHOT') || trimmed.startsWith('Word') || trimmed.startsWith('(')) return;

      const parts = trimmed.split('\t');
      if (parts.length < 5) return;

      const refMatch = parts[0].match(/^([A-Za-z]+)\.(\d+)\.(\d+)/);
      if (!refMatch) return;

      const rawBook = refMatch[1];
      const book = bookMap[rawBook] || rawBook.toUpperCase();
      const chap = refMatch[2];
      const verse = refMatch[3];

      if (!bibleResult[book]) bibleResult[book] = {};
      if (!bibleResult[book][chap]) bibleResult[book][chap] = {};
      if (!bibleResult[book][chap][verse]) bibleResult[book][chap][verse] = [];

      let wordText = '';
      let translitText = '';
      if (parts[1]) {
          const wordParts = parts[1].split(' (');
          wordText = wordParts[0].trim();
          if (wordParts[1]) translitText = wordParts[1].replace(')', '').trim();
      }

      const strongParts = (parts[3] || '').split('=');
      const lemmaParts = (parts[4] || '').split('=');

      bibleResult[book][chap][verse].push({
        word: wordText,
        translit: translitText,
        translation: parts[2] || '',
        strong: strongParts[0] || '',
        grammar: strongParts[1] || '',
        lemma: lemmaParts[0] || '',
        meaning: lemmaParts[1] || ''
      });
      totalVerses++;
    });
  }
});

const publicDataDir = path.dirname(outputBiblePath);
if (!fs.existsSync(publicDataDir)) fs.mkdirSync(publicDataDir, { recursive: true });

fs.writeFileSync(outputBiblePath, JSON.stringify(bibleResult));
fs.writeFileSync(outputLexiconPath, JSON.stringify({ lexicon, morphology: morphMap }));

console.log('\n==========================================');
console.log(`✅ 데이터 통합 완벽 성공!`);
console.log(`📊 추출된 성경 단어 총합: ${totalVerses}개`);
console.log(`📊 생성된 성경 권수: ${Object.keys(bibleResult).length}권`);
console.log('==========================================\n');
