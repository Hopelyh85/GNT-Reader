'use client';

import { useState, useMemo, useEffect } from 'react';
import { Book, GreekWord } from '@/app/types';
import { ChevronDown, ChevronRight, BookOpen } from 'lucide-react';

interface LexiconEntry {
  transliteration: string;
  definition: string;
  strongs: string;
  frequency: string;
}

interface KRVData {
  [key: string]: string;
}

import { SelectedWord } from '@/app/types';

interface BiblePanelProps {
  books: Book[];
  selectedVerse: { book: string; chapter: number; verse: number } | null;
  onSelectVerse: (verse: { book: string; bookName: string; chapter: number; verse: number; text: string }) => void;
  onSelectWord: (word: SelectedWord | null) => void;
  loading: boolean;
}

// Parse morphology code and return structured data
const parseMorphCode = (morph: string): { type: string; case?: string; number?: string; gender?: string; person?: string; tense?: string; voice?: string; mood?: string } => {
  if (!morph || morph.length < 10) return { type: '' };
  
  const type = morph[0];
  const typeMap: Record<string, string> = {
    'N': '명사', 'V': '동사', 'A': '형용사', 'D': '부사', 
    'C': '접속사', 'P': '전치사', 'R': '관계사', 'M': '수사',
    'I': '감탄사', 'X': '부정사'
  };
  
  const result: any = { type: typeMap[type] || '' };
  
  if (type === 'N' || type === 'A' || type === 'R') {
    const caseMap: Record<string, string> = { 'N': '주격', 'G': '속격', 'D': '여격', 'A': '대격', 'V': '호격' };
    const numberMap: Record<string, string> = { 'S': '단수', 'P': '복수' };
    const genderMap: Record<string, string> = { 'M': '남성', 'F': '여성', 'N': '중성' };
    
    if (morph[7]) result.case = caseMap[morph[7]] || morph[7];
    if (morph[8]) result.number = numberMap[morph[8]] || morph[8];
    if (morph[9]) result.gender = genderMap[morph[9]] || morph[9];
  } else if (type === 'V') {
    const personMap: Record<string, string> = { '1': '1인칭', '2': '2인칭', '3': '3인칭' };
    const tenseMap: Record<string, string> = { 'P': '현재', 'I': '미완료', 'F': '미래', 'A': '부정과거', 'R': '완료', 'L': '과거완료' };
    const voiceMap: Record<string, string> = { 'A': '능동태', 'M': '중간태', 'P': '수동태' };
    const moodMap: Record<string, string> = { 'I': '직설법', 'S': '가정법', 'O': '명령법', 'N': '부정사', 'P': '분사' };
    
    if (morph[1]) result.person = personMap[morph[1]] || morph[1];
    if (morph[3]) result.tense = tenseMap[morph[3]] || morph[3];
    if (morph[4]) result.voice = voiceMap[morph[4]] || morph[4];
    if (morph[5]) result.mood = moodMap[morph[5]] || morph[5];
    if (morph[2]) result.number = morph[2] === 'S' ? '단수' : morph[2] === 'P' ? '복수' : morph[2];
  }
  
  return result;
};

export function BiblePanel({
  books,
  selectedVerse,
  onSelectVerse,
  onSelectWord,
  loading,
}: BiblePanelProps) {
  const [expandedBook, setExpandedBook] = useState<string | null>(null);
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);
  const [internalSelectedWord, setInternalSelectedWord] = useState<{word: GreekWord, bookName: string, chapter: number, verse: number, wordIndex: number} | null>(null);
  
  // Load lexicon data
  const [lexicon, setLexicon] = useState<Record<string, LexiconEntry>>({});
  const [lexiconLoading, setLexiconLoading] = useState(true);
  
  // Load KRV translation data
  const [krvData, setKrvData] = useState<KRVData>({});
  const [krvLoading, setKrvLoading] = useState(true);
  
  useEffect(() => {
    async function loadLexicon() {
      setLexiconLoading(true);
      try {
        const response = await fetch('/data/lexicon.json');
        if (response.ok) {
          const data = await response.json();
          setLexicon(data);
        }
      } catch (err) {
        console.error('Error loading lexicon:', err);
      } finally {
        setLexiconLoading(false);
      }
    }
    loadLexicon();
  }, []);
  
  useEffect(() => {
    async function loadKRV() {
      setKrvLoading(true);
      try {
        const response = await fetch('/krv_data.json');
        if (response.ok) {
          const data = await response.json();
          setKrvData(data);
        }
      } catch (err) {
        console.error('Error loading KRV:', err);
      } finally {
        setKrvLoading(false);
      }
    }
    loadKRV();
  }, []);
  
  // Get definition for selected word - DUAL LOOKUP: try lemma first, then surface form
  const getWordDefinition = (lemma: string, surfaceForm: string): LexiconEntry | null => {
    // 1. Try lemma (root form) first - for proper nouns and base forms
    if (lexicon[lemma]) {
      return lexicon[lemma];
    }
    // 2. Fallback to surface form - for inflected forms
    if (lexicon[surfaceForm]) {
      return lexicon[surfaceForm];
    }
    return null;
  };

  // Parse morph code to extract grammatical info
  const parseMorphCode = (code: string): { type: string; case?: string; number?: string; gender?: string; person?: string; tense?: string; voice?: string; mood?: string } => {
    if (!code || code.length < 10) return { type: 'unknown' };
    
    const type = code[0];
    const typeMap: Record<string, string> = {
      'N': '명사', 'V': '동사', 'A': '형용사', 'D': '부사', 
      'C': '접속사', 'P': '전치사', 'R': '관계사', 'M': '수사',
      'I': '감탄사', 'X': '부정사'
    };
    
    const result: any = { type: typeMap[type] || type };
    
    if (type === 'N' || type === 'A' || type === 'R') {
      const caseMap: Record<string, string> = { 'N': '주격', 'G': '속격', 'D': '여격', 'A': '대격', 'V': '호격' };
      const numberMap: Record<string, string> = { 'S': '단수', 'P': '복수' };
      const genderMap: Record<string, string> = { 'M': '남성', 'F': '여성', 'N': '중성' };
      
      if (code[7]) result.case = caseMap[code[7]] || code[7];
      if (code[8]) result.number = numberMap[code[8]] || code[8];
      if (code[9]) result.gender = genderMap[code[9]] || code[9];
    } else if (type === 'V') {
      const personMap: Record<string, string> = { '1': '1인칭', '2': '2인칭', '3': '3인칭' };
      const tenseMap: Record<string, string> = { 'P': '현재', 'I': '미완료', 'F': '미래', 'A': '부정과거', 'R': '완료', 'L': '과거완료' };
      const voiceMap: Record<string, string> = { 'A': '능동태', 'M': '중간태', 'P': '수동태' };
      const moodMap: Record<string, string> = { 'I': '직설법', 'S': '가정법', 'O': '명령법', 'N': '부정사', 'P': '분사' };
      
      if (code[1]) result.person = personMap[code[1]] || code[1];
      if (code[3]) result.tense = tenseMap[code[3]] || code[3];
      if (code[4]) result.voice = voiceMap[code[4]] || code[4];
      if (code[5]) result.mood = moodMap[code[5]] || code[5];
      if (code[2]) result.number = code[2] === 'S' ? '단수' : code[2] === 'P' ? '복수' : code[2];
    }
    
    return result;
  };

  // Infer word type from morph code
  const inferWordType = (morph: string, word: string): string => {
    const parsed = parseMorphCode(morph);
    
    if (parsed.type === '명사' && word[0] === word[0]?.toUpperCase()) {
      return '고유명사 (인명/지명)';
    }
    
    if (parsed.type === '명사') return `명사${parsed.case ? ` (${parsed.case})` : ''}${parsed.number ? ` ${parsed.number}` : ''}${parsed.gender ? ` ${parsed.gender}` : ''}`;
    if (parsed.type === '동사') return `동사${parsed.tense ? ` (${parsed.tense})` : ''}${parsed.voice ? ` ${parsed.voice}` : ''}${parsed.mood ? ` ${parsed.mood}` : ''}`;
    if (parsed.type === '형용사') return `형용사${parsed.case ? ` (${parsed.case})` : ''}`;
    if (parsed.type === '관계사') return '관계대명사';
    if (parsed.type === '수사') return '수사';
    if (parsed.type === '부사') return '부사';
    if (parsed.type === '접속사') return '접속사';
    if (parsed.type === '전치사') return '전치사';
    if (parsed.type === '감탄사') return '감탄사';
    
    return parsed.type || '미상의 품사';
  };

  const bookAbbrevMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {
      '마태복음': 'MAT', '마가복음': 'MRK', '누가복음': 'LUK', '요한복음': 'JHN',
      '사도행전': 'ACT', '로마서': 'ROM', '고린도전서': '1CO', '고린도후서': '2CO',
      '갈라디아서': 'GAL', '에베소서': 'EPH', '빌립보서': 'PHP', '골로새서': 'COL',
      '데살로니가전서': '1TH', '데살로니가후서': '2TH', '디모데전서': '1TM', '디모데후서': '2TM',
      '디도서': 'TIT', '빌레몬서': 'PHM', '히브리서': 'HEB', '야고보서': 'JAS',
      '베드로전서': '1PE', '베드로후서': '2PE', '요한일서': '1JN', '요한이서': '2JN',
      '요한삼서': '3JN', '유다서': 'JUD', '요한계시록': 'REV',
    };
    return map;
  }, []);

  const getBookAbbrev = (bookName: string): string => {
    return bookAbbrevMap[bookName] || bookName.slice(0, 3).toUpperCase();
  };

  const handleBookClick = (bookName: string) => {
    setExpandedBook(expandedBook === bookName ? null : bookName);
    setExpandedChapter(null);
  };

  const handleChapterClick = (bookName: string, chapterNum: number) => {
    const key = `${bookName}-${chapterNum}`;
    setExpandedChapter(expandedChapter === key ? null : key);
  };

  const handleWordClick = (
    word: GreekWord,
    book: Book,
    chapterNum: number,
    verseNum: number,
    wordIndex: number
  ) => {
    // DEBUG: Log all word data
    console.log('=== WORD CLICK DEBUG ===');
    console.log('word.text (표면형):', word.text);
    console.log('word.lemma (원형):', word.lemma);
    console.log('word.morph (문법코드):', word.morph);
    
    const parsed = parseMorphCode(word.morph);
    console.log('parsed (한국어 문법):', parsed);
    
    const entry = getWordDefinition(word.lemma, word.text);
    console.log('lexicon entry:', entry);
    console.log('=======================');
    
    const selectedWordData = {
      word,
      bookName: book.name,
      book: bookAbbrevMap[book.name] || book.name,
      chapter: chapterNum,
      verse: verseNum,
      wordIndex,
    };
    
    setInternalSelectedWord({word, bookName: book.name, chapter: chapterNum, verse: verseNum, wordIndex});
    onSelectWord(selectedWordData);
  };

  // Get KRV text for a verse
  const getKRVText = (bookAbbrev: string, chapter: number, verse: number): string => {
    const key = `${bookAbbrev}_${chapter}_${verse}`;
    return krvData[key] || '';
  };

  const handleVerseClick = (
    book: Book,
    chapterNum: number,
    verseNum: number,
    verseWords: GreekWord[]
  ) => {
    const abbrev = getBookAbbrev(book.name);
    const fullText = verseWords.map(w => w.text).join(' ');
    onSelectVerse({
      book: abbrev,
      bookName: book.name,
      chapter: chapterNum,
      verse: verseNum,
      text: fullText,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="flex flex-col items-center gap-3 text-stone-500">
          <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
          <p className="text-sm font-serif">헬라어 성경 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-stone-50">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-stone-100 border-b border-stone-200">
        <BookOpen className="w-5 h-5 text-stone-600" />
        <h2 className="text-sm font-serif font-semibold text-stone-700">
          SBLGNT 헬라어 신약
        </h2>
      </div>

      {/* Bible Content - FORCED HORIZONTAL SCROLL */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-auto p-4 space-y-2 [&::-webkit-scrollbar]:h-3"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'auto',
          scrollbarColor: '#d6d3d1 transparent',
          touchAction: 'pan-x pan-y',
          overscrollBehavior: 'contain'
        }}
      >
        {/* Mobile scroll hint */}
        <div className="md:hidden sticky top-0 z-10 flex items-center justify-center gap-1 py-1 bg-stone-100 rounded-full mb-2 text-xs text-stone-400">
          <span>← 옆으로 밀어서 보기 →</span>
        </div>
        {books.map((book) => {
          const abbrev = getBookAbbrev(book.name);
          const isBookExpanded = expandedBook === book.name;

          return (
            <div key={book.name} className="rounded-lg overflow-visible">
              {/* Book Header */}
              <button
                onClick={() => handleBookClick(book.name)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                  isBookExpanded
                    ? 'bg-stone-200 text-stone-800'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-150'
                }`}
              >
                <span className="font-serif font-medium text-sm">
                  {book.name}
                </span>
                {isBookExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {/* Chapters */}
              {isBookExpanded && (
                <div className="bg-stone-50 p-2 space-y-1 overflow-visible">
                  {book.chapters.map((chapter) => {
                    const chapterKey = `${book.name}-${chapter.number}`;
                    const isChapterExpanded = expandedChapter === chapterKey;

                    return (
                      <div key={chapter.number}>
                        <button
                          onClick={() =>
                            handleChapterClick(book.name, chapter.number)
                          }
                          className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-sm rounded transition-colors ${
                            isChapterExpanded
                              ? 'bg-stone-200 text-stone-800'
                              : 'bg-white text-stone-600 hover:bg-stone-100'
                          }`}
                        >
                          <span className="font-serif">
                            {chapter.number}장
                          </span>
                          {isChapterExpanded ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                        </button>

                        {/* Verses - FORCED WIDE SCROLL */}
                        {isChapterExpanded && (
                          <div 
                            className="mt-1 space-y-1 pl-2 bg-stone-50/30 rounded"
                            style={{ minWidth: '1000px', display: 'block' }}
                          >
                            {/* Visible scrollbar indicator */}
                            <div className="md:hidden h-1 bg-gradient-to-r from-stone-300 via-amber-400 to-stone-300 rounded-full mb-2 opacity-60" />
                            {chapter.verses.map((verse, verseIdx) => {
                              const isSelected =
                                selectedVerse?.book === abbrev &&
                                selectedVerse?.chapter === chapter.number &&
                                selectedVerse?.verse === verseIdx + 1;
                              
                              const krvText = getKRVText(abbrev, chapter.number, verseIdx + 1);

                              return (
                                <div
                                  key={verseIdx}
                                  onClick={() =>
                                    handleVerseClick(
                                      book,
                                      chapter.number,
                                      verseIdx + 1,
                                      verse
                                    )
                                  }
                                  className={`text-left p-3 rounded transition-all text-sm cursor-pointer flex-shrink-0 ${
                                    isSelected
                                      ? 'bg-amber-100 border-l-2 border-amber-500 text-stone-800'
                                      : 'bg-white hover:bg-stone-100 text-stone-600'
                                  }`}
                                  style={{ 
                                    whiteSpace: 'normal',
                                    lineHeight: '1.8',
                                    display: 'block',
                                    width: '100%'
                                  }}
                                >
                                  <span className="font-serif text-xs text-stone-400 mr-2 select-none">
                                    {verseIdx + 1}
                                  </span>
                                  <span className="font-greek text-stone-700 flex-wrap break-words" style={{ whiteSpace: 'normal', lineHeight: '1.8' }}>
                                    {verse.map((word, wordIdx) => (
                                      <span
                                        key={wordIdx}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleWordClick(
                                            word,
                                            book,
                                            chapter.number,
                                            verseIdx + 1,
                                            wordIdx
                                          );
                                        }}
                                        className="inline-block mr-[0.3em] cursor-pointer hover:bg-amber-200 hover:text-amber-900 rounded px-0.5 transition-colors"
                                      >
                                        {word.text}
                                      </span>
                                    ))}
                                  </span>
                                  {/* KRV Translation */}
                                  {krvText && (
                                    <p className="mt-2 text-sm text-stone-600 font-serif border-t border-stone-200 pt-2">
                                      {krvText}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Word Analysis Card - Full Data Display */}
      {internalSelectedWord && (
        <div className="border-t border-stone-200 bg-amber-50 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0 space-y-2">
              {/* Line 1: 원형 (Lemma) */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-stone-500 w-16">원형:</span>
                <span className="font-greek text-xl font-bold text-amber-700">
                  {internalSelectedWord.word.lemma || internalSelectedWord.word.text}
                </span>
              </div>
              
              {/* Line 2: 문법 코드 + 한국어 문법 */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-stone-500 w-16">문법:</span>
                <span className="text-sm font-mono text-stone-600 bg-stone-200 px-1.5 py-0.5 rounded">
                  {internalSelectedWord.word.morph}
                </span>
                {(() => {
                  const p = parseMorphCode(internalSelectedWord.word.morph);
                  if (!p.type) return null;
                  const parts = [p.type];
                  if (p.case) parts.push(p.case);
                  if (p.number) parts.push(p.number);
                  if (p.gender) parts.push(p.gender);
                  if (p.tense) parts.push(p.tense);
                  if (p.voice) parts.push(p.voice);
                  if (p.mood) parts.push(p.mood);
                  return (
                    <span className="text-sm text-blue-700">
                      [{parts.join(' • ')}]
                    </span>
                  );
                })()}
              </div>
              
              {/* Line 3: 한글 뜻 */}
              {(() => {
                const entry = getWordDefinition(internalSelectedWord.word.lemma, internalSelectedWord.word.text);
                if (entry) {
                  return (
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-stone-500 w-16">뜻:</span>
                      <p className="text-sm text-stone-700 leading-relaxed">
                        {entry.definition}
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-stone-500 w-16">뜻:</span>
                    <span className="text-sm text-stone-400">(사전 데이터 준비 중)</span>
                  </div>
                );
              })()}
            </div>
            <button
              onClick={() => {
                setInternalSelectedWord(null);
                onSelectWord(null);
              }}
              className="p-1.5 hover:bg-stone-200 rounded transition-colors flex-shrink-0"
            >
              <span className="text-sm text-stone-400">✕</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Reflection Input - at bottom of Bible text */}
      <div className="md:hidden border-t border-stone-200 bg-white p-4 mt-4">
        <h3 className="text-sm font-serif font-semibold text-stone-700 mb-2 flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          나의 묵상
        </h3>
        <textarea
          className="w-full h-24 p-3 text-sm border border-stone-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
          placeholder={selectedVerse ? `${selectedVerse.book} ${selectedVerse.chapter}:${selectedVerse.verse}에 대한 묵상을 입력하세요...` : '먼저 성경 구절을 선택하세요...'}
          disabled={!selectedVerse}
        />
        <div className="flex justify-end mt-2">
          <button
            className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg disabled:bg-stone-300 disabled:cursor-not-allowed"
            disabled={!selectedVerse}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

// fix: v1.1
