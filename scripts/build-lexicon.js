#!/usr/bin/env node
/**
 * Build Lexicon Script
 * Converts strongs-greek-dictionary.js to lexicon.json
 * 
 * Features:
 * - Keys by Greek lemma (not G-numbers)
 * - Accent-stripped variants as additional keys
 * - Common inflected forms pre-mapped
 * - English definitions 100% preserved: [Strongs] + [KJV]
 */

const fs = require('fs');
const path = require('path');

// Helper: Strip accents from Greek words
const stripAccents = (str) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
};

// Helper: Extract first word if comma-separated (for lemmas like "ἄγγελος, ἀγγέλου")
const extractFirstLemma = (lemma) => {
  if (!lemma) return '';
  return lemma.split(',')[0].trim();
};

// Emergency inflection mappings - will be baked into the JSON
const inflectionMap = {
  // Articles
  'τόν': 'ὁ', 'τὴν': 'ὁ', 'τῆς': 'ὁ', 'τοὺς': 'ὁ', 'τῷ': 'ὁ', 'τῶν': 'ὁ',
  'τῇ': 'ὁ', 'τὰ': 'ὁ', 'τὸ': 'ὁ', 'τοῦ': 'ὁ', 'οἱ': 'ὁ', 'αἱ': 'ὁ',
  'ὁ': 'ὁ', 'ἡ': 'ὁ', 'τό': 'ὁ', 'τούς': 'ὁ', 'ταῖς': 'ὁ',
  // Demonstrative pronouns
  'ταῦτα': 'οὗτος', 'τοῦτο': 'οὗτος', 'τούτῳ': 'οὗτος', 'τούτου': 'οὗτος',
  'ταύτην': 'οὗτος', 'ταύτης': 'οὗτος', 'αὕτη': 'οὗτος', 'οὗτοι': 'οὗτος',
  'ἐκείναις': 'ἐκεῖνος', 'ἐκείνῃ': 'ἐκεῖνος',
  // Common verbs
  'ἐστί(ν)': 'εἰμί', 'εἰσίν': 'εἰμί', 'ἦν': 'εἰμί', 'ἦσαν': 'εἰμί',
  // Personal pronouns
  'αὐτῆς': 'αὐτός', 'αὐτοῦ': 'αὐτός', 'αὐτῷ': 'αὐτός', 'αὐτόν': 'αὐτός',
  'αὐτοί': 'αὐτός', 'αὐταί': 'αὐτός', 'αὐτά': 'αὐτός',
  // Emergency common words
  'δέ': 'δέ',
  'Ἰησοῦν': 'Ἰησοῦς', 'Ἰησοῦ': 'Ἰησοῦς', 'Ἰησοῦς': 'Ἰησοῦς',
  'χριστοῦ': 'χριστός', 'χριστόν': 'χριστός', 'χριστός': 'χριστός',
  'θεοῦ': 'θεός', 'θεόν': 'θεός', 'θεός': 'θεός',
  'κυρίου': 'κύριος', 'κύριε': 'κύριος', 'κύριον': 'κύριος',
  'Ἰησοῦν χριστόν': 'Ἰησοῦς χριστός',
  // More articles
  'τοῖς': 'ὁ', 'ταῖς': 'ὁ', 'τήν': 'ὁ'
};

console.log('🔨 Building lexicon.json from strongs-greek-dictionary.js...\n');

// Read source file
const sourcePath = path.join(__dirname, '..', 'data', 'strongs-greek-dictionary.js');
const outputPath = path.join(__dirname, '..', 'public', 'data', 'lexicon.json');

console.log('📖 Reading source:', sourcePath);

let sourceContent;
try {
  sourceContent = fs.readFileSync(sourcePath, 'utf-8');
} catch (err) {
  console.error('❌ Error reading source file:', err.message);
  process.exit(1);
}

// Extract JSON part (remove "var strongsGreekDictionary = " and trailing semicolon)
const jsonStart = sourceContent.indexOf('{');
const jsonEnd = sourceContent.lastIndexOf('}');

if (jsonStart === -1 || jsonEnd === -1) {
  console.error('❌ Could not find JSON object in source file');
  process.exit(1);
}

const jsonString = sourceContent.slice(jsonStart, jsonEnd + 1);

// Parse the dictionary
let strongsDict;
try {
  strongsDict = JSON.parse(jsonString);
} catch (err) {
  console.error('❌ Error parsing JSON:', err.message);
  process.exit(1);
}

console.log('✅ Parsed', Object.keys(strongsDict).length, 'Strong\'s entries');

// Build new lexicon with lemma keys
const lexicon = {};
let entryCount = 0;
let accentVariants = 0;
let inflectionVariants = 0;

for (const [gNumber, entry] of Object.entries(strongsDict)) {
  const lemma = extractFirstLemma(entry.lemma);
  
  if (!lemma) {
    console.warn('⚠️  Skipping', gNumber, '- no lemma found');
    continue;
  }

  // Build definition with both Strong's and KJV
  const strongsDef = entry.strongs_def || '';
  const kjvDef = entry.kjv_def || '';
  const definition = `[Strongs] ${strongsDef.trim()}\n[KJV] ${kjvDef.trim()}`;

  const lexiconEntry = {
    strongs: gNumber,
    lemma: lemma,
    transliteration: entry.translit || '',
    definition: definition,
    derivation: entry.derivation || ''
  };

  // Primary key: the lemma itself
  if (!lexicon[lemma]) {
    lexicon[lemma] = lexiconEntry;
    entryCount++;
  }

  // Secondary key: accent-stripped version
  const stripped = stripAccents(lemma);
  if (stripped !== lemma && !lexicon[stripped]) {
    lexicon[stripped] = lexiconEntry;
    accentVariants++;
  }

  // Check if this lemma has inflected forms we should map
  for (const [inflected, baseLemma] of Object.entries(inflectionMap)) {
    if (baseLemma === lemma && !lexicon[inflected]) {
      lexicon[inflected] = lexiconEntry;
      inflectionVariants++;
    }
  }
}

// Also add all inflection mappings that didn't get caught above
for (const [inflected, baseLemma] of Object.entries(inflectionMap)) {
  if (lexicon[baseLemma] && !lexicon[inflected]) {
    lexicon[inflected] = lexicon[baseLemma];
    inflectionVariants++;
  }
}

console.log('✅ Created', entryCount, 'primary lemma entries');
console.log('✅ Added', accentVariants, 'accent-stripped variants');
console.log('✅ Added', inflectionVariants, 'inflected form variants');
console.log('📊 Total keys in lexicon:', Object.keys(lexicon).length);

// Ensure output directory exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write output
fs.writeFileSync(outputPath, JSON.stringify(lexicon, null, 2), 'utf-8');

console.log('\n🎉 Successfully built:', outputPath);
console.log('💾 File size:', (fs.statSync(outputPath).size / 1024).toFixed(2), 'KB');

// Sample output for verification
console.log('\n📋 Sample entries:');
const samples = ['Ἰησοῦς', 'χριστός', 'θεός', 'ὁ', 'οὗτος'];
samples.forEach(key => {
  if (lexicon[key]) {
    console.log(`  ${key}: ${lexicon[key].definition.substring(0, 60)}...`);
  }
});
