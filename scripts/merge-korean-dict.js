#!/usr/bin/env node
/**
 * Korean Strong's Dictionary Merger
 * Merges Korean definitions from data/korean_strongs.txt into public/data/lexicon.json
 * 
 * Input format: {N} greek_word pronunciation KOREAN_DEFINITION
 * Example: {5586} yh'fo" 프셉호스 판정, 표, 투표, 돌
 */

const fs = require('fs');
const path = require('path');

function main() {
  console.log('🚀 Starting Korean Dictionary Merge...\n');
  
  // File paths - Use UTF-8 converted file
  const koreanFile = path.join(__dirname, '../data/korean_strongs_utf8.txt');
  const lexiconFile = path.join(__dirname, '../public/data/lexicon.json');
  
  // Check files exist
  if (!fs.existsSync(koreanFile)) {
    console.error('❌ Korean strongs file not found:', koreanFile);
    process.exit(1);
  }
  
  if (!fs.existsSync(lexiconFile)) {
    console.error('❌ Lexicon file not found:', lexiconFile);
    process.exit(1);
  }
  
  // Read Korean dictionary
  console.log('📖 Reading Korean dictionary...');
  const koreanContent = fs.readFileSync(koreanFile, 'utf-8');
  const koreanLines = koreanContent.split('\n');
  
  // Parse Korean entries: {N} ... KOREAN_PRON KOREAN_DEF
  // Store as object with pronunciation and definition separated
  const koreanMap = new Map(); // strongsNumber -> {pronunciation, definition}
  
  for (const line of koreanLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Match pattern: {N} at the beginning
    const numberMatch = trimmed.match(/^\{(\d+)\}/);
    if (!numberMatch) continue;
    
    const strongsNum = parseInt(numberMatch[1]);
    
    // Remove the number prefix {N}
    let remaining = trimmed.replace(/^\{\d+\}\s*/, '');
    
    // Extract Korean content (from first Hangul to end)
    const hangulMatch = remaining.match(/[\uAC00-\uD7A3]/);
    if (!hangulMatch) continue;
    
    const hangulStart = hangulMatch.index;
    let koreanFull = remaining.substring(hangulStart).trim();
    
    // Clean up trailing non-Korean characters
    koreanFull = koreanFull.replace(/[^\uAC00-\uD7A3\u3131-\u318E\s,\.]+$/, '');
    
    if (koreanFull && koreanFull.length > 0 && /[\u3131-\u318E\uAC00-\uD7A3]/.test(koreanFull)) {
      // Split: first word is pronunciation, rest is definition
      const parts = koreanFull.split(/\s+/);
      const koreanPron = parts[0]; // First word: pronunciation
      const koreanDef = parts.slice(1).join(' ').trim(); // Rest: actual definition
      
      // Store both pronunciation and definition
      const data = {
        pronunciation: koreanPron,
        definition: koreanDef || koreanPron // Fallback if no separate definition
      };
      
      koreanMap.set(`G${strongsNum}`, data);
      koreanMap.set(`G0${strongsNum}`, data);
      koreanMap.set(String(strongsNum), data);
    }
  }
  
  console.log(`   Extracted ${koreanMap.size / 3} Korean entries (with pronunciation)`);
  
  // Read lexicon
  console.log('\n📖 Reading lexicon.json...');
  const lexiconContent = fs.readFileSync(lexiconFile, 'utf-8');
  const lexicon = JSON.parse(lexiconContent);
  
  // Merge Korean definitions and pronunciations
  console.log('\n🔀 Merging Korean definitions...');
  let mergedCount = 0;
  let notFound = [];
  
  for (const [greekWord, entry] of Object.entries(lexicon)) {
    if (!entry.strongs) continue;
    
    // Try to find Korean data
    const strongsNum = entry.strongs.replace(/^G0*/, ''); // Remove G and leading zeros
    const koreanData = koreanMap.get(entry.strongs) || 
                      koreanMap.get(`G${strongsNum}`) ||
                      koreanMap.get(`G0${strongsNum}`);
    
    if (koreanData) {
      entry.korean_pron = koreanData.pronunciation;
      entry.korean_def = koreanData.definition;
      mergedCount++;
    } else {
      notFound.push(entry.strongs);
    }
  }
  
  // Save updated lexicon
  console.log('\n💾 Saving updated lexicon...');
  fs.writeFileSync(lexiconFile, JSON.stringify(lexicon, null, 2));
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Total lexicon entries: ${Object.keys(lexicon).length}`);
  console.log(`   Korean definitions added: ${mergedCount}`);
  console.log(`   Missing Korean definitions: ${notFound.length}`);
  
  if (notFound.length > 0 && notFound.length <= 20) {
    console.log(`   Missing: ${notFound.join(', ')}`);
  }
  
  console.log('\n✅ Merge complete!\n');
}

main();
