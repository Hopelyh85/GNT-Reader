/**
 * Build Korean Strongs Dictionary JSON
 * Converts korean_strongs.txt (Greek) and korean_strongs_hebrew.txt to korean_strongs_dict.json
 * Output format: { "G0001": "한글 뜻", "H0001": "한글 뜻", ... }
 */

const fs = require('fs');
const path = require('path');

// Parse Greek Strongs file
function parseGreekFile(content) {
  const result = {};
  // Handle both \n and \r\n line endings
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    // Trim whitespace and \r characters
    const line = rawLine.trim();
    // Match pattern: {number} transliteration korean_meaning
    // Example: {1} A 아 처음, 첫 번째
    // Handle special cases like {19} a, {19} b (variants)
    const match = line.match(/^\{(\d+)\}(?:\s+[a-z])?\s+(\S+)\s+(.+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      const strongCode = `G${num.toString().padStart(4, '0')}`;
      const koreanDef = match[3].trim();
      result[strongCode] = koreanDef;
    }
  }

  return result;
}

// Parse Hebrew Strongs file
function parseHebrewFile(content) {
  const result = {};
  // Handle both \n and \r\n line endings
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    // Trim whitespace and \r characters
    const line = rawLine.trim();
    // Match pattern: {number} transliteration korean_meaning
    // Hebrew file may have different format with Hebrew letters
    // Handle special cases like {19} a, {19} b (variants)
    const match = line.match(/^\{(\d+)\}(?:\s+[a-z])?\s+(\S+)\s+(.+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      const strongCode = `H${num.toString().padStart(4, '0')}`;
      const koreanDef = match[3].trim();
      result[strongCode] = koreanDef;
    }
  }

  return result;
}

function main() {
  const dataDir = path.join(__dirname, '..', 'data');
  const publicDataDir = path.join(__dirname, '..', 'public', 'data');

  // Ensure public/data directory exists
  if (!fs.existsSync(publicDataDir)) {
    fs.mkdirSync(publicDataDir, { recursive: true });
  }

  // Read and parse Greek file (use UTF-8 version)
  const greekFile = path.join(dataDir, 'korean_strongs_utf8.txt');
  let greekData = {};
  if (fs.existsSync(greekFile)) {
    const greekContent = fs.readFileSync(greekFile, 'utf-8');
    greekData = parseGreekFile(greekContent);
    console.log(`✅ Parsed ${Object.keys(greekData).length} Greek entries`);
  } else {
    // Fallback to original file
    const greekFileOrig = path.join(dataDir, 'korean_strongs.txt');
    if (fs.existsSync(greekFileOrig)) {
      const greekContent = fs.readFileSync(greekFileOrig, 'utf-8');
      greekData = parseGreekFile(greekContent);
      console.log(`✅ Parsed ${Object.keys(greekData).length} Greek entries (from original file)`);
    } else {
      console.log('⚠️  Greek file not found');
    }
  }

  // Read and parse Hebrew file
  const hebrewFile = path.join(dataDir, 'korean_strongs_hebrew.txt');
  let hebrewData = {};
  if (fs.existsSync(hebrewFile)) {
    const hebrewContent = fs.readFileSync(hebrewFile, 'utf-8');
    hebrewData = parseHebrewFile(hebrewContent);
    console.log(`✅ Parsed ${Object.keys(hebrewData).length} Hebrew entries`);
  } else {
    console.log('⚠️  Hebrew file not found:', hebrewFile);
  }

  // Merge both dictionaries
  const mergedData = { ...greekData, ...hebrewData };

  // Write output
  const outputFile = path.join(publicDataDir, 'korean_strongs_dict.json');
  fs.writeFileSync(outputFile, JSON.stringify(mergedData, null, 2), 'utf-8');

  console.log(`✅ Created korean_strongs_dict.json with ${Object.keys(mergedData).length} total entries`);
  console.log(`📁 Output: ${outputFile}`);

  // Show sample entries
  const sampleKeys = Object.keys(mergedData).slice(0, 5);
  console.log('\n📋 Sample entries:');
  sampleKeys.forEach(key => {
    console.log(`  ${key}: ${mergedData[key].substring(0, 50)}...`);
  });
}

main();
