const fs = require('fs');
const path = require('path');

// 🌟 소장님의 구조에 맞게 경로를 강제로 지정합니다.
// data_prep 폴더에서 한 칸 위로 간 뒤, data/prep 폴더로 들어갑니다.
const inputDir = path.resolve(__dirname, '../data/prep'); 
const outputBiblePath = path.resolve(__dirname, '../public/data/parsed_original_bible.json');
const outputLexiconPath = path.resolve(__dirname, '../public/data/step_lexicon.json');

console.log('------------------------------------------');
console.log('🔍 검사 시작 위치:', inputDir);

const bookMap = {
  'Mat': 'MAT', 'Mrk': 'MRK', 'Luk': 'LUK', 'Jhn': 'JHN', 'Act': 'ACT',
  'Rom': 'ROM', '1Co': '1CO', '2Co': '2CO', 'Gal': 'GAL', 'Eph': 'EPH',
  'Php': 'PHP', 'Col': 'COL', '1Th': '1TH', '2Th': '2TH', '1Ti': '1TI',
  '2Ti': '2TI', 'Tit': 'TIT', 'Phm': 'PHM', 'Heb': 'HEB', 'Jas': 'JAS',
  '1Pe': '1PE', '2Pe': '2PE', '1Jn': '1JN', '2Jn': '2Jn', '3Jn': '3JN',
  'Jud': 'JUD', 'Rev': 'REV',
  'Gen': 'GEN', 'Exo': 'EXO', 'Lev': 'LEV', 'Num': 'NUM', 'Deu': 'DEU',
  'Jos': 'JOS', 'Jdg': 'JDG', 'Rut': 'RUT', '1Sa': '1SA', '2Sa': '2SA',
  '1Ki': '1KI', '2Ki': '2KI', '1Ch': '1CH', '2Ch': '2CH', 'Ezr': 'EZR',
  'Neh': 'NEH', 'Est': 'EST', 'Job': 'JOB', 'Psa': 'PSA', 'Pro': 'PRO',
  'Ecc': 'ECC', 'Sng': 'SNG', 'Isa': 'ISA', 'Jer': 'JER', 'Lam': 'LAM',
  'Ezk': 'EZK', 'Dan': 'DAN', 'Hos': 'HOS', 'Jol': 'JOL', 'Amo': 'AMO',
  'Oba': 'OBA', 'Jon': 'JON', 'Mic': 'MIC', 'Nam': 'NAM', 'Hab': 'HAB',
  'Zep': 'ZEP', 'Hag': 'HAG', 'Zec': 'ZEC', 'Mal': 'MAL'
};

const bibleResult = {};
const lexicon = {};
const morphMap = {};

// 하위 폴더까지 찾는 재귀 함수
function getAllFiles(dirPath, arrayOfFiles) {
  if (!fs.existsSync(dirPath)) {
    console.error(`❌ 에러: 폴더를 찾을 수 없습니다 -> ${dirPath}`);
    return [];
  }
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

const allFiles = getAllFiles(inputDir);
console.log(`📂 발견된 파일 개수: ${allFiles.length}개`);

if (allFiles.length === 0) {
  console.log('⚠️ 주의: 파일을 하나도 찾지 못했습니다. data/prep 폴더의 위치를 확인하세요.');
}

allFiles.forEach(filePath => {
  const file = path.basename(filePath);
  if (!file.endsWith('.txt')) return;

  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

  if (file.startsWith('TBESG') || file.startsWith('TBESH') || file.startsWith('TFLSJ')) {
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
  else if (file.startsWith('TAGNT') || file.startsWith('TAHOT')) {
    lines.forEach(line => {
      if (!line || line.startsWith('=') || line.startsWith('\t')) return;
      const parts = line.split('\t');
      if (parts.length < 5) return;
      
      const match = parts[0].match(/^([A-Za-z0-9]+)\.(\d+)\.(\d+)/);
      if (!match) return;
      
      const book = bookMap[match[1]] || match[1].toUpperCase();
      const chap = match[2];
      const verse = match[3];

      if (!bibleResult[book]) bibleResult[book] = {};
      if (!bibleResult[book][chap]) bibleResult[book][chap] = {};
      if (!bibleResult[book][chap][verse]) bibleResult[book][chap][verse] = [];
      
      bibleResult[book][chap][verse].push({
        word: parts[1].split(' ')[0],
        translit: parts[1].match(/\((.*?)\)/)?.[1] || '',
        translation: parts[2],
        strong: (parts[3] || '').split('=')[0],
        grammar: (parts[3] || '').split('=')[1] || '',
        lemma: (parts[4] || '').split('=')[0] || '',
        meaning: (parts[4] || '').split('=')[1] || ''
      });
    });
  }
});

// 결과 저장
const publicDataDir = path.dirname(outputBiblePath);
if (!fs.existsSync(publicDataDir)) fs.mkdirSync(publicDataDir, { recursive: true });

fs.writeFileSync(outputLexiconPath, JSON.stringify({ lexicon, morphology: morphMap }));
fs.writeFileSync(outputBiblePath, JSON.stringify(bibleResult));

console.log(`✅ 생성된 성경 데이터: ${Object.keys(bibleResult).length}권`);
console.log('🎉 파싱 작업이 완료되었습니다!');
console.log('------------------------------------------');