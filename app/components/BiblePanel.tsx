'use client';

import { useState, useMemo, useEffect } from 'react';
import { Book, GreekWord } from '@/app/types';
import { ChevronDown, ChevronRight, BookOpen, Loader2, MessageCircle, Send, Sparkles, Info, Bell, Coffee, Archive, ExternalLink, Pin, ArrowRight } from 'lucide-react';
import { fallbackFixer, getSmartLemmaWithDatabase } from '../lib/greekMapping';
import { getSupabase, addPublicReflection, getPublicReflections, getPinnedPosts } from '../lib/supabase';

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
  userRole?: string;
  isLoggedIn?: boolean;
  userName?: string;
  onFocusCommunity?: (postId?: string) => void;
}

interface Reflection {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    nickname: string | null;
    tier: string;
  };
}

interface Notice {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_pinned: boolean;
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
  } else if (morph[0] === 'R') {
    // Pronoun parsing: person, case, number, gender (e.g., RP----GS-)
    const pMap: Record<string, string> = {'1': '1인칭 (1st)', '2': '2인칭 (2nd)', '3': '3인칭 (3rd)'};
    if(morph[1] && morph[1] !== '-') details.push(pMap[morph[1]]);
    // Pronoun case/number/gender at positions 5,6,7 (0-indexed)
    if(morph[5] && morph[5] !== '-') details.push(cMap[morph[5]]);
    if(morph[6] && morph[6] !== '-') details.push(nMap[morph[6]]);
    if(morph[7] && morph[7] !== '-') details.push(gMap[morph[7]]);
  } else {
    // Non-verb, non-pronoun: extract last 3 chars after removing hyphens
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
  userRole,
  isLoggedIn,
  userName,
  onFocusCommunity,
}: BiblePanelProps) {
  const [expandedBook, setExpandedBook] = useState<string | null>(null);
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);
  const [expandedVerse, setExpandedVerse] = useState<string | null>(null); // For inline reflection panel
  const [internalSelectedWord, setInternalSelectedWord] = useState<{word: GreekWord, bookName: string, chapter: number, verse: number, wordIndex: number} | null>(null);
  
  // Inline reflection states
  const [verseReflections, setVerseReflections] = useState<Record<string, Reflection[]>>({});
  const [newReflection, setNewReflection] = useState('');
  const [loadingReflections, setLoadingReflections] = useState(false);
  const [savingReflection, setSavingReflection] = useState(false);
  
  // Pinned posts for empty state dashboard
  const [pinnedPosts, setPinnedPosts] = useState<any[]>([]);
  const [loadingPinnedPosts, setLoadingPinnedPosts] = useState(false);
  
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
  
  // Load pinned posts for empty state dashboard
  useEffect(() => {
    async function loadPinned() {
      setLoadingPinnedPosts(true);
      try {
        const data = await getPinnedPosts();
        setPinnedPosts(data.slice(0, 3)); // 최신 3개만 표시
      } catch (err: any) {
        console.error('Error loading pinned posts:', err?.message);
      } finally {
        setLoadingPinnedPosts(false);
      }
    }
    loadPinned();
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

  const bookNameMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {
      'MAT': '마태복음', 'MRK': '마가복음', 'LUK': '누가복음', 'JHN': '요한복음',
      'ACT': '사도행전', 'ROM': '로마서', '1CO': '고린도전서', '2CO': '고린도후서',
      'GAL': '갈라디아서', 'EPH': '에베소서', 'PHP': '빌립보서', 'COL': '골로새서',
      '1TH': '데살로니가전서', '2TH': '데살로니가후서', '1TM': '디모데전서', '2TM': '디모데후서',
      'TIT': '디도서', 'PHM': '빌레몬서', 'HEB': '히브리서', 'JAS': '야고보서',
      '1PE': '베드로전서', '2PE': '베드로후서', '1JN': '요한일서', '2JN': '요한이서',
      '3JN': '요한삼서', 'JUD': '유다서', 'REV': '요한계시록',
      'Matt': '마태복음', 'Mark': '마가복음', 'Luke': '누가복음', 'John': '요한복음',
      'Acts': '사도행전', 'Rom': '로마서', '1Cor': '고린도전서', '2Cor': '고린도후서',
    };
    return map;
  }, []);

  const handleBookClick = (bookName: string) => {
    setExpandedBook(expandedBook === bookName ? null : bookName);
    setExpandedChapter(null);
  };

  const handleChapterClick = (bookName: string, chapterNum: number) => {
    const key = `${bookName}-${chapterNum}`;
    setExpandedChapter(expandedChapter === key ? null : key);
  };

  const handleWordClick = async (
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
    
    // 3. Check fallbackFixer first, then query database with smart fallback
    let searchLemma = fallbackFixer[cleanRawLemma] || 
                      fallbackFixer[cleanRawText];
    
    // If not in fallback, try database with smart fallback
    if (!searchLemma) {
      searchLemma = await getSmartLemmaWithDatabase(cleanRawLemma) || 
                    await getSmartLemmaWithDatabase(cleanRawText) ||
                    cleanRawLemma || 
                    cleanRawText;
    }
    
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
    
    // Toggle inline reflection panel
    const verseKey = `${abbrev}-${chapterNum}-${verseNum}`;
    if (expandedVerse === verseKey) {
      setExpandedVerse(null);
    } else {
      setExpandedVerse(verseKey);
      loadReflections(abbrev, chapterNum, verseNum);
    }
  };
  
  // Load reflections for a verse
  const loadReflections = async (book: string, chapter: number, verse: number) => {
    setLoadingReflections(true);
    try {
      const verseRef = `${book} ${chapter}:${verse}`;
      const result = await getPublicReflections(verseRef, 1, 20);
      
      const verseKey = `${book}-${chapter}-${verse}`;
      setVerseReflections(prev => ({
        ...prev,
        [verseKey]: result.data || []
      }));
    } catch (err: any) {
      console.error('Error loading reflections:', err?.message);
    } finally {
      setLoadingReflections(false);
    }
  };
  
  // Save reflection for a verse
  const handleSaveReflection = async (book: string, chapter: number, verse: number) => {
    if (!newReflection.trim() || !isLoggedIn) return;
    
    setSavingReflection(true);
    try {
      // Use Korean book name for DB consistency
      const koreanBookName = bookNameMap[book] || book;
      const verseRef = `${koreanBookName} ${chapter}:${verse}`;
      const autoTitle = `[${koreanBookName} ${chapter}장 ${verse}절] 묵상 나눔`;
      
      await addPublicReflection(
        verseRef,
        koreanBookName,  // Store Korean name in DB
        chapter,
        verse,
        newReflection,
        true, // isPublic
        'reflection',
        null, // parentId
        autoTitle
      );
      
      setNewReflection('');
      // Reload reflections
      await loadReflections(book, chapter, verse);
    } catch (err: any) {
      console.error('Error saving reflection:', err?.message, err?.details);
      alert('묵상 저장 중 오류: ' + (err?.message || 'Unknown error'));
    } finally {
      setSavingReflection(false);
    }
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

                        {/* Verses - Natural text wrapping */}
                        {isChapterExpanded && (
                          <div 
                            className="mt-1 space-y-1 pl-2 bg-stone-50/30 rounded w-full min-w-0"
                          >
                            {/* Visible scrollbar indicator */}
                            <div className="md:hidden h-1 bg-gradient-to-r from-stone-300 via-amber-400 to-stone-300 rounded-full mb-2 opacity-60" />
                            
                            {/* Chapter Reflection Item (Verse 0) - Inserted before verses */}
                            {(() => {
                              const isChapterSelected = selectedVerse?.book === abbrev &&
                                selectedVerse?.chapter === chapter.number &&
                                selectedVerse?.verse === 0;
                              const isAdmin = userRole === '⭐⭐⭐' || userRole === 'admin' || userRole === 'ADMIN';
                              return (
                                <div
                                  onClick={() => {
                                    // Set verse 0 for chapter reflection
                                    onSelectVerse({
                                      book: abbrev,
                                      bookName: book.name,
                                      chapter: chapter.number,
                                      verse: 0,
                                      text: `${book.name} ${chapter.number}장 전체`
                                    });
                                  }}
                                  className={`text-left p-3 rounded transition-all text-sm cursor-pointer min-w-0 border-l-2 ${
                                    isChapterSelected
                                      ? 'bg-purple-100 border-purple-500 text-purple-900'
                                      : 'bg-gradient-to-r from-stone-100 to-white hover:bg-stone-50 text-stone-700 border-stone-300'
                                  }`}
                                  style={{ 
                                    lineHeight: '1.8'
                                  }}
                                >
                                  <span className="font-serif text-xs text-stone-500 mr-2 select-none">📖</span>
                                  <span className="font-serif font-medium">
                                    {isAdmin 
                                      ? `${chapter.number}장 전체 주석 (Admin Only)`
                                      : `${chapter.number}장 전체 묵상/번역`
                                    }
                                  </span>
                                  <span className="text-xs text-stone-400 ml-2">
                                    (Chapter Overview)
                                  </span>
                                </div>
                              );
                            })()}
                            
                            {chapter.verses.map((verse, verseIdx) => {
                              const isSelected =
                                selectedVerse?.book === abbrev &&
                                selectedVerse?.chapter === chapter.number &&
                                selectedVerse?.verse === verseIdx + 1;
                              const verseKey = `${abbrev}-${chapter.number}-${verseIdx + 1}`;
                              const isVerseExpanded = expandedVerse === verseKey;
                              const reflections = verseReflections[verseKey] || [];
                              
                              const krvText = getKRVText(abbrev, chapter.number, verseIdx + 1);

                              return (
                                <div key={verseIdx} className="space-y-1">
                                  {/* Verse Content */}
                                  <div
                                    onClick={() =>
                                      handleVerseClick(
                                        book,
                                        chapter.number,
                                        verseIdx + 1,
                                        verse
                                      )
                                    }
                                    className={`text-left p-3 rounded transition-all text-sm cursor-pointer min-w-0 ${
                                      isSelected
                                        ? 'bg-amber-100 border-l-2 border-amber-500 text-stone-800'
                                        : 'bg-white hover:bg-stone-100 text-stone-600'
                                    }`}
                                    style={{ lineHeight: '1.8' }}
                                  >
                                    <span className="font-serif text-xs text-stone-400 mr-2 select-none">
                                      {verseIdx + 1}
                                    </span>
                                    <span className="font-greek text-stone-700 break-all whitespace-pre-wrap w-full overflow-hidden" style={{ lineHeight: '1.8' }}>
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
                                      <p className="mt-2 text-sm text-stone-600 font-serif border-t border-stone-200 pt-2 break-all whitespace-pre-wrap w-full overflow-hidden">
                                        {krvText}
                                      </p>
                                    )}
                                    {/* Reflection indicator */}
                                    <div className="mt-2 flex items-center gap-2 text-xs text-stone-400">
                                      <MessageCircle className="w-3 h-3" />
                                      <span>{reflections.length > 0 ? `${reflections.length}개의 묵상` : '묵상 남기기'}</span>
                                      {isVerseExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                    </div>
                                  </div>
                                  
                                  {/* Inline Reflection Panel (Accordion) */}
                                  {isVerseExpanded && (
                                    <div className="bg-stone-50 rounded-lg border border-stone-200 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                                      {/* Reflection List */}
                                      <div className="p-3 space-y-3 max-h-60 overflow-y-auto">
                                        {loadingReflections ? (
                                          <div className="flex items-center justify-center py-4">
                                            <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                                          </div>
                                        ) : reflections.length === 0 ? (
                                          <p className="text-xs text-stone-400 text-center py-2">
                                            아직 묵상이 없습니다. 첫 번째 묵상을 남겨보세요!
                                          </p>
                                        ) : (
                                          reflections.map((reflection) => (
                                            <div key={reflection.id} className="bg-white p-3 rounded border border-stone-100">
                                              <p className="text-sm text-stone-700 leading-relaxed break-words">
                                                {reflection.content}
                                              </p>
                                              <div className="mt-2 flex items-center gap-2 text-xs text-stone-400">
                                                <span className="font-medium">{reflection.profiles?.nickname || reflection.user_id.slice(0, 8)}</span>
                                                <span>•</span>
                                                <span>{new Date(reflection.created_at).toLocaleDateString('ko-KR')}</span>
                                              </div>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                      
                                      {/* Write Reflection */}
                                      {isLoggedIn && (
                                        <div className="p-3 border-t border-stone-200 bg-stone-100/50">
                                          <textarea
                                            value={newReflection}
                                            onChange={(e) => setNewReflection(e.target.value)}
                                            placeholder={`${book.name} ${chapter.number}:${verseIdx + 1}에 대한 묵상을 작성하세요...`}
                                            className="w-full h-20 p-2 text-sm bg-white border border-stone-200 rounded resize-none focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 placeholder:text-stone-400"
                                          />
                                          <div className="flex justify-end mt-2">
                                            <button
                                              onClick={() => handleSaveReflection(abbrev, chapter.number, verseIdx + 1)}
                                              disabled={!newReflection.trim() || savingReflection}
                                              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors"
                                            >
                                              {savingReflection ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                              ) : (
                                                <Send className="w-3 h-3" />
                                              )}
                                              {savingReflection ? '저장 중...' : '묵상 남기기'}
                                            </button>
                                          </div>
                                        </div>
                                      )}
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
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State Dashboard - Central Command Center */}
      {!expandedBook && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-2xl mx-auto space-y-5">
            {/* GNT Introduction Card */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-lg font-serif font-semibold text-stone-800">
                  GNT 헬라어 신약 성경
                </h3>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed mb-3">
                SBLGNT는 세계적인 성서학회(SBL)에서 편집한 현대 비평본 헬라어 신약 성경으로, 
                원문의 정확성을 추구하는 현대 성서학의 표준 텍스트입니다. 본 앱은 이 원문을 바탕으로 연구와 묵상을 돕습니다.
              </p>
              <p className="text-xs text-stone-500">
                위의 성경 패널에서 성경을 선택하여 원어 헬라어와 개역한글(KRV)을 함께 읽어보세요.
              </p>
            </div>
            
            {/* Feature Cards - 3 Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Community Cafe Card */}
              <a 
                href="https://naver.me/xXnPSav8" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white rounded-lg p-4 border border-stone-200 hover:border-amber-300 hover:shadow-md transition-all group"
              >
                <div className="w-8 h-8 bg-amber-50 rounded-full flex items-center justify-center mb-2 group-hover:bg-amber-100">
                  <Coffee className="w-4 h-4 text-amber-600" />
                </div>
                <h4 className="text-sm font-medium text-stone-700 mb-1 flex items-center gap-1">
                  기독교 커뮤니티 카페
                  <ExternalLink className="w-3 h-3 text-stone-400" />
                </h4>
                <p className="text-xs text-stone-500">동역자들과 더 깊은 소통을 나누는 카페로 초대합니다.</p>
              </a>
              
              {/* Sermon Archive Card */}
              <a 
                href="https://sermon-archive.vercel.app/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white rounded-lg p-4 border border-stone-200 hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center mb-2 group-hover:bg-blue-100">
                  <Archive className="w-4 h-4 text-blue-600" />
                </div>
                <h4 className="text-sm font-medium text-stone-700 mb-1 flex items-center gap-1">
                  설교 아카이브
                  <ExternalLink className="w-3 h-3 text-stone-400" />
                </h4>
                <p className="text-xs text-stone-500">저명한 설교자들의 강해 설교 번역본을 한곳에서 만나보세요.</p>
              </a>
              
              {/* Community Board Card */}
              <button 
                onClick={() => onFocusCommunity?.()}
                className="bg-white rounded-lg p-4 border border-stone-200 hover:border-purple-300 hover:shadow-md transition-all group text-left"
              >
                <div className="w-8 h-8 bg-purple-50 rounded-full flex items-center justify-center mb-2 group-hover:bg-purple-100">
                  <MessageCircle className="w-4 h-4 text-purple-600" />
                </div>
                <h4 className="text-sm font-medium text-stone-700 mb-1 flex items-center gap-1">
                  커뮤니티 게시판
                  <ArrowRight className="w-3 h-3 text-stone-400" />
                </h4>
                <p className="text-xs text-stone-500">전체 동역자들의 묵상과 나눔이 있는 글로벌 게시판으로 이동합니다.</p>
              </button>
            </div>
            
            {/* Pinned Posts / Announcements */}
            {loadingPinnedPosts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
              </div>
            ) : pinnedPosts.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Pin className="w-4 h-4 text-amber-600" />
                  <h4 className="text-sm font-medium text-stone-700">공지사항</h4>
                </div>
                {pinnedPosts.map((post: any) => (
                  <button 
                    key={post.id}
                    onClick={() => onFocusCommunity?.(post.id)}
                    className="w-full text-left bg-white rounded-lg p-4 border border-amber-200 bg-amber-50/20 hover:bg-amber-50/40 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium shrink-0">
                        공지
                      </span>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-sm font-medium text-stone-800 mb-1 line-clamp-1">{post.title || '제목 없음'}</h5>
                        <p className="text-xs text-stone-500 leading-relaxed break-words line-clamp-2">{post.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-stone-400">
                            {post.profiles?.nickname || post.profiles?.username || '익명 동역자'}
                          </span>
                          <span className="text-xs text-stone-300">·</span>
                          <span className="text-xs text-stone-400">
                            {new Date(post.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-amber-400 mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

// fix: v1.1
