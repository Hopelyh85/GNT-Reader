'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SelectedVerse, SelectedWord } from '@/app/types';
import { PenLine, BookText, Save, Loader2, BookOpen, Search, X } from 'lucide-react';
import { getSupabase, saveMyStudyNote, bookNameMap, getPublicReflections, saveTranslation, getUserTranslation } from '../lib/supabase';
import { fallbackFixer, getSmartLemmaWithDatabase } from '../lib/greekMapping';

interface StudyPanelProps {
  selectedVerse: SelectedVerse | null;
  selectedWord: SelectedWord | null;
  isLoggedIn: boolean;
  userRole: string;
  userName: string;
  onClose?: () => void;
}

interface LexiconEntry {
  lemma?: string;
  transliteration: string;
  definition: string;
  korean_def?: string;
  korean_pron?: string;
  strongs: string;
  frequency: string;
}

interface NoteData {
  user_nickname: string;
  verse_ref: string;
  book: string;
  chapter: number;
  verse: number;
  ministry_note: string;
  commentary: string;
  updated_at: string;
}

export function StudyPanel({ selectedVerse, selectedWord, isLoggedIn, userRole, userName, onClose }: StudyPanelProps) {
  const router = useRouter();
  const isAdmin = userRole === 'ADMIN';
  const canWrite = isLoggedIn;
  // Chapter Mode: when verse is 0 (chapter-level reflection)
  const isChapterMode = selectedVerse?.verse === 0;
  const [ministryNote, setMinistryNote] = useState('');
  const [commentary, setCommentary] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [noteTimestamp, setNoteTimestamp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Unified verse content state (translations + reflections from reflections table)
  const [verseTranslations, setVerseTranslations] = useState<any[]>([]);
  const [verseReflections, setVerseReflections] = useState<any[]>([]);
  const [loadingVerseContent, setLoadingVerseContent] = useState(false);
  
  // Dictionary state
  const [lexicon, setLexicon] = useState<Record<string, LexiconEntry>>({});
  const [lexiconLoading, setLexiconLoading] = useState(false);
  
  // Translation states
  const [koreanTranslation, setKoreanTranslation] = useState<string>('');
  const [netTranslation, setNetTranslation] = useState<string>('');
  const [kjvTranslation, setKjvTranslation] = useState<string>('');
  const [translationLoading, setTranslationLoading] = useState(false);
  
  // Local translation data cache
  const [krvData, setKrvData] = useState<Record<string, string>>({});
  const [netData, setNetData] = useState<Record<string, string>>({});
  const [kjvData, setKjvData] = useState<Record<string, string>>({});
  const [translationsLoaded, setTranslationsLoaded] = useState(false);

  // Use Korean book name for verseRef consistency
  const koreanBookName = selectedVerse ? (bookNameMap[selectedVerse.book] || selectedVerse.book) : '';
  // Chapter mode: verse is 0, use "장 전체" format
  const verseRef = selectedVerse
    ? isChapterMode 
      ? `${koreanBookName} ${selectedVerse.chapter}장 전체`
      : `${koreanBookName} ${selectedVerse.chapter}:${selectedVerse.verse}`
    : '';
  
  // Load local translation JSON files on mount
  useEffect(() => {
    async function loadLocalTranslations() {
      try {
        // Load KRV data
        const krvResponse = await fetch('/data/krv_bible.json');
        if (krvResponse.ok) {
          const krvJson = await krvResponse.json();
          setKrvData(krvJson);
        }
        
        // Load NET data
        const netResponse = await fetch('/data/net_bible.json');
        if (netResponse.ok) {
          const netJson = await netResponse.json();
          setNetData(netJson);
        }
        
        // Load KJV data
        const kjvResponse = await fetch('/data/kjv_bible.json');
        if (kjvResponse.ok) {
          const kjvJson = await kjvResponse.json();
          setKjvData(kjvJson);
        }
        
        setTranslationsLoaded(true);
        console.log('✅ Local translations loaded');
      } catch (err) {
        console.error('❌ Failed to load local translations:', err);
      }
    }
    
    loadLocalTranslations();
  }, []);

  // Load translations when verse changes (from local cache)
  useEffect(() => {
    if (!selectedVerse || !translationsLoaded) {
      setKoreanTranslation('');
      setNetTranslation('');
      setKjvTranslation('');
      return;
    }
    
    // Set loading state when verse changes
    setTranslationLoading(true);
    
    const key = `${selectedVerse.book}_${selectedVerse.chapter}_${selectedVerse.verse}`;
    
    // Small delay to simulate loading and prevent flash
    setTimeout(() => {
      // Get KRV translation
      setKoreanTranslation(krvData[key] || '');
      
      // Get NET translation
      setNetTranslation(netData[key] || '');
      
      // Get KJV translation
      setKjvTranslation(kjvData[key] || '');
      
      setTranslationLoading(false);
    }, 100);
    
  }, [selectedVerse, translationsLoaded, krvData, netData, kjvData]);

  // Load existing note when verse changes via direct Supabase query
  useEffect(() => {
    if (!selectedVerse) return;

    async function loadNote() {
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setMinistryNote('');
          setCommentary('');
          setError(null);
          return;
        }

        // Query Supabase directly for user's note
        const { data, error } = await supabase
          .from('study_notes')
          .select('*')
          .eq('user_id', user.id)
          .eq('verse_ref', verseRef)
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Supabase error loading note:', error.message, error.details);
          setMinistryNote('');
          setCommentary('');
          setNoteTimestamp(null);
          setError('노트 로딩 중 오류: ' + error.message);
          return;
        }
        
        if (data) {
          setMinistryNote(data.content || '');
          setCommentary(data.commentary || '');
          setNoteTimestamp(data.created_at || data.updated_at || null);
        } else {
          setMinistryNote('');
          setCommentary('');
          setNoteTimestamp(null);
        }
        setError(null);
      } catch (err: any) {
        console.error('Error loading note:', err?.message || err);
        setMinistryNote('');
        setCommentary('');
        setError('노트 로딩 중 오류: ' + (err?.message || 'Unknown error'));
      }
    }

    loadNote();
  }, [selectedVerse, verseRef]);

  // Load unified verse content (translations + reflections) for current verse
  useEffect(() => {
    if (!selectedVerse) {
      setVerseTranslations([]);
      setVerseReflections([]);
      return;
    }

    async function loadVerseContent() {
      setLoadingVerseContent(true);
      try {
        // Load user's own translation
        const userTranslation = await getUserTranslation(verseRef);
        if (userTranslation) {
          setVerseTranslations([{ content: userTranslation, isMine: true }]);
        } else {
          setVerseTranslations([]);
        }
        
        // Load community reflections
        const result = await getPublicReflections(verseRef, 1, 10);
        // Filter out translations (we handle them separately)
        const reflections = (result.data || []).filter((r: any) => r.category !== 'translation');
        setVerseReflections(reflections);
      } catch (err: any) {
        console.error('Error loading verse content:', err?.message);
      } finally {
        setLoadingVerseContent(false);
      }
    }

    loadVerseContent();
  }, [selectedVerse, verseRef]);

  // Save note via direct Supabase call
  const handleSave = useCallback(async () => {
    if (!selectedVerse || !canWrite) return;

    setSaving(true);
    setError(null);

    try {
      // Save study note (for commentary/admin notes)
      await saveMyStudyNote(
        verseRef,
        koreanBookName,  // Korean book name for consistency
        selectedVerse.chapter,
        selectedVerse.verse,
        ministryNote,
        true, // isPrivate
        commentary // 관리자 주석도 함께 저장
      );
      
      // Also save translation to reflections table (unified data structure)
      if (ministryNote.trim()) {
        await saveTranslation(
          verseRef,
          koreanBookName,
          selectedVerse.chapter,
          selectedVerse.verse,
          ministryNote,
          isChapterMode ? 'chapter_overview' : 'translation' // Different category for chapter mode
        );
      }

      setLastSaved(new Date());
      setNoteTimestamp(new Date().toISOString());
    } catch (err: any) {
      console.error('Error saving note:', err?.message || err, err?.details);
      setError('저장 중 오류가 발생했습니다: ' + (err?.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }, [
    selectedVerse,
    verseRef,
    koreanBookName,
    ministryNote,
    commentary,
    canWrite,
  ]);

  // Auto-save after 1 second of inactivity (debounce)
  // Use refs to avoid circular dependencies and infinite loops
  const ministryNoteRef = useRef(ministryNote);
  const commentaryRef = useRef(commentary);
  const selectedVerseRef = useRef(selectedVerse);
  const savingRef = useRef(saving);
  
  useEffect(() => {
    ministryNoteRef.current = ministryNote;
  }, [ministryNote]);
  
  useEffect(() => {
    commentaryRef.current = commentary;
  }, [commentary]);
  
  useEffect(() => {
    selectedVerseRef.current = selectedVerse;
  }, [selectedVerse]);
  
  useEffect(() => {
    savingRef.current = saving;
  }, [saving]);
  
  // Stable save function using refs (not in dependency array)
  const autoSave = useCallback(async () => {
    const currentVerse = selectedVerseRef.current;
    const currentMinistryNote = ministryNoteRef.current;
    const currentCommentary = commentaryRef.current;
    
    if (!currentVerse || !canWrite || savingRef.current) return;

    setSaving(true);
    setError(null);

    try {
      const currentKoreanBookName = bookNameMap[currentVerse.book] || currentVerse.book;
      const currentVerseRef = `${currentKoreanBookName} ${currentVerse.chapter}:${currentVerse.verse}`;
      
      await saveMyStudyNote(
        currentVerseRef,
        currentKoreanBookName,
        currentVerse.chapter,
        currentVerse.verse,
        currentMinistryNote,
        true,
        currentCommentary // 관리자 주석도 함께 저장
      );

      setLastSaved(new Date());
      setNoteTimestamp(new Date().toISOString());
    } catch (err: any) {
      console.error('Error auto-saving note:', err?.message || err);
    } finally {
      setSaving(false);
    }
  }, [canWrite]); // Only depends on canWrite

  const handleToggleLike = async (reflectionId: string, currentLiked: boolean) => {
    if (!isLoggedIn) {
      alert('로그인 후 좋아요를 누를 수 있습니다.');
      return;
    }
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (currentLiked) {
        // Remove like
        await supabase.from('reflection_likes').delete().eq('reflection_id', reflectionId).eq('user_id', user.id);
      } else {
        // Add like
        await supabase.from('reflection_likes').insert({ reflection_id: reflectionId, user_id: user.id });
      }
      // Refresh data
      fetchVerseContent();
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const fetchVerseContent = async () => {
    if (!selectedVerse) return;
    
    setLoadingVerseContent(true);
    try {
      // Load user's own translation
      const userTranslation = await getUserTranslation(verseRef);
      if (userTranslation) {
        setVerseTranslations([{ content: userTranslation, isMine: true }]);
      } else {
        setVerseTranslations([]);
      }
      
      // Load community reflections
      const result = await getPublicReflections(verseRef, 1, 10);
      // Filter out translations (we handle them separately)
      const reflections = (result.data || []).filter((r: any) => r.category !== 'translation');
      setVerseReflections(reflections);
    } catch (err: any) {
      console.error('Error loading verse content:', err?.message);
    } finally {
      setLoadingVerseContent(false);
    }
  };

  useEffect(() => {
    if (!selectedVerse) return;

    const timer = setTimeout(() => {
      autoSave();
    }, 1000);

    return () => clearTimeout(timer);
  }, [ministryNote, commentary, selectedVerse, autoSave]);

  // Load lexicon data on mount
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

  // Local cleanSymbols function - removes punctuation but preserves apostrophes for elision
  const cleanSymbols = (text: string): string => {
    return text.replace(/[.,;··⸀⸁⸂⸃⸄⸅\(\)]/g, '').trim();
  };

  // Get definition with symbol cleaning and fallback
  const getWordDefinition = (lemma: string, surfaceForm: string): LexiconEntry | null => {
    // Two-track: clean symbols for search, keep original for display
    const cleanedLemma = cleanSymbols(lemma);
    const cleanedSurface = cleanSymbols(surfaceForm);
    
    const searchKey = fallbackFixer[cleanedSurface] || fallbackFixer[cleanedLemma] || cleanedLemma;
    const stripped = cleanedSurface.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    // 1. Try fallback/lemma first
    if (lexicon[searchKey]) {
      return lexicon[searchKey];
    }
    // 2. Fallback to cleaned surface form
    if (lexicon[cleanedSurface]) {
      return lexicon[cleanedSurface];
    }
    // 3. Fallback to accent-stripped
    if (lexicon[stripped]) {
      return lexicon[stripped];
    }
    return null;
  };

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

  // Show panel when verse OR word is selected
  const showPanel = selectedVerse || selectedWord;

  if (!showPanel) {
    return (
      <div className="hidden md:flex h-full items-center justify-center p-8">
        <div className="text-center text-stone-400">
          <BookText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-serif text-sm">
            좌측 패널에서 성경 구절을 선택하여<br />묵상을 시작하세요
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Backdrop */}
      <div 
        className="md:hidden fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Main Panel - Mobile: Bottom Sheet, Desktop: Sidebar */}
      <div className="
        md:relative md:w-96 md:h-full
        fixed bottom-0 left-0 w-full h-[50vh] md:h-full
        overflow-hidden
        bg-white md:bg-white
        rounded-t-2xl md:rounded-none
        shadow-2xl md:shadow-none
        z-50 md:z-auto
        flex flex-col
        animate-slide-up md:animate-none
      ">
        {/* iOS-style Drag Handle - Mobile only */}
        <div className="md:hidden pt-2 pb-1 flex-shrink-0">
          <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto" />
        </div>
        
        {/* Header */}
        <div className="px-4 py-3 bg-stone-100 border-b border-stone-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PenLine className="w-4 h-4 text-stone-600" />
              <h2 className="text-sm font-serif font-semibold text-stone-700">
                Study Panel {isAdmin && <span className="text-amber-600">👑</span>}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {lexiconLoading && (
                <div className="flex items-center gap-1 text-xs text-stone-500">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>사전 로딩...</span>
                </div>
              )}
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
              ) : lastSaved ? (
                <span className="text-xs text-stone-400 hidden sm:inline">
                  저장됨 {lastSaved.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              ) : null}
              
              {/* Mobile Close Button */}
              {onClose && (
                <button
                  onClick={onClose}
                  className="md:hidden p-1.5 hover:bg-stone-200 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-stone-600" />
                </button>
              )}
              
              <button
                onClick={handleSave}
                disabled={saving || !canWrite}
                className="flex items-center gap-1 px-3 py-1.5 bg-stone-700 text-white text-xs rounded hover:bg-stone-600 disabled:opacity-50 transition-colors"
              >
                <Save className="w-3 h-3" />
                저장
              </button>
            </div>
          </div>
        </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Content - CLEAN 4 SECTIONS */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* 1. 단어 분석 (Word Analysis) */}
        {selectedWord?.word && (
          <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-lg">
            <label className="flex items-center gap-2 text-sm font-serif font-medium text-amber-700 mb-3">
              <Search className="w-3 h-3" />
              단어 분석
            </label>
              {(() => {
                const w = selectedWord?.word;
                if (!w || typeof w !== 'object') return <p className="text-sm text-red-500">⚠️ 단어 데이터 없음</p>;
                
                // 1. Clean the raw text and lemma completely first
                const displayLemma = String(w?.lemma || w?.text || '');
                const rawText = String(w?.text || '');
                const morphCode = String(w?.morph || '');
                
                // 2. Strict cleaning: remove ALL punctuation and critical symbols BEFORE lookup
                const cleanRawText = rawText.replace(/[.,;··⸀⸁⸂⸃⸄⸅\(\)]/g, '').trim();
                const cleanRawLemma = displayLemma.replace(/[.,;··⸀⸁⸂⸃⸄⸅\(\)]/g, '').trim();
                
                // 3. Check fallbackFixer using the cleaned text
                const searchLemma = fallbackFixer[cleanRawLemma] || fallbackFixer[cleanRawText] || cleanRawLemma || cleanRawText;
                
                // 4. 사전 검색 (searchLemma 사용)
                const strippedAccent = searchLemma.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                const entry = lexicon[searchLemma] || lexicon[strippedAccent] || lexicon[cleanRawText];
                
                return (
                <div className="space-y-3">
                  {/* Header: Surface Form + Lemma (원본 그대로 표시) */}
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-greek text-3xl font-bold text-amber-700 break-words overflow-hidden">
                      {String(w?.text || '')}
                    </span>
                    {displayLemma && displayLemma !== String(w?.text || '') && (
                      <span className="text-sm text-stone-500">
                        (원형: <span className="font-greek text-amber-600">{String(displayLemma)}</span>)
                      </span>
                    )}
                  </div>
                  {/* DEBUG: Show search key */}
                  <p className="text-sm text-stone-500 mb-1 font-mono">
                    (검색원형: <span className="text-amber-600 font-greek">{searchLemma}</span>)
                  </p>
                  <div className="text-sm text-blue-700 font-medium">
                    {parseMorphCode(morphCode, searchLemma, rawText)}
                  </div>
                  {entry?.definition && (
                    <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap break-words overflow-hidden">{String(entry.definition)}</p>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* 2. 원어 사전 (Strong's Dictionary) */}
        {selectedWord?.word && (
          <div className="border-t border-stone-200 pt-4">
            <label className="flex items-center gap-2 text-sm font-serif font-medium text-blue-700 mb-3">
              <BookOpen className="w-3 h-3" />
              원어 사전 (Strong's Dictionary)
            </label>
            {(() => {
              const w = selectedWord?.word;
              if (!w || typeof w !== 'object') return <p className="text-sm text-red-500">⚠️ 단어 데이터 없음</p>;
              
              // 1. Clean the raw text and lemma completely first
              const displayLemma = String(w?.lemma || w?.text || '');
              const rawText = String(w?.text || '');
              
              // 2. Strict cleaning: remove ALL punctuation and critical symbols BEFORE lookup
              const cleanRawText = rawText.replace(/[.,;··⸀⸁⸂⸃⸄⸅\(\)]/g, '').trim();
              const cleanRawLemma = displayLemma.replace(/[.,;··⸀⸁⸂⸃⸄⸅\(\)]/g, '').trim();
              
              // 3. Check fallbackFixer first, then query database with smart fallback
              // Note: This is computed synchronously for now, will be enhanced with useEffect later
              let searchLemma = fallbackFixer[cleanRawLemma] || 
                                fallbackFixer[cleanRawText];
              
              // If not in fallback, use clean lemma directly (async DB call would be handled via useEffect)
              if (!searchLemma) {
                searchLemma = cleanRawLemma || cleanRawText;
              }
              
              // 4. 사전 검색 (searchLemma 사용)
              const strippedAccent = searchLemma.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
              const entry = lexicon[searchLemma] || lexicon[strippedAccent] || lexicon[cleanRawText];
              
              // HOTFIX: Hardcode corrupted entries (Director's emergency fix)
              const getFixedDefinition = (lemma: string, origEntry: any) => {
                // G3303 μέν data corruption fix
                if (lemma === 'μέν') {
                  return {
                    definition: "[Strongs] affirmation, yea, surely\n[KJV] verily, indeed, surely, truly, doubtless\n\n진실로, 참으로, 한편으로는 (affirmation/concession particle)",
                    transliteration: 'men',
                    strongs: 'G3303',
                    korean_def: '진실로, 참으로, 한편으로는 (불변화사)',
                    manual: true
                  };
                }
                return origEntry;
              };
              
              const fixedEntry = getFixedDefinition(searchLemma, entry);
              
              return (
                <div className="space-y-2 p-3 bg-blue-50/50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-greek text-xl font-bold text-blue-700">
                      {String(displayLemma)}
                    </span>
                  </div>
                  {/* Always show lemma and morphology info */}
                  <div className="space-y-2">
                    {/* Lemma display (always shown, even for proper nouns) */}
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm text-stone-500">원형 (Lemma):</span>
                      <span className="font-greek font-semibold text-stone-700">
                        {String(searchLemma || displayLemma)}
                      </span>
                      {w?.morph && (
                        <span className="text-xs font-mono text-stone-400 bg-stone-100 px-2 py-0.5 rounded">
                          {String(w.morph)}
                        </span>
                      )}
                    </div>
                    
                    {/* Check if it's a proper noun based on morph code */}
                    {(() => {
                      const morphCode = String(w?.morph || '');
                      const isProperNoun = morphCode.startsWith('N') || morphCode.includes('PN') || morphCode.includes('NP');
                      const isVerb = morphCode.startsWith('V');
                      
                      return fixedEntry ? (
                        <>
                          {/* Header: Strong's + [English pron | Korean pron] */}
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="font-semibold text-stone-800">
                              {String(fixedEntry?.strongs || 'N/A')}
                              {fixedEntry?.manual && <span className="ml-1 text-xs text-amber-600">[수정됨]</span>}
                            </span>
                            <span className="text-sm text-stone-500 font-mono">
                              [{String(fixedEntry?.transliteration || '')}{fixedEntry?.korean_pron && ` | ${String(fixedEntry.korean_pron)}`}]
                            </span>
                          </div>
                          
                          {/* 1. Korean meaning (TOP priority) */}
                          {fixedEntry?.korean_def ? (
                            <div className="space-y-1">
                              <p className="text-base font-bold text-blue-700 leading-relaxed">
                                {String(fixedEntry.korean_def)}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-sm font-bold text-stone-400">[한글 뜻 준비중]</p>
                            </div>
                          )}
                          
                          {/* 2. English definition - split Strongs and KJV */}
                          <div className="space-y-1 border-l-2 border-stone-300 pl-2 mt-2">
                            {fixedEntry?.definition?.includes('[Strongs]') ? (
                              <>
                                <p className="text-xs text-stone-600">
                                  <span className="font-semibold text-stone-700">Strongs:</span>{' '}
                                  {String(fixedEntry?.definition?.split('[KJV]')?.[0]?.replace('[Strongs]', '')?.trim() || '')}
                                </p>
                                {fixedEntry?.definition?.includes('[KJV]') && (
                                  <p className="text-xs text-stone-600">
                                    <span className="font-semibold text-stone-700">KJV:</span>{' '}
                                    {String(fixedEntry?.definition?.split('[KJV]')?.[1]?.trim() || '')}
                                  </p>
                                )}
                              </>
                            ) : (
                              <p className="text-xs text-stone-600 whitespace-pre-line">
                                {String(fixedEntry?.definition || '')}
                              </p>
                            )}
                          </div>
                        </>
                      ) : (
                        /* No dictionary data - differentiate between proper nouns and missing entries */
                        <div className="space-y-2">
                          {isProperNoun ? (
                            <div className="p-2 bg-amber-50 border border-amber-200 rounded">
                              <p className="text-sm text-amber-700">
                                <span className="font-semibold">📍 고유명사 (Proper Noun)</span>
                                <span className="text-xs text-amber-600 block mt-1">
                                  이 단어는 인명, 지명, 또는 사전에 등록되지 않은 고유명사입니다.
                                </span>
                              </p>
                            </div>
                          ) : isVerb ? (
                            <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                              <p className="text-sm text-blue-700">
                                <span className="font-semibold">⚡ 동사 (Verb)</span>
                                <span className="text-xs text-blue-600 block mt-1">
                                  사전 데이터를 찾을 수 없습니다. (원형: {String(searchLemma || displayLemma)})
                                </span>
                              </p>
                            </div>
                          ) : (
                            <div className="p-2 bg-stone-50 border border-stone-200 rounded">
                              <p className="text-sm text-stone-600">
                                <span className="font-semibold">📝 단어 정보</span>
                                <span className="text-xs text-stone-500 block mt-1">
                                  사전 데이터를 찾을 수 없습니다. (원형: {String(searchLemma || displayLemma)})
                                </span>
                              </p>
                            </div>
                          )}
                          {/* Show morphology if available */}
                          {w?.morph && (
                            <div className="text-xs text-stone-500">
                              <span className="font-semibold">문법코드:</span> {String(w.morph)}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* 3. 본문 대조 (GNT / KRV / NET / KJV) - Only show when verse selected (NOT in Chapter Mode) */}
        {selectedVerse && !isChapterMode && (
        <div className="border-t border-stone-200 pt-4 space-y-2 min-w-0">
          <label className="flex items-center gap-2 text-sm font-serif font-medium text-stone-700 mb-2">
            <span className="w-1.5 h-1.5 bg-stone-500 rounded-full" />
            본문 대조 (Comparative Study)
          </label>
          <div className="p-3 bg-amber-50 rounded border-l-4 border-amber-500">
            <p className="text-xs font-semibold text-amber-700 mb-1">📜 GNT 원문</p>
            <p className="text-sm text-stone-700 font-greek leading-relaxed break-all whitespace-pre-wrap w-full overflow-hidden">{String(selectedVerse?.text || '')}</p>
          </div>
          
          <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-500">
            <p className="text-xs font-semibold text-blue-700 mb-1">🇰🇷 개역한글 (KRV)</p>
            {!translationsLoaded || translationLoading ? (
              <p className="text-sm text-stone-500">📖 성경 데이터 로딩 중...</p>
            ) : koreanTranslation ? (
              <p className="text-sm text-stone-700 leading-relaxed break-all whitespace-pre-wrap w-full overflow-hidden">{String(koreanTranslation)}</p>
            ) : (
              <p className="text-sm text-amber-600">⚠️ 해당 절의 개역한글 번역 데이터가 없습니다</p>
            )}
          </div>
          
          <div className="p-3 bg-green-50 rounded border-l-4 border-green-500">
            <p className="text-xs font-semibold text-green-700 mb-1">🌐 NET (New English Translation)</p>
            {!translationsLoaded || translationLoading ? (
              <p className="text-sm text-stone-500">📖 Loading NET translation...</p>
            ) : netTranslation ? (
              <p className="text-sm text-stone-700 leading-relaxed break-all whitespace-pre-wrap w-full overflow-hidden">{String(netTranslation)}</p>
            ) : (
              <p className="text-sm text-amber-600">⚠️ 해당 절의 NET 영어 번역 데이터가 없습니다</p>
            )}
          </div>
          
          <div className="p-3 bg-indigo-50 rounded border-l-4 border-indigo-500">
            <p className="text-xs font-semibold text-indigo-700 mb-1">📜 KJV (King James Version)</p>
            {!translationsLoaded || translationLoading ? (
              <p className="text-sm text-stone-500">📖 Loading KJV translation...</p>
            ) : kjvTranslation ? (
              <p className="text-sm text-stone-700 leading-relaxed break-all whitespace-pre-wrap w-full overflow-hidden">{String(kjvTranslation)}</p>
            ) : (
              <p className="text-sm text-amber-600">⚠️ 해당 절의 KJV 영어 번역 데이터가 없습니다</p>
            )}
          </div>
        </div>
        )}

        {/* 3b. GNT Chapter Text - Hidden in Chapter Mode (Verse 0) */}
        {selectedVerse && !isChapterMode && (
        <div className="border-t border-stone-200 pt-4 space-y-2">
          <label className="flex items-center gap-2 text-sm font-serif font-medium text-stone-700 mb-2">
            <span className="w-1.5 h-1.5 bg-stone-500 rounded-full" />
            📜 GNT 원문 (Chapter Text)
          </label>
          <div className="p-3 bg-amber-50 rounded border-l-4 border-amber-500">
            <p className="text-sm text-stone-700 font-greek leading-relaxed break-all whitespace-pre-wrap w-full overflow-hidden">{String(selectedVerse?.text || '')}</p>
          </div>
        </div>
        )}

        {/* 4. 개인 번역 (Translation) - Available in both Verse and Chapter Mode */}
        <div className="border-t border-stone-200 pt-4 space-y-2">
          <label className="flex items-center gap-2 text-sm font-serif font-medium text-blue-700">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
            {isChapterMode ? '장별 개요 (Overview)' : '개인 번역 (Translation)'}
            {!canWrite && <span className="text-xs text-blue-600">(로그인 필요)</span>}
          </label>
          <textarea
            value={ministryNote}
            onChange={(e) => canWrite && setMinistryNote(e.target.value)}
            disabled={!canWrite}
            placeholder={canWrite 
              ? isChapterMode 
                ? "이 장의 주요 내용과 핵심 메시지를 정리해보세요..." 
                : "성경 본문을 직접 번역해보세요..." 
              : "로그인 후 작성할 수 있습니다."}
            className="w-full h-32 p-3 text-sm leading-relaxed bg-blue-50/30 border border-blue-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-stone-400 disabled:bg-stone-100"
          />
        </div>

        {/* 5. 주석 (Commentary) - Admin Only */}
        {isAdmin && selectedVerse && (
          <div className="border-t border-stone-200 pt-4 space-y-2">
            <label className="flex items-center gap-2 text-sm font-serif font-medium text-purple-700">
              <BookOpen className="w-3 h-3 text-purple-500" />
              주석 (Commentary) - 관리자용
              <span className="text-xs text-purple-500">(Admin Only)</span>
            </label>
            <textarea
              value={commentary}
              onChange={(e) => setCommentary(e.target.value)}
              placeholder="관리자용 주석을 입력하세요... (Public Commentary)"
              className="w-full h-32 p-3 text-sm leading-relaxed bg-purple-50/30 border border-purple-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-200 placeholder:text-stone-400"
            />
          </div>
        )}

        {/* 6. 커뮤니티 묵상 (Community Reflections from reflections table) */}
        {selectedVerse && (
          <div className="border-t border-stone-200 pt-4 space-y-3">
            <label className="flex items-center gap-2 text-sm font-serif font-medium text-stone-700">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
              커뮤니티 묵상 ({verseReflections.length})
            </label>
            
            {loadingVerseContent ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
              </div>
            ) : verseReflections.length === 0 ? (
              <div className="text-center py-4 text-stone-400 text-xs">
                <p>아직 이 구절에 대한 커뮤니티 묵상이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {verseReflections.map((reflection) => (
                  <div 
                    key={reflection.id} 
                    className="p-3 rounded-lg bg-amber-50 border border-amber-100 cursor-pointer hover:bg-amber-100 transition-colors"
                    onClick={() => router.push(`/read/${selectedVerse?.book || 'John'}/${selectedVerse?.chapter || 1}/${selectedVerse?.verse || 1}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-amber-700">묵상</span>
                      <span className="text-xs text-stone-500">
                        {reflection.profile?.nickname || reflection.profile?.email}
                      </span>
                    </div>
                    <p className="text-sm text-stone-800">{reflection.content}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleToggleLike(reflection.id, reflection.liked || false); }}
                        className={`text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors ${reflection.liked ? 'bg-red-100 text-red-600' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                      >
                        🙏 기도합니다 ({reflection.likes || 0})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
    </>
  );
}
