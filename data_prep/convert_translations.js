const fs = require('fs');
const path = require('path');

// 🌟 정확한 데이터 폴더 경로 지정
const KRV_DIR = path.resolve(__dirname, '../data/krv_source');
const KJV_DIR = path.resolve(__dirname, '../data/kjv_source');
const OUT_DIR = path.resolve(__dirname, '../public/data');

const KRV_MAP = {
  '창세기': 'GEN', '출애굽기': 'EXO', '레위기': 'LEV', '민수기': 'NUM', '신명기': 'DEU', '여호수아': 'JOS', '사사기': 'JDG', '룻기': 'RUT', '사무엘상': '1SA', '사무엘하': '2SA', '열왕기상': '1KI', '열왕기하': '2KI', '역대기상': '1CH', '역대기하': '2CH', '에스라': 'EZR', '느헤미야': 'NEH', '에스더': 'EST', '욥기': 'JOB', '시편': 'PSA', '잠언': 'PRO', '전도서': 'ECC', '아가': 'SNG', '이사야': 'ISA', '예레미야': 'JER', '예레미야애가': 'LAM', '에스겔': 'EZK', '다니엘': 'DAN', '호세아': 'HOS', '요엘': 'JOL', '아모스': 'AMO', '오바댜': 'OBA', '요나': 'JON', '미가': 'MIC', '나훔': 'NAM', '하박국': 'HAB', '스바냐': 'ZEP', '학개': 'HAG', '스가랴': 'ZEC', '말라기': 'MAL',
  '마태복음': 'MAT', '마가복음': 'MRK', '누가복음': 'LUK', '요한복음': 'JHN', '사도행전': 'ACT', '로마서': 'ROM', '고린도전서': '1CO', '고린도후서': '2CO', '갈라디아서': 'GAL', '에베소서': 'EPH', '빌립보서': 'PHP', '골로새서': 'COL', '데살로니가전서': '1TH', '데살로니가후서': '2TH', '디모데전서': '1TI', '디모데후서': '2TI', '디도서': 'TIT', '빌레몬서': 'PHM', '히브리서': 'HEB', '야고보서': 'JAS', '베드로전서': '1PE', '베드로후서': '2PE', '요한1서': '1JN', '요한2서': '2JN', '요한3서': '3JN', '유다서': 'JUD', '요한계시록': 'REV'
};

const KJV_MAP = {
  'Genesis': 'GEN', 'Exodus': 'EXO', 'Leviticus': 'LEV', 'Numbers': 'NUM', 'Deuteronomy': 'DEU', 'Joshua': 'JOS', 'Judges': 'JDG', 'Ruth': 'RUT', '1 Samuel': '1SA', '2 Samuel': '2SA', '1 Kings': '1KI', '2 Kings': '2KI', '1 Chronicles': '1CH', '2 Chronicles': '2CH', 'Ezra': 'EZR', 'Nehemiah': 'NEH', 'Esther': 'EST', 'Job': 'JOB', 'Psalms': 'PSA', 'Proverbs': 'PRO', 'Ecclesiastes': 'ECC', 'The Song of Solomon': 'SNG', 'Song of Solomon': 'SNG', 'Isaiah': 'ISA', 'Jeremiah': 'JER', 'Lamentations': 'LAM', 'Ezekiel': 'EZK', 'Daniel': 'DAN', 'Hosea': 'HOS', 'Joel': 'JOL', 'Amos': 'AMO', 'Obadiah': 'OBA', 'Jonah': 'JON', 'Micah': 'MIC', 'Nahum': 'NAM', 'Habakkuk': 'HAB', 'Zephaniah': 'ZEP', 'Haggai': 'HAG', 'Zechariah': 'ZEC', 'Malachi': 'MAL',
  'Matthew': 'MAT', 'Mark': 'MRK', 'Luke': 'LUK', 'John': 'JHN', 'Acts': 'ACT', 'Romans': 'ROM', '1 Corinthians': '1CO', '2 Corinthians': '2CO', 'Galatians': 'GAL', 'Ephesians': 'EPH', 'Philippians': 'PHP', 'Colossians': 'COL', '1 Thessalonians': '1TH', '2 Thessalonians': '2TH', '1 Timothy': '1TI', '2 Timothy': '2TI', 'Titus': 'TIT', 'Philemon': 'PHM', 'Hebrews': 'HEB', 'James': 'JAS', '1 Peter': '1PE', '2 Peter': '2PE', '1 John': '1JN', '2 John': '2JN', '3 John': '3JN', 'Jude': 'JUD', 'Revelation': 'REV'
};

function parseKRV() {
    console.log('\n📖 Parsing KRV (개역한글)...');
    const result = {};
    if (!fs.existsSync(KRV_DIR)) {
        console.log(`⚠️ KRV source not found at: ${KRV_DIR}`);
        return result;
    }

    let total = 0;
    const folders = fs.readdirSync(KRV_DIR).filter(f => /^\d{2}/.test(f));
    for (const folder of folders) {
        // 맥OS 한글 자음모음 분리(NFD) 현상 해결을 위해 .normalize('NFC') 추가!
        const bookNameKr = folder.replace(/^\d{2}/, '').trim().normalize('NFC');
        const bookCode = KRV_MAP[bookNameKr];
        if (!bookCode) continue;

        const bookPath = path.join(KRV_DIR, folder);
        const chapterFiles = fs.readdirSync(bookPath).filter(f => f.endsWith('.md'));

        for (const file of chapterFiles) {
            const chapterMatch = file.match(/(\d+)/);
            if (!chapterMatch) continue;
            const chapter = chapterMatch[1];

            const content = fs.readFileSync(path.join(bookPath, file), 'utf-8');
            const lines = content.split('\n');

            let currentVerse = null;
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                const verseMatch = line.match(/^######\s+(\d+)/);

                if (verseMatch) {
                    currentVerse = verseMatch[1];
                } else if (currentVerse && line.length > 0 && !line.startsWith('||') && !line.startsWith('***') && !line.startsWith('#')) {
                    const cleanLine = line.replace(/\[\[.*?\]\]/g, '').replace(/<[^>]*>/g, '').trim();
                    if (cleanLine) {
                        result[`${bookCode}_${chapter}_${currentVerse}`] = cleanLine;
                        total++;
                    }
                    currentVerse = null;
                }
            }
        }
        console.log(`  ✅ ${bookNameKr} (${bookCode}): parsed`);
    }
    console.log(`📊 KRV Total: ${total} verses`);
    return result;
}

function parseKJV() {
    console.log('\n📖 Parsing KJV...');
    const result = {};
    if (!fs.existsSync(KJV_DIR)) {
        console.log(`⚠️ KJV source not found at: ${KJV_DIR}`);
        return result;
    }

    let total = 0;
    const files = fs.readdirSync(KJV_DIR).filter(f => f.endsWith('.md'));
    for (const file of files) {
        const nameMatch = file.match(/^\d+\s*-\s*(.+?)\s*-\s*KJV/i);
        if (!nameMatch) continue;
        let bookNameEn = nameMatch[1].trim();
        const bookCode = KJV_MAP[bookNameEn];
        if (!bookCode) continue;

        const content = fs.readFileSync(path.join(KJV_DIR, file), 'utf-8');
        const lines = content.split('\n');

        let currentChapter = null;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const chapterMatch = line.match(/^##\s+.*?Chapter\s+(\d+)/i);

            if (chapterMatch) {
                currentChapter = chapterMatch[1];
            } else if (currentChapter) {
                const verseMatch = line.match(/^(\d+)\s+(.+)/);
                if (verseMatch) {
                    const verseNum = verseMatch[1];
                    const text = verseMatch[2].trim();
                    result[`${bookCode}_${currentChapter}_${verseNum}`] = text;
                    total++;
                }
            }
        }
        console.log(`  ✅ ${bookNameEn} (${bookCode}): parsed`);
    }
    console.log(`📊 KJV Total: ${total} verses`);
    return result;
}

function parseNET() {
    console.log('\n📖 NET Bible parsing temporarily disabled.');
    console.log('   Will be implemented with pre-extracted JSON later.');
    return {};
}

function main() {
    console.log('==========================================');
    console.log('📚 Translation Bible Converter (Mac Fix)');
    console.log('==========================================');

    if (!fs.existsSync(OUT_DIR)) {
        fs.mkdirSync(OUT_DIR, { recursive: true });
    }

    const krvData = parseKRV();
    fs.writeFileSync(path.join(OUT_DIR, 'krv_bible.json'), JSON.stringify(krvData));

    const kjvData = parseKJV();
    fs.writeFileSync(path.join(OUT_DIR, 'kjv_bible.json'), JSON.stringify(kjvData));

    const netData = parseNET();
    fs.writeFileSync(path.join(OUT_DIR, 'net_bible.json'), JSON.stringify(netData));

    console.log('\n==========================================');
    console.log('🎉 Conversion complete! All JSONs saved.');
    console.log('==========================================');
}

main();