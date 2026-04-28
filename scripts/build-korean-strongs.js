const fs = require('fs');
const path = require('path');

// 파일 경로 설정 (소장님 환경에 맞춰 절대 경로로 설정하는 것이 안전합니다)
// 파일 이름이 정확히 일치하는지 꼭 확인하세요! (확장자, 띄어쓰기 등)
const greekDictPath = path.resolve(__dirname, '../data/korean_strongs_utf8.txt'); // 헬라어 사전
const hebrewDictPath = path.resolve(__dirname, '../data/korean_strongs_hebrew.txt'); // 히브리어 사전
const outputPath = path.resolve(__dirname, '../public/data/korean_strongs_dict.json');

const finalDict = {};

function parseDictionary(filePath, prefix) {
    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ 경고: 사전 파일을 찾을 수 없습니다 -> ${filePath}`);
        return 0;
    }

    let count = 0;
    const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);

    lines.forEach(line => {
        const trimmed = line.trim();
        // {번호} 로 시작하는 줄만 찾습니다.
        if (!trimmed.startsWith('{')) return;

        // {1} A 아 처음, 첫 번째  -> 여기서 번호와 나머지 텍스트 분리
        const match = trimmed.match(/^\{(\d+)\}\s+(.*)/);
        if (match) {
            // 번호를 4자리로 맞추고 앞에 G 또는 H를 붙임 (예: G0001, H8626)
            const strongNum = prefix + match[1].padStart(4, '0');
            
            // 나머지 텍스트에서 '원어' 부분을 제외하고 '한글 뜻'만 추출
            // 보통 띄어쓰기로 구분되어 있으니, 앞의 원어(A, !Aarwvn 등)와 발음(아)을 적절히 날려줍니다.
            // 텍스트 구조가 워낙 다양해서, 첫 번째 공백 이후의 내용을 통째로 담거나 필요에 따라 자릅니다.
            const parts = match[2].split(/\s+/);
            
            let meaning = match[2]; // 기본값: 원어 포함 전체 텍스트
            
            // 헬라어의 경우: 원어(parts[0]) 발음(parts[1]) 뜻(parts[2]~)
            // 히브리어의 경우: 원어(parts[0]) 뜻(parts[1]~) 일 때가 많음
            if (parts.length >= 2) {
                // 맨 앞의 요상한 영문/기호(원어)를 날림
                meaning = parts.slice(1).join(' ').trim();
            }

            finalDict[strongNum] = meaning;
            count++;
        }
    });
    return count;
}

console.log('🚀 한글 스트롱 사전 통합 변환 시작...');

const greekCount = parseDictionary(greekDictPath, 'G');
console.log(`✅ 헬라어 사전 파싱 완료: ${greekCount} 단어`);

const hebrewCount = parseDictionary(hebrewDictPath, 'H');
console.log(`✅ 히브리어 사전 파싱 완료: ${hebrewCount} 단어`);

if (greekCount > 0 || hebrewCount > 0) {
    // public/data 폴더가 없으면 생성
    const publicDataDir = path.dirname(outputPath);
    if (!fs.existsSync(publicDataDir)) fs.mkdirSync(publicDataDir, { recursive: true });

    fs.writeFileSync(outputPath, JSON.stringify(finalDict, null, 2));
    console.log(`🎉 변환 성공! 총 ${Object.keys(finalDict).length}개의 단어가 ${outputPath}에 저장되었습니다.`);
} else {
    console.error('❌ 에러: 파싱된 단어가 없습니다. 파일 내용이나 파일 경로를 다시 확인해주세요.');
}