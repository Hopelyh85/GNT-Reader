'use client';

import { useState, useMemo, useEffect } from 'react';
import { Book, GreekWord } from '@/app/types';
import { ChevronDown, ChevronRight, BookOpen, X } from 'lucide-react';

interface LexiconEntry {
  transliteration: string;
  definition: string;
  strongs: string;
  frequency: string;
}

import { SelectedWord } from '@/app/types';

interface BiblePanelProps {
  books: Book[];
  selectedVerse: { book: string; chapter: number; verse: number } | null;
  onSelectVerse: (verse: { book: string; bookName: string; chapter: number; verse: number; text: string }) => void;
  onSelectWord: (word: SelectedWord | null) => void;
  loading: boolean;
}

// Parse morphology code to Korean (Protestant standard terminology)
// Format examples: V-3AAI-S-- (verbs), N----NSM- (nouns), A----NSM- (adjectives)
const parseMorphCode = (morph: string) => {
  if (!morph) return '';
  const cleanMorph = morph.trim();
  const category = cleanMorph[0]; // 첫 글자로 품사 판별

  // 형태 불변 단어 처리 (접속사, 부사, 전치사 등)
  const invariantMap: any = {
    C: '접속사',
    D: '부사',
    P: '전치사',
    I: '감탄사',
    X: '입자(Particle)'
  };

  if (invariantMap[category] && cleanMorph.includes('----')) {
    return `[${invariantMap[category]}]`;
  }

  // 공통 맵
  const tenseMap: any = { P: '현재', I: '미완료', F: '미래', A: '부정과거', R: '완료', X: '완료', L: '과거완료' };
  const voiceMap: any = { A: '능동태', M: '중간태', P: '수동태', D: '디포넌트' };
  const moodMap: any = { I: '직설법', S: '가정법', O: '희구법', M: '명령법', N: '부정사', P: '분사' };
  const caseMap: any = { N: '주격', G: '속격', D: '여격', A: '대격', V: '호격' };
  const numberMap: any = { S: '단수', P: '복수' };
  const genderMap: any = { M: '남성', F: '여성', N: '중성' };
  const personMap: any = { 1: '1인칭', 2: '2인칭', 3: '3인칭' };

  if (category === 'V') {
    const parts = ['동사'];
    const verbMorph = cleanMorph.replace('V-', 'V');
    if (['1', '2', '3'].includes(verbMorph[1])) {
      parts.push(personMap[verbMorph[1]], tenseMap[verbMorph[2]], voiceMap[verbMorph[3]], moodMap[verbMorph[4]], numberMap[verbMorph[6]]);
    } else {
      parts.push(tenseMap[verbMorph[1]], voiceMap[verbMorph[2]], moodMap[verbMorph[3]]);
    }
    return `[${parts.filter(Boolean).join(' | ')}]`;
  }

  if (['N', 'A', 'D', 'R', 'P', 'I'].includes(category)) {
    const catName: any = { N: '명사', A: '형용사', D: '지시대명사', R: '관계대명사', P: '인칭대명사', I: '의문대명사' };
    const parts = [catName[category] || '체언'];
    // N----ASM- 처럼 하이픈이 많은 경우 뒤에서부터 격/수/성을 찾음
    const suffix = cleanMorph.slice(-4); 
    parts.push(caseMap[suffix[0]], numberMap[suffix[1]], genderMap[suffix[2]]);
    return `[${parts.filter(p => p && p !== '-').join(' | ')}]`;
  }

  return `[${cleanMorph}]`;
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
    // DEBUG: Log raw word data and lemma vs text
    console.log('=== LEMMA vs TEXT DEBUG ===');
    console.log('Raw word:', word);
    console.log('LEMMA (원형):', word.lemma, '| TEXT (표면형):', word.text);
    console.log('Are they SAME?:', word.lemma === word.text);
    console.log('Morph:', word.morph);
    console.log('Lexicon lookup (dual):', getWordDefinition(word.lemma, word.text));
    console.log('========================');
    
    const selectedWordData = {
      word,
      bookName: book.name,
      book: bookAbbrevMap[book.name] || book.name,
      chapter: chapterNum,
      verse: verseNum,
      wordIndex,
    };
    setInternalSelectedWord(selectedWordData);
    onSelectWord({
      word,
      bookName: book.name,
      book: bookAbbrevMap[book.name] || book.name,
      chapter: chapterNum,
      verse: verseNum,
    });
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
                                        title={`${word.lemma} (${word.morph})`}
                                      >
                                        {word.text}
                                      </span>
                                    ))}
                                  </span>
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

      {/* Word Analysis Panel */}
      {internalSelectedWord && (
        <div className="border-t border-stone-200 bg-white p-4 shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-serif font-semibold text-stone-800 mb-2">
                단어 분석: {internalSelectedWord.word.text}
              </h3>
              <div className="space-y-1 text-sm">
                <p className="text-stone-600">
                  <span className="font-medium text-stone-700">원형 (Lemma):</span>{' '}
                  <span className="font-greek text-amber-700">{internalSelectedWord.word.lemma}</span>
                </p>
                <p className="text-stone-600">
                  <span className="font-medium text-stone-700">문법 정보:</span>{' '}
                  <span className="text-stone-500">[{internalSelectedWord.word.morph}]</span>
                </p>
                <p className="text-stone-600">
                  <span className="font-medium text-stone-700">문법:</span>{' '}
                  <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {(() => {
                      const p = parseMorphCode(internalSelectedWord.word.morph);
                      return `${p.type}${p.case ? ` • ${p.case}` : ''}${p.number ? ` • ${p.number}` : ''}${p.gender ? ` • ${p.gender}` : ''}${p.tense ? ` • ${p.tense}` : ''}${p.voice ? ` • ${p.voice}` : ''}${p.mood ? ` • ${p.mood}` : ''}`;
                    })()}
                  </span>
                </p>
                {/* Word Definition - Priority Display */}
                {(() => {
                  if (lexiconLoading) {
                    return (
                      <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                        <p className="text-sm font-semibold text-blue-700 animate-pulse">
                          📖 사전 데이터 분석 중...
                        </p>
                      </div>
                    );
                  }
                  const entry = getWordDefinition(internalSelectedWord.word.lemma, internalSelectedWord.word.text);
                  const inferredType = entry ? '' : inferWordType(internalSelectedWord.word.morph, internalSelectedWord.word.text);
                  const parsed = parseMorphCode(internalSelectedWord.word.morph);
                  return entry ? (
                    <div className="mt-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg shadow-sm">
                      <p className="text-base font-bold text-amber-900 mb-2 border-b border-amber-200 pb-1">
                        📖 단어 분석
                      </p>
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <span className="font-greek text-2xl font-bold text-amber-700">
                          {internalSelectedWord.word.lemma}
                        </span>
                        {internalSelectedWord.word.lemma !== internalSelectedWord.word.text && (
                          <span className="text-xs px-2 py-1 bg-stone-200 rounded text-stone-600">
                            표면형: {internalSelectedWord.word.text}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-stone-700 mb-3 leading-relaxed">
                        {entry.definition}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-stone-500 flex-wrap">
                        <span className="px-2 py-1 bg-stone-100 rounded">Strong&apos;s: {entry.strongs}</span>
                        <span className="px-2 py-1 bg-stone-100 rounded">[{entry.transliteration}]</span>
                        <span className="px-2 py-1 bg-stone-100 rounded">{entry.frequency}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-greek text-xl font-semibold text-stone-700">
                          {internalSelectedWord.word.lemma}
                        </span>
                        {internalSelectedWord.word.lemma !== internalSelectedWord.word.text && (
                          <span className="text-xs px-2 py-0.5 bg-stone-200 rounded text-stone-600">
                            표면형: {internalSelectedWord.word.text}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-amber-700 mb-2">
                        📖 {inferredType}
                      </p>
                      <p className="text-xs text-stone-500 mb-1">
                        문법: {parsed.type}{parsed.case ? ` • ${parsed.case}` : ''}{parsed.number ? ` • ${parsed.number}` : ''}{parsed.gender ? ` • ${parsed.gender}` : ''}{parsed.tense ? ` • ${parsed.tense}` : ''}{parsed.voice ? ` • ${parsed.voice}` : ''}{parsed.mood ? ` • ${parsed.mood}` : ''}
                      </p>
                      <p className="text-xs text-stone-400 mt-2 border-t border-stone-200 pt-2">
                        (사전 데이터 준비 중)
                      </p>
                    </div>
                  );
                })()}
                <p className="text-xs text-red-500 mt-2">
                  (콘솔에서 상세 로그 확인 - F12 &gt; Console)
                  {internalSelectedWord.bookName} {internalSelectedWord.chapter}:{internalSelectedWord.verse}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setInternalSelectedWord(null);
                onSelectWord(null);
              }}
              className="p-1 hover:bg-stone-100 rounded transition-colors"
            >
              <X className="w-4 h-4 text-stone-500" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// fix: v1.1
