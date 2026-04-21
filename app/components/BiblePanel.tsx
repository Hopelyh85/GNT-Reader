'use client';

import { useState, useMemo, useEffect } from 'react';
import { Book, GreekWord } from '@/app/types';
import { ChevronDown, ChevronRight, BookOpen } from 'lucide-react';

interface LexiconEntry {
  lemma?: string;
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

// Smart Morphology Parsing Engine (length/index independent)
// Force article parsing for Greek articles regardless of morph code
const parseMorphCode = (morph: string, lemma?: string, text?: string): string => {
  if (!morph || morph.length < 3) return '미상의 품사';
  
  // Greek articles list for forced parsing
  const articles = ['ὁ', 'ἡ', 'οἱ', 'αἱ', 'τό', 'τόν', 'τὴν', 'τῆς', 'τοὺς', 'τῷ', 'τῶν', 'τῇ', 'τὰ', 'τὸ', 'τοῦ', 'τούς', 'ταῖς'];
  const isArticle = lemma && articles.includes(lemma) || text && articles.includes(text);
  
  const tMap: Record<string, string> = {'N':'명사','V':'동사','A':'형용사','D':'부사','P':'전치사','R':'대명사','T':'관사','C':'접속사','X':'불변화사','I':'감탄사'};
  const cMap: Record<string, string> = {'N':'주격','G':'속격','D':'여격','A':'대격','V':'호격'};
  const nMap: Record<string, string> = {'S':'단수','P':'복수'};
  const gMap: Record<string, string> = {'M':'남성','F':'여성','N':'중성'};
  
  // Force article type if it's an article
  const type = isArticle ? '관사' : (tMap[morph[0]] || '기타');
  let details: string[] = [];
  
  if (!isArticle && morph[0] === 'V') {
    // Verb parsing
    const pMap: Record<string, string> = {'1':'1인칭','2':'2인칭','3':'3인칭'};
    const teMap: Record<string, string> = {'P':'현재','I':'미완료','F':'미래','A':'부정과거','R':'완료','V':'과거완료'};
    const vMap: Record<string, string> = {'A':'능동태','M':'중간태','P':'수동태','D':'디포넌트'};
    const mMap: Record<string, string> = {'I':'직설법','S':'가정법','O':'희구법','M':'명령법','N':'부정사','P':'분사'};
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
    console.log('lexicon[word.lemma]:', lexicon[word.lemma]);
    console.log('lexicon[word.text]:', lexicon[word.text]);
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

      {/* Word Analysis Card - Fixed at Bottom with Scroll */}
      {internalSelectedWord && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-200 bg-amber-50 p-4 shadow-lg max-h-[50vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0 space-y-3">
              {/* Line 1: 원형 (Lemma) - CLEAN */}
              {(() => {
                const w = internalSelectedWord.word;
                const entry = lexicon[w.lemma] || lexicon[w.text];
                // Lemma Fixer: hardcoded corrections for common lemmas + articles
                const lemmaFixer: Record<string, string> = {
                  'ἐστί(ν)': 'εἰμί',
                  'εἰσίν': 'εἰμί',
                  'αὐτῆς': 'αὐτός',
                  'αὐτοῦ': 'αὐτός',
                  'αὐτῷ': 'αὐτός',
                  'αὐτόν': 'αὐτός',
                  // Greek Articles
                  'τόν': 'ὁ',
                  'τὴν': 'ὁ',
                  'τῆς': 'ὁ',
                  'τοὺς': 'ὁ',
                  'τῷ': 'ὁ',
                  'τῶν': 'ὁ',
                  'τῇ': 'ὁ',
                  'τὰ': 'ὁ',
                  'τὸ': 'ὁ',
                  'τοῦ': 'ὁ',
                  'οἱ': 'ὁ',
                  'αἱ': 'ὁ',
                  'ὁ': 'ὁ',
                  'ἡ': 'ὁ',
                  'τό': 'ὁ',
                  'τούς': 'ὁ',
                  'ταῖς': 'ὁ'
                };
                const rawLemma = entry?.lemma || w.lemma || w.text || '';
                const cleanedLemma = lemmaFixer[rawLemma] || rawLemma.replace(new RegExp('\\(.*\\)', 'g'), '');
                return (
                  <div className="font-greek text-3xl font-bold text-amber-700 leading-tight">
                    {cleanedLemma || '⚠️ 원형 없음'}
                  </div>
                );
              })()}
              
              {/* Line 2: 한글 문법 풀이 */}
              {(() => {
                const w = internalSelectedWord.word;
                const entry = lexicon[w.lemma] || lexicon[w.text];
                const lemmaFixer: Record<string, string> = {
                  'τόν': 'ὁ', 'τὴν': 'ὁ', 'τῆς': 'ὁ', 'τοὺς': 'ὁ', 'τῷ': 'ὁ', 'τῶν': 'ὁ',
                  'τῇ': 'ὁ', 'τὰ': 'ὁ', 'τὸ': 'ὁ', 'τοῦ': 'ὁ', 'οἱ': 'ὁ', 'αἱ': 'ὁ',
                  'ὁ': 'ὁ', 'ἡ': 'ὁ', 'τό': 'ὁ', 'τούς': 'ὁ', 'ταῖς': 'ὁ'
                };
                const rawLemma = entry?.lemma || w.lemma || w.text || '';
                const cleanedLemma = lemmaFixer[rawLemma] || rawLemma.replace(new RegExp('\\(.*\\)', 'g'), '');
                return (
                  <div className="text-sm text-blue-700 font-medium">
                    {parseMorphCode(internalSelectedWord.word.morph, cleanedLemma, w.text)}
                  </div>
                );
              })()}
              
              {/* Line 3: 사전 뜻 */}
              {(() => {
                const w = internalSelectedWord.word;
                const entry = lexicon[w.lemma] || lexicon[w.text];
                const def = entry?.definition || null;
                const strongs = entry?.strongs || null;
                
                if (def || strongs) {
                  return (
                    <div className="space-y-1">
                      {strongs && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-medium text-stone-500 w-14 shrink-0">Strong:</span>
                          <span className="text-xs font-mono bg-blue-100 px-2 py-0.5 rounded text-blue-700">{strongs}</span>
                        </div>
                      )}
                      {def && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-medium text-stone-500 w-14 shrink-0">뜻:</span>
                          <p className="text-sm text-stone-700 leading-relaxed">{def}</p>
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-stone-500 w-14 shrink-0">뜻:</span>
                    <p className="text-sm text-stone-400 italic">(사전 데이터 없음)</p>
                  </div>
                );
              })()}
            </div>
            <button
              onClick={() => {
                setInternalSelectedWord(null);
                onSelectWord(null);
              }}
              className="p-1.5 hover:bg-stone-200 rounded transition-colors flex-shrink-0 sticky top-0"
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
