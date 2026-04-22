'use client';

import { useState, useMemo, useEffect } from 'react';
import { Book, GreekWord } from '@/app/types';
import { ChevronDown, ChevronRight, BookOpen, Loader2 } from 'lucide-react';
import { fallbackFixer, getSmartLemma } from '../lib/greekMapping';

interface LexiconEntry {
  lemma?: string;
  transliteration: string;
  definition: string;
  strongs: string;
  frequency: string;
  korean_def?: string;
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

// Smart Morphology Parsing Engine - Returns STRING with Korean + English
const parseMorphCode = (morph: string, lemma?: string, text?: string): string => {
  if (!morph || morph.length < 3) return '[미상 (Unknown)]';
  
  // Greek articles list for forced parsing
  const articles = ['ὁ', 'ἡ', 'οἱ', 'αἱ', 'τό', 'τόν', 'τὴν', 'τῆς', 'τοὺς', 'τῷ', 'τῶν', 'τῇ', 'τὰ', 'τὸ', 'τοῦ', 'τούς', 'ταῖς'];
  const isArticle = (lemma && articles.includes(lemma)) || (text && articles.includes(text));
  
  // Korean + English bilingual maps
  const tMap: Record<string, string> = {
    'N': '명사 (Noun)', 'V': '동사 (Verb)', 'A': '형용사 (Adj)', 'D': '부사 (Adv)', 
    'P': '전치사 (Prep)', 'R': '대명사 (Pron)', 'T': '관사 (Art)', 'C': '접속사 (Conj)', 
    'X': '불변화사 (Part)', 'I': '감탄사 (Interj)'
  };
  const cMap: Record<string, string> = {
    'N': '주격 (Nom)', 'G': '속격 (Gen)', 'D': '여격 (Dat)', 'A': '대격 (Acc)', 'V': '호격 (Voc)'
  };
  const nMap: Record<string, string> = {'S': '단수 (Sing)', 'P': '복수 (Plur)'};
  const gMap: Record<string, string> = {
    'M': '남성 (Masc)', 'F': '여성 (Fem)', 'N': '중성 (Neut)'
  };
  
  // Force article type if it's an article
  const type = isArticle ? '관사 (Article)' : (tMap[morph[0]] || '기타 (Misc)');
  let details: string[] = [];
  
  if (!isArticle && morph[0] === 'V') {
    // Verb parsing with English
    const pMap: Record<string, string> = {'1': '1인칭 (1st)', '2': '2인칭 (2nd)', '3': '3인칭 (3rd)'};
    const teMap: Record<string, string> = {
      'P': '현재 (Pres)', 'I': '미완료 (Impf)', 'F': '미래 (Fut)', 
      'A': '부정과거 (Aor)', 'R': '완료 (Perf)', 'V': '과거완료 (Plup)'
    };
    const vMap: Record<string, string> = {
      'A': '능동태 (Act)', 'M': '중간태 (Mid)', 'P': '수동태 (Pass)', 'D': '디포넌트 (Dep)'
    };
    const mMap: Record<string, string> = {
      'I': '직설법 (Ind)', 'S': '가정법 (Subj)', 'O': '희구법 (Opt)', 
      'M': '명령법 (Imp)', 'N': '부정사 (Inf)', 'P': '분사 (Part)'
    };
    if(morph[1] && morph[1] !== '-') details.push(pMap[morph[1]]);
    if(morph[2] && morph[2] !== '-') details.push(teMap[morph[2]]);
    if(morph[3] && morph[3] !== '-') details.push(vMap[morph[3]]);
    if(morph[4] && morph[4] !== '-') details.push(mMap[morph[4]]);
    if(morph[5] && morph[5] !== '-') details.push(cMap[morph[5]]);
    if(morph[6] && morph[6] !== '-') details.push(nMap[morph[6]]);
    if(morph[7] && morph[7] !== '-') details.push(gMap[morph[7]]);
  } else {
    // Non-verb: extract last 3 chars after removing hyphens
    const core = morph.slice(1).replace(/-/g, '');
    if (core.length >= 3) {
      const cng = core.slice(-3);
      if(cMap[cng[0]]) details.push(cMap[cng[0]]);
      if(nMap[cng[1]]) details.push(nMap[cng[1]]);
      if(gMap[cng[2]]) details.push(gMap[cng[2]]);
    }
  }
  
  const validDetails = details.filter(Boolean).join(' • ');
  return validDetails ? `[${type} • ${validDetails}]` : `[${type}]`;
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
  
  // Symbol cleaning: strip SBLGNT critical symbols and punctuation (preserves apostrophes for elision)
  const cleanSymbols = (text: string): string => {
    return text.replace(/[.,;··⸀⸁⸂⸃⸄⸅\(\)]/g, '').trim();
  };

  // Ultra-lightweight lexicon lookup with symbol cleaning and fallback
  const getWordDefinition = (lemma: string, surfaceForm: string): { entry: LexiconEntry | null; cleanedLemma: string } => {
    // Two-track: clean symbols for search, keep original for display
    const cleanedLemma = cleanSymbols(lemma);
    const cleanedSurface = cleanSymbols(surfaceForm);
    
    const searchKey = fallbackFixer[cleanedSurface] || fallbackFixer[cleanedLemma] || cleanedLemma || cleanedSurface;
    const stripped = cleanedSurface.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const entry = lexicon[searchKey] || lexicon[cleanedSurface] || lexicon[stripped];
    const finalLemma = entry?.lemma || searchKey || cleanedLemma;
    return { entry, cleanedLemma: finalLemma };
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
    
    // 1. Clean the raw text and lemma completely first
    const displayLemma = String(word?.lemma || word?.text || '');
    const rawText = String(word?.text || '');
    const morphCode = String(word?.morph || '');
    
    // 2. Strict cleaning: remove ALL punctuation and critical symbols BEFORE lookup
    const cleanRawText = rawText.replace(/[.,;··⸀⸁⸂⸃⸄⸅\(\)]/g, '').trim();
    const cleanRawLemma = displayLemma.replace(/[.,;··⸀⸁⸂⸃⸄⸅\(\)]/g, '').trim();
    
    // 3. Check fallbackFixer using the cleaned text, then apply smart stemming
    const searchLemma = fallbackFixer[cleanRawLemma] || 
                       fallbackFixer[cleanRawText] || 
                       getSmartLemma(cleanRawLemma) || 
                       getSmartLemma(cleanRawText) ||
                       cleanRawLemma || 
                       cleanRawText;
    
    // 4. 사전 검색 with searchLemma (parseMorphCode는 StudyPanel에서만 렌더링)
    const strippedAccent = searchLemma.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const entry = lexicon[searchLemma] || lexicon[strippedAccent] || lexicon[cleanRawText];
    const cleanedLemma = entry?.lemma || searchLemma;
    
    // 안전한 디버깅: parseMorphCode 결과를 문자열로만 출력
    try {
      const parsed = parseMorphCode(morphCode, searchLemma, rawText);
      console.log('parsed (한국어 문법):', parsed);
    } catch (e) {
      console.log('parseMorphCode error:', e);
    }
    
    console.log('lexicon entry:', entry);
    console.log('searchLemma:', searchLemma);
    console.log('cleanedLemma:', cleanedLemma);
    console.log('lexicon[word.lemma]:', lexicon[word.lemma]);
    console.log('lexicon[word.text]:', lexicon[word.text]);
    console.log('=======================');
    
    // 원본 word 데이터를 그대로 전달 (StudyPanel에서 투트랙 처리)
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
        {lexiconLoading && (
          <div className="ml-auto flex items-center gap-1 text-xs text-stone-500">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>사전 로딩...</span>
          </div>
        )}
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
                                      <span key={`word-${wordIdx}`} className="inline-block">
                                        <span
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
                                          className="inline-block cursor-pointer hover:bg-amber-200 hover:text-amber-900 rounded px-0.5 transition-colors"
                                        >
                                          {word.text}
                                        </span>
                                        {' '}
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
