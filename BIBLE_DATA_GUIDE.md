# 성경 번역본 데이터 수집 가이드 (Bible Translation Data Guide)

## 📊 현재 상태

**생성된 파일**: `gnt_master_data_final.csv`
- 총 단어: 137,554개 (신약 27권)
- 총 절(verse): 7,927개
- NET 영어: 6개 절 샘플 데이터 적용
- 개역한글(KRV): 6개 절 샘플 데이터 적용

## 🎯 목표

모든 7,927개 절에 대해 다음을 채워야 함:
1. **krv**: 개역한글 (Korean Revised Version)
2. **net**: NET Bible (New English Translation)

## 📥 데이터 소스

### 1. NET Bible (영어)

#### 옵션 A: NET Bible Labs API (무료, 속도제한)
```bash
# 예시 API 호출
curl "https://labs.bible.org/api/?passage=Matthew+1:1&formatting=plain&type=json"
```

**스크립트**: `download_bibles.py` (이미 생성됨)
- 6개 샘플 절만 가져옴 (API 속도 제한)
- 전체 7,927절을 가져오려면 반복 호출 필요

#### 옵션 B: Open Bible Database (권장)
```bash
# GitHub에서 클론
git clone https://github.com/scrollmapper/bible_databases.git
cd bible_databases/csv

# NET Bible 찾기
ls -la | grep -i net
```

### 2. 개역한글 (KRV)

#### 옵션 A: 한국성경공회 (Bible Society of Korea)
- https://www.bsk.or.kr/
- 정식 데이터 사용 허가 필요

#### 옵션 B: Open Bible Korean (GitHub)
```bash
# 클론
git clone https://github.com/wlghks/openbible.git

# KRV 데이터 확인
cd openbible/bibles
ls -la
```

## 🔧 데이터 변환 및 병합

### JSON 형식

번역 데이터는 다음 JSON 형식으로 준비:

```json
{
  "MAT_1_1": "아브라함과 다윗의 자손 예수 그리스도의 족보",
  "MAT_1_2": "아브라함이 이삭을 낳고, 이삭은 야곱을 낳고...",
  "JHN_3_16": "하나님이 세상을 이처럼 사랑하사...",
  ...
}
```

키 형식: `{BOOK}_{chapter}_{verse}`
- BOOK: MAT, MRK, LUK, JHN, ACT, ROM, 1CO, 2CO, ...
- chapter: 1, 2, 3, ...
- verse: 1, 2, 3, ...

### 병합 절차

1. **번역 데이터 준비**:
   ```bash
   # krv_data.json 생성 (개역한글)
   # net_data.json 생성 (NET)
   ```

2. **병합 실행**:
   ```bash
   python3 merge_translations.py
   ```

3. **결과 확인**:
   ```bash
   # 통계 출력
   python3 -c "
   import csv
   with open('gnt_master_data_final.csv') as f:
       r = csv.DictReader(f)
       data = list(r)
       krv = sum(1 for x in data if x['krv'])
       net = sum(1 for x in data if x['net'])
       print(f'KRV: {krv}/{len(data)} ({krv/len(data)*100:.1f}%)')
       print(f'NET: {net}/{len(data)} ({net/len(data)*100:.1f}%)')
   "
   ```

## 🚀 빠른 시작 (템플릿 사용)

### 1. 템플릿 파일 확인
```bash
ls -la *.json
# krv_template.json (7,927개 빈 항목)
# net_template.json (7,927개 빈 항목)
```

### 2. 템플릿 편집
```bash
# krv_template.json을 열어 각 절에 번역 입력
# 예시:
{
  "MAT_1_1": "아브라함과 다윗의 자손 예수 그리스도의 족보",
  "MAT_1_2": "아브라함이 이삭을 낳고...",
  ...
}
```

### 3. 병합
```bash
# 템플릿을 데이터 파일로 복사
cp krv_template.json krv_data.json
cp net_template.json net_data.json

# 병합 실행
python3 merge_translations.py
```

## 📋 CSV 구조

`gnt_master_data_final.csv`:

| 컬럼 | 설명 | 예시 |
|------|------|------|
| book | 책 약어 | MAT, MRK, LUK... |
| chapter | 장 번호 | 1, 2, 3... |
| verse | 절 번호 | 1, 2, 3... |
| text | 헬라어 표면형 | χριστοῦ |
| lemma | 헬라어 원형 | Χριστός |
| morph | 형태소 코드 | N----GSM- |
| definition | 정의 (비어있음) | 그리스도 |
| krv | 개역한글 | 예수 그리스도의 족보 |
| net | NET 영어 | the genealogy of Jesus Christ |

**참고**: 한 절(verse)에 여러 단어(word)가 있음
- 예: 마태복음 1:1은 8개 헬라어 단어로 구성
- 각 단어 행에 같은 krv/net 값이 들어감 (정상)

## 🔗 Supabase 업로드

데이터가 준비되면:

```bash
# Supabase 콘솔 → Table Editor
# krv_translations 테이블에 CSV 업로드
# net_translations 테이블에 CSV 업로드
```

또는 SQL로 직접 임포트:
```sql
-- verse_ref, text 컬럼만 필요
-- 예: MAT 1:1, "아브라함과 다윗의 자손..."
```

## ⚠️ 주의사항

1. **저작권**: 
   - 개역한글: 한국성경공회 저작권
   - NET: Biblical Studies Press 라이선스
   - 상업적 사용 시 라이선스 확인 필요

2. **데이터 정확성**:
   - 헬라어 원형(Lemma)은 `sblgnt_fixed.json`에서 정정됨
   - 86,701개 원형 교정 완료 (γενέσεως → γένεσις 등)

3. **API 제한**:
   - NET Labs API: 분당 호출 제한 있음
   - 전체 7,927절 가져오려면 시간 소요

## 📞 지원

문제 발생 시:
1. `translation_cache.json` 확인
2. `krv_data.json`, `net_data.json` 형식 검증
3. 로그 확인: `python3 merge_translations.py -v`

---

**생성일**: 2024년
**총 단어 수**: 137,554
**총 절 수**: 7,927
