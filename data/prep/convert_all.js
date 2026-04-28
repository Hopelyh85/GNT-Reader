const fs = require('fs');
const path = require('path');

const inputDir = __dirname;
const outputBiblePath = path.join(__dirname, '../public/data/parsed_original_bible.json');
const outputLexiconPath = path.join(__dirname, '../public/data/step_lexicon.json');

const bookMap = {
  'Mat': 'MAT', 'Mrk': 'MRK', 'Luk': 'LUK', 'Jhn': 'JHN', 'Act': 'ACT',
  'Rom': 'ROM', '1Co': '1CO', '2Co': '2CO', 'Gal': 'GAL', 'Eph': 'EPH',
  'Php': 'PHP', 'Col': 'COL', '1Th': '1TH', '2Th': '2TH', '1Ti': '1TI',
  '2Ti': '2TI', 'Tit': 'TIT', 'Phm': 'PHM', 'Heb': 'HEB', 'Jas': 'JAS',
  '1Pe': '1PE', '2Pe': '2PE', '1Jn': '1JN', '2Jn': '2JN', '3Jn': '3JN',
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

// 하위 폴더까지 탐색하는 재귀 함수
function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });
  return arrayOfFiles;
}

const allFiles = getAllFiles(inputDir);

allFiles.forEach(filePath => {
  const file = path.basename(filePath);
  if (!file.endsWith('.txt')) return;

  console.log(`Processing: ${file}...`);
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

  // 1. 문법 해독 데이터 (TEGMC, TEHMC)
  if (file.startsWith('TEGMC') || file.startsWith('TEHMC')) {
    lines.forEach(line => {
      if (!line || line.startsWith('=') || line.startsWith('Brief') || line.startsWith('Full') || line.startsWith('\t') || line.startsWith('$')) return;
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const code = parts[0].trim();
        const exp = parts[1].replace('Function=', '').replace(/;/g, ',').trim();
        if (code && exp) morphMap[code] = exp;
      }
    });
  }
  // 2. 사전 데이터 (TBESG, TBESH, TFLSJ)
  else if (file.startsWith('TBESG') || file.startsWith('TBESH') || file.startsWith('TFLSJ')) {
    lines.forEach(line => {
      if (!line || line.startsWith('=') || line.startsWith('T') || line.startsWith('G21') || line.startsWith('H90')) return;
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
  // 3. 성경 본문 (TAGNT, TAHOT)
  else if (file.startsWith('TAGNT') || file.startsWith('TAHOT')) {
    lines.forEach(line => {
      if (!line || line.startsWith('=') || line.startsWith('\t') || line.startsWith('Eng')) return;
      const parts = line.split('\t');
      if (parts.length < 5) return;
      
      const match = parts[0].match(/^([A-Za-z0-9]+)\.(\d+)\.(\d+)/);
      if (!match) return;
      
      const book = bookMap[match[1]] || match[1].toUpperCase();
      const key = `${book}_${match[2]}_${match[3]}`;
      
      const [strong, grammar] = (parts[3] || '=').split('=');
      const [lemma, meaning] = (parts[4] || '=').split('=');

      if (!bibleResult[key]) bibleResult[key] = [];
      bibleResult[key].push({
        word: parts[1].split(' ')[0],
        translit: parts[1].match(/\((.*?)\)/)?.[1] || '',
        translation: parts[2],
        strong: strong || '',
        grammar: grammar || '',
        lemma: lemma || '',
        meaning: meaning || ''
      });
    });
  }
});

// public/data 폴더가 없으면 생성
const publicDataDir = path.join(__dirname, '../public/data');
if (!fs.existsSync(publicDataDir)){
    fs.mkdirSync(publicDataDir, { recursive: true });
}

fs.writeFileSync(outputLexiconPath, JSON.stringify({ lexicon, morphology: morphMap }));
fs.writeFileSync(outputBiblePath, JSON.stringify(bibleResult));
console.log('🎉 성경 본문 및 사전 데이터 파싱 완벽 종료!');
