#!/usr/bin/env node
/**
 * Unified Translation Parser
 * Parses KJV (markdown) and NET (epub) into unified JSON
 * Output: public/data/kjv_bible.json, public/data/net_bible.json
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { parseString } = require('xml2js');

// Book mapping: filename -> abbrev
const bookMapping = {
  // KJV filenames (New Testament only for GNT reader)
  '40 - Matthew - KJV.md': 'MAT',
  '41 - Mark - KJV.md': 'MRK',
  '42 - Luke - KJV.md': 'LUK',
  '43 - John - KJV.md': 'JHN',
  '44 - Acts - KJV.md': 'ACT',
  '45 - Romans - KJV.md': 'ROM',
  '46 - 1 Corinthians - KJV.md': '1CO',
  '47 - 2 Corinthians - KJV.md': '2CO',
  '48 - Galatians - KJV.md': 'GAL',
  '49 - Ephesians - KJV.md': 'EPH',
  '50 - Philippians - KJV.md': 'PHP',
  '51 - Colossians - KJV.md': 'COL',
  '52 - 1 Thessalonians - KJV.md': '1TH',
  '53 - 2 Thessalonians - KJV.md': '2TH',
  '54 - 1 Timothy - KJV.md': '1TI',
  '55 - 2 Timothy - KJV.md': '2TI',
  '56 - Titus - KJV.md': 'TIT',
  '57 - Philemon - KJV.md': 'PHM',
  '58 - Hebrews - KJV.md': 'HEB',
  '59 - James - KJV.md': 'JAS',
  '60 - 1 Peter - KJV.md': '1PE',
  '61 - 2 Peter - KJV.md': '2PE',
  '62 - 1 John - KJV.md': '1JN',
  '63 - 2 John - KJV.md': '2JN',
  '64 - 3 John - KJV.md': '3JN',
  '65 - Jude - KJV.md': 'JUD',
  '66 - Revelation - KJV.md': 'REV',
};

// Parse KJV markdown files
function parseKJV() {
  const kjvDir = path.join(__dirname, '../data/kjv_source');
  const outputDir = path.join(__dirname, '../public/data');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const kjvData = {};
  
  // Process only New Testament files
  const ntFiles = Object.keys(bookMapping);
  
  console.log('📖 Parsing KJV files...');
  
  for (const filename of ntFiles) {
    const filepath = path.join(kjvDir, filename);
    if (!fs.existsSync(filepath)) {
      console.warn(`⚠️ File not found: ${filename}`);
      continue;
    }
    
    const abbrev = bookMapping[filename];
    const content = fs.readFileSync(filepath, 'utf-8');
    
    // Parse chapters and verses
    const lines = content.split('\n');
    let currentChapter = 0;
    
    for (const line of lines) {
      // Match chapter header: "## Matthew Chapter 1" or "## Chapter 1"
      const chapterMatch = line.match(/##\s+(?:\w+\s+)?Chapter\s+(\d+)/i);
      if (chapterMatch) {
        currentChapter = parseInt(chapterMatch[1]);
        continue;
      }
      
      // Match verse: "1 The book of the generation..." or "1 In the beginning..."
      const verseMatch = line.match(/^(\d+)\s+(.+)$/);
      if (verseMatch && currentChapter > 0) {
        const verseNum = parseInt(verseMatch[1]);
        const verseText = verseMatch[2].trim();
        
        const key = `${abbrev}_${currentChapter}_${verseNum}`;
        kjvData[key] = verseText;
      }
    }
    
    console.log(`  ✅ ${abbrev}: ${Object.keys(kjvData).filter(k => k.startsWith(abbrev)).length} verses`);
  }
  
  // Save KJV data
  const kjvOutputPath = path.join(outputDir, 'kjv_bible.json');
  fs.writeFileSync(kjvOutputPath, JSON.stringify(kjvData, null, 2));
  console.log(`\n💾 KJV saved: ${kjvOutputPath} (${Object.keys(kjvData).length} verses total)\n`);
  
  return kjvData;
}

// Parse NET EPUB - Based on actual structure: <h1>Book<br />Chapter X</h1> + <span class="verse">CC:V</span>
async function parseNET() {
  const epubPath = path.join(__dirname, '../data/net_source/NETBIBLE21.epub');
  const outputDir = path.join(__dirname, '../public/data');
  
  if (!fs.existsSync(epubPath)) {
    console.warn('⚠️ NET EPUB not found, skipping NET parsing');
    return {};
  }
  
  console.log('📖 Parsing NET EPUB...');
  
  const netData = {};
  
  // Book name to abbreviation mapping from <h1> title
  const bookNameMap = {
    'Matthew': 'MAT', 'Mark': 'MRK', 'Luke': 'LUK', 'John': 'JHN',
    'Acts': 'ACT', 'Romans': 'ROM', '1 Corinthians': '1CO', '2 Corinthians': '2CO',
    'Galatians': 'GAL', 'Ephesians': 'EPH', 'Philippians': 'PHP', 'Colossians': 'COL',
    '1 Thessalonians': '1TH', '2 Thessalonians': '2TH', '1 Timothy': '1TI', '2 Timothy': '2TI',
    'Titus': 'TIT', 'Philemon': 'PHM', 'Hebrews': 'HEB', 'James': 'JAS',
    '1 Peter': '1PE', '2 Peter': '2PE', '1 John': '1JN', '2 John': '2JN',
    '3 John': '3JN', 'Jude': 'JUD', 'Revelation': 'REV'
  };
  
  try {
    const zip = new AdmZip(epubPath);
    const zipEntries = zip.getEntries();
    
    // Find HTML content files (skip _notes files)
    const htmlFiles = zipEntries.filter(entry => 
      (entry.entryName.endsWith('.html') || entry.entryName.endsWith('.xhtml')) &&
      !entry.entryName.includes('_notes')
    );
    
    console.log(`   Found ${htmlFiles.length} HTML files`);
    
    for (const entry of htmlFiles) {
      const content = entry.getData().toString('utf-8');
      
      // Extract book and chapter from <h1>Book<br />Chapter X</h1>
      const h1Match = content.match(/<h1>(.+?)<br\s*\/?>Chapter\s+(\d+)<\/h1>/i);
      if (!h1Match) continue;
      
      const bookName = h1Match[1].trim();
      const chapterNum = parseInt(h1Match[2]);
      const bookId = bookNameMap[bookName];
      
      if (!bookId) {
        // Skip OT books (not in our map)
        continue;
      }
      
      // Parse verses: format is <span class="verse">CC:V</span> (e.g., "21:1")
      // Followed by verse text until next <span class="verse"> or </p>
      const verseRegex = /<span\s+class=["']verse["']>(\d+):(\d+)<\/span>/gi;
      let verseMatch;
      let verseCount = 0;
      
      while ((verseMatch = verseRegex.exec(content)) !== null) {
        const verseChapter = parseInt(verseMatch[1]);
        const verseNum = parseInt(verseMatch[2]);
        
        // Only process verses from current chapter
        if (verseChapter !== chapterNum) continue;
        
        // Find text after this verse marker
        const versePos = verseMatch.index + verseMatch[0].length;
        let verseText = '';
        
        // Look for text until next verse marker (any chapter:verse) or </p>
        const remainingContent = content.slice(versePos);
        const nextVerseMatch = remainingContent.match(/<span\s+class=["']verse["'>]/);
        const endPos = nextVerseMatch ? nextVerseMatch.index : remainingContent.search(/<\/p>|<span\s+class=["']/);
        
        if (endPos > 0) {
          verseText = remainingContent.slice(0, endPos);
        } else {
          verseText = remainingContent;
        }
        
        // Clean HTML tags and note references
        verseText = verseText
          .replace(/<sup[^>]*>.*?<\/sup>/gi, '') // Remove note references
          .replace(/<[^>]+>/g, ' ')              // Remove HTML tags
          .replace(/\s+/g, ' ')                   // Normalize whitespace
          .trim();
        
        if (verseText && verseNum > 0) {
          const key = `${bookId}_${chapterNum}_${verseNum}`;
          if (!netData[key]) {
            netData[key] = verseText;
            verseCount++;
          }
        }
      }
      
      if (verseCount > 0) {
        console.log(`  ✅ ${bookId} ${chapterNum}: ${verseCount} verses`);
      }
    }
    
    // Save NET data
    const netOutputPath = path.join(outputDir, 'net_bible.json');
    fs.writeFileSync(netOutputPath, JSON.stringify(netData, null, 2));
    console.log(`\n💾 NET saved: ${netOutputPath} (${Object.keys(netData).length} verses total)\n`);
    
  } catch (error) {
    console.error('❌ Error parsing NET EPUB:', error.message);
  }
  
  return netData;
}

// Parse KRV (Korean) markdown files from folder structure
function parseKRV() {
  const krvBaseDir = path.join(__dirname, '../data/krv_source');
  const outputDir = path.join(__dirname, '../public/data');
  
  const krvData = {};
  
  // Book folder mapping: folder name -> abbrev
  const bookFolderMap = {
    '40마태복음': 'MAT', '41마가복음': 'MRK', '42누가복음': 'LUK', '43요한복음': 'JHN',
    '44사도행전': 'ACT', '45로마서': 'ROM', '46고린도전서': '1CO', '47고린도후서': '2CO',
    '48갈라디아서': 'GAL', '49에베소서': 'EPH', '50빌립보서': 'PHP', '51골로새서': 'COL',
    '52데살로니가전서': '1TH', '53데살로니가후서': '2TH', '54디모데전서': '1TI', '55디모데후서': '2TI',
    '56디도서': 'TIT', '57빌레몬서': 'PHM', '58히브리서': 'HEB', '59야고보서': 'JAS',
    '60베드로전서': '1PE', '61베드로후서': '2PE', '62요한1서': '1JN', '63요한2서': '2JN',
    '64요한3서': '3JN', '65유다서': 'JUD', '66요한계시록': 'REV'
  };
  
  console.log('📖 Parsing KRV (개역한글) files...');
  
  for (const [folderName, abbrev] of Object.entries(bookFolderMap)) {
    const bookDir = path.join(krvBaseDir, folderName);
    if (!fs.existsSync(bookDir)) {
      console.warn(`⚠️ Folder not found: ${folderName}`);
      continue;
    }
    
    // Get all .md files in the folder
    const files = fs.readdirSync(bookDir).filter(f => f.endsWith('.md') && f !== `${folderName}.md`);
    
    let bookVerseCount = 0;
    
    for (const filename of files) {
      const filepath = path.join(bookDir, filename);
      const content = fs.readFileSync(filepath, 'utf-8');
      
      // Extract chapter number from filename (e.g., "마1.md" -> 1)
      const chapterMatch = filename.match(/(\d+)/);
      const chapterNum = chapterMatch ? parseInt(chapterMatch[1]) : 0;
      
      if (chapterNum === 0) continue;
      
      // Parse verses: format is "###### N" followed by verse text
      const lines = content.split('\n');
      let currentVerse = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Match verse header: "###### N"
        const verseMatch = line.match(/^######\s+(\d+)/);
        if (verseMatch) {
          currentVerse = parseInt(verseMatch[1]);
          
          // Get verse text from next line
          if (i + 1 < lines.length) {
            const verseText = lines[i + 1].trim();
            if (verseText && currentVerse > 0) {
              const key = `${abbrev}_${chapterNum}_${currentVerse}`;
              krvData[key] = verseText;
              bookVerseCount++;
            }
          }
        }
      }
    }
    
    console.log(`  ✅ ${abbrev}: ${bookVerseCount} verses`);
  }
  
  // Save KRV data
  const krvOutputPath = path.join(outputDir, 'krv_bible.json');
  fs.writeFileSync(krvOutputPath, JSON.stringify(krvData, null, 2));
  console.log(`\n💾 KRV saved: ${krvOutputPath} (${Object.keys(krvData).length} verses total)\n`);
  
  return krvData;
}

// Main execution
async function main() {
  console.log('🚀 Starting Unified Translation Parser...\n');
  
  const kjvData = parseKJV();
  const netData = await parseNET();
  const krvData = parseKRV();
  
  // Summary
  console.log('📊 Summary:');
  console.log(`  KJV: ${Object.keys(kjvData).length} verses`);
  console.log(`  NET: ${Object.keys(netData).length} verses`);
  console.log(`  KRV: ${Object.keys(krvData).length} verses`);
  console.log('\n✅ Build complete!\n');
}

main().catch(console.error);
