'use client';

import { useState, useEffect, useCallback } from 'react';
import { SelectedVerse, SelectedWord } from '@/app/types';
import { PenLine, BookText, Save, Loader2, BookOpen, Search, X } from 'lucide-react';
import { getSupabase } from '../lib/supabase';

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

interface Reflection {
  id: string;
  content: string;
  user_name: string;
  created_at: string;
}

export function StudyPanel({ selectedVerse, selectedWord, isLoggedIn, userRole, userName, onClose }: StudyPanelProps) {
  const isAdmin = userRole === 'ADMIN';
  const canWrite = isLoggedIn;
  const [ministryNote, setMinistryNote] = useState('');
  const [commentary, setCommentary] = useState('');
  const [reflectionNote, setReflectionNote] = useState('');
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [noteTimestamp, setNoteTimestamp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Dictionary state
  const [lexicon, setLexicon] = useState<Record<string, LexiconEntry>>({});
  const [lexiconLoading, setLexiconLoading] = useState(false);
  
  // Translation states
  const [koreanTranslation, setKoreanTranslation] = useState<string>('');
  const [netTranslation, setNetTranslation] = useState<string>('');
  const [translationLoading, setTranslationLoading] = useState(false);

  const verseRef = selectedVerse
    ? `${selectedVerse.book} ${selectedVerse.chapter}:${selectedVerse.verse}`
    : '';
  
  // Load translations when verse changes
  useEffect(() => {
    if (!selectedVerse) {
      setKoreanTranslation('');
      setNetTranslation('');
      return;
    }
    
    async function loadTranslations() {
      setTranslationLoading(true);
      try {
        // Fetch Korean translation (KRV/NKRV)
        const koreanResponse = await fetch(
          `/api/translations?version=krv&book=${selectedVerse!.book}&chapter=${selectedVerse!.chapter}&verse=${selectedVerse!.verse}`
        );
        if (koreanResponse.ok) {
          const koreanData = await koreanResponse.json();
          setKoreanTranslation(koreanData.text || koreanData.translation || '');
        } else {
          setKoreanTranslation('');
        }
        
        // Fetch NET English translation via API first
        let netText = '';
        try {
          const netResponse = await fetch(
            `/api/translations?version=net&book=${selectedVerse!.book}&chapter=${selectedVerse!.chapter}&verse=${selectedVerse!.verse}`
          );
          if (netResponse.ok) {
            const netData = await netResponse.json();
            netText = netData.text || netData.translation || '';
          }
        } catch (apiErr) {
          console.log('API fetch failed, trying Supabase directly...');
        }
        
        // Fallback: Direct Supabase fetch for NET translation
        if (!netText) {
          try {
            const supabase = getSupabase();
            const { data: netData, error: netError } = await supabase
              .from('net_translations')
              .select('text')
              .eq('book', selectedVerse!.book)
              .eq('chapter', selectedVerse!.chapter)
              .eq('verse', selectedVerse!.verse)
              .single();
            
            if (!netError && netData) {
              netText = netData.text || '';
            }
          } catch (supabaseErr) {
            console.error('Supabase NET fetch error:', supabaseErr);
          }
        }
        
        setNetTranslation(netText);
      } catch (err) {
        console.error('Error loading translations:', err);
        setKoreanTranslation('');
        setNetTranslation('');
      } finally {
        setTranslationLoading(false);
      }
    }
    
    loadTranslations();
  }, [selectedVerse]);

  // Load existing note when verse changes via API
  useEffect(() => {
    if (!selectedVerse) return;

    async function loadNote() {
      try {
        const response = await fetch(
          `/api/notes?book=${selectedVerse!.book}&chapter=${selectedVerse!.chapter}&verse=${selectedVerse!.verse}&user=${encodeURIComponent(userName)}`
        );
        
        if (!response.ok) {
          // 404 or other errors - quietly return empty
          setMinistryNote('');
          setCommentary('');
          setError(null);
          return;
        }

        const result = await response.json();
        
        // Return null/empty quietly if no note exists
        if (!result.data) {
          setMinistryNote('');
          setCommentary('');
          setNoteTimestamp(null);
        } else {
          setMinistryNote(result.data.ministry_note || '');
          setCommentary(result.data.commentary || '');
          setNoteTimestamp(result.data.created_at || result.data.updated_at || null);
        }
        setError(null);
      } catch (err) {
        // Quietly handle errors - just start with empty note
        console.error('Error loading note:', err);
        setMinistryNote('');
        setCommentary('');
        setError(null);
      }
    }

    loadNote();
  }, [selectedVerse, userName]);

  // Save note via API
  const handleSave = useCallback(async () => {
    if (!selectedVerse || !canWrite) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_nickname: userName,
          verse_ref: verseRef,
          book: selectedVerse.book,
          chapter: selectedVerse.chapter,
          verse: selectedVerse.verse,
          ministry_note: ministryNote,
          commentary: commentary,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save note');
      }

      const result = await response.json();
      setLastSaved(new Date());
      // Update timestamp from saved data
      if (result.data) {
        setNoteTimestamp(result.data.created_at || result.data.updated_at || null);
      }
    } catch (err) {
      console.error('Error saving note:', err);
      setError('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }, [
    selectedVerse,
    userName,
    verseRef,
    ministryNote,
    commentary,
    canWrite,
  ]);

  // Auto-save after 1 second of inactivity (debounce)
  useEffect(() => {
    if (!selectedVerse) return;

    const timer = setTimeout(() => {
      handleSave();
    }, 1000);

    return () => clearTimeout(timer);
  }, [ministryNote, commentary, selectedVerse, handleSave]);

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

  if (!selectedVerse) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center text-stone-400">
          <BookText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-serif text-sm">
            좌측 패널에서 성경 구절을 선택하여<br />묵상을 시작하세요
          </p>
        </div>
      </div>
    );
  }

  // Mobile: show as bottom sheet when verse or word selected
  // Desktop: show as sidebar
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
        fixed bottom-0 left-0 w-full max-h-[85vh] md:max-h-full
        overflow-y-auto md:overflow-hidden
        bg-white md:bg-white
        rounded-t-2xl md:rounded-none
        shadow-2xl md:shadow-none
        z-50 md:z-auto
        flex flex-col
        animate-slide-up md:animate-none
      ">
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
        {selectedWord && (
          <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-lg">
            <label className="flex items-center gap-2 text-sm font-serif font-medium text-amber-700 mb-3">
              <Search className="w-3 h-3" />
              단어 분석
            </label>
              {(() => {
                const w = selectedWord.word;
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
                const rawLemma = w.lemma || w.text || '';
                const cleanedLemma = lemmaFixer[rawLemma] || rawLemma.replace(/\(.*\)/g, '');
                // Use cleanedLemma as primary key for lexicon lookup
                const entry = lexicon[cleanedLemma] || lexicon[w.lemma] || lexicon[w.text];
                
                return (
                <div className="space-y-3">
                  {/* 원형 - 클린 출력 */}
                  <div className="font-greek text-3xl font-bold text-amber-700">
                    {cleanedLemma || '⚠️ 원형 없음'}
                  </div>
                  <div className="text-sm text-blue-700 font-medium">
                    {parseMorphCode(w.morph, cleanedLemma, w.text)}
                  </div>
                  {entry?.definition && (
                    <p className="text-sm text-stone-700 leading-relaxed">{entry.definition}</p>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* 2. 원어 사전 (Strong's Dictionary) */}
        {selectedWord && (
          <div className="border-t border-stone-200 pt-4">
            <label className="flex items-center gap-2 text-sm font-serif font-medium text-blue-700 mb-3">
              <BookOpen className="w-3 h-3" />
              원어 사전 (Strong's Dictionary)
            </label>
            {(() => {
              const w = selectedWord.word;
              // Lemma Fixer: same as Word Analysis section
              const lemmaFixer: Record<string, string> = {
                'ἐστί(ν)': 'εἰμί', 'εἰσίν': 'εἰμί',
                'αὐτῆς': 'αὐτός', 'αὐτοῦ': 'αὐτός', 'αὐτῷ': 'αὐτός', 'αὐτόν': 'αὐτός',
                'τόν': 'ὁ', 'τὴν': 'ὁ', 'τῆς': 'ὁ', 'τοὺς': 'ὁ', 'τῷ': 'ὁ', 'τῶν': 'ὁ',
                'τῇ': 'ὁ', 'τὰ': 'ὁ', 'τὸ': 'ὁ', 'τοῦ': 'ὁ', 'οἱ': 'ὁ', 'αἱ': 'ὁ',
                'ὁ': 'ὁ', 'ἡ': 'ὁ', 'τό': 'ὁ', 'τούς': 'ὁ', 'ταῖς': 'ὁ'
              };
              const rawLemma = w.lemma || w.text || '';
              const cleanedLemma = lemmaFixer[rawLemma] || rawLemma.replace(/\(.*\)/g, '');
              // Use cleanedLemma as primary key for lexicon lookup
              const entry = lexicon[cleanedLemma] || lexicon[w.lemma] || lexicon[w.text];
              
              return (
                <div className="space-y-2 p-3 bg-blue-50/50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-greek text-xl font-bold text-blue-700">
                      {cleanedLemma || w.lemma || w.text}
                    </span>
                    {entry?.strongs && (
                      <span className="text-xs font-mono bg-blue-100 px-2 py-1 rounded text-blue-700">
                        {entry.strongs}
                      </span>
                    )}
                  </div>
                  {entry?.transliteration && (
                    <p className="text-xs text-stone-500">
                      [{entry.transliteration}]
                    </p>
                  )}
                  {entry?.definition && (
                    <p className="text-sm text-stone-700 leading-relaxed">
                      {entry.definition}
                    </p>
                  )}
                  {entry?.frequency && (
                    <p className="text-xs text-stone-400">
                      빈도: {entry.frequency}
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* 3. 본문 대조 (GNT / KRV / NET) */}
        <div className="border-t border-stone-200 pt-4 space-y-2">
          <label className="flex items-center gap-2 text-sm font-serif font-medium text-stone-700 mb-2">
            <span className="w-1.5 h-1.5 bg-stone-500 rounded-full" />
            본문 대조 (Comparative Study)
          </label>
          <div className="p-3 bg-amber-50 rounded border-l-4 border-amber-500">
            <p className="text-xs font-semibold text-amber-700 mb-1">📜 GNT 원문</p>
            <p className="text-sm text-stone-700 font-greek leading-relaxed">{selectedVerse.text}</p>
          </div>
          
          <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-500">
            <p className="text-xs font-semibold text-blue-700 mb-1">🇰🇷 개역한글 (KRV)</p>
            {translationLoading ? (
              <p className="text-sm text-stone-500">로딩 중...</p>
            ) : koreanTranslation ? (
              <p className="text-sm text-stone-700 leading-relaxed">{koreanTranslation}</p>
            ) : (
              <p className="text-sm text-stone-400 italic">데이터 준비 중</p>
            )}
          </div>
          
          <div className="p-3 bg-green-50 rounded border-l-4 border-green-500">
            <p className="text-xs font-semibold text-green-700 mb-1">🌐 NET English</p>
            {translationLoading ? (
              <p className="text-sm text-stone-500">로딩 중...</p>
            ) : netTranslation ? (
              <p className="text-sm text-stone-700 leading-relaxed">{netTranslation}</p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-amber-600 font-medium">⚠️ NET 영어 성경 데이터가 Supabase에 없습니다</p>
                <p className="text-xs text-stone-500">Table Editor에서 net_translations 테이블을 확인하거나 CSV Import 하세요.</p>
              </div>
            )}
          </div>
        </div>

        {/* 3. 나의 사역 (Private Translation) */}
        <div className="border-t border-stone-200 pt-4 space-y-2">
          <label className="flex items-center gap-2 text-sm font-serif font-medium text-stone-700">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
            나의 사역 - 번역 및 주석 (Private Translation)
            {!canWrite && <span className="text-xs text-amber-600">(로그인 필요)</span>}
          </label>
          <textarea
            value={ministryNote}
            onChange={(e) => canWrite && setMinistryNote(e.target.value)}
            disabled={!canWrite}
            placeholder={canWrite 
              ? "이 말씀을 내 언어와 상황으로 옮긴다면..." 
              : "로그인 후 작성할 수 있습니다."}
            className="w-full h-32 p-3 text-sm leading-relaxed bg-stone-50 border border-stone-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-200 placeholder:text-stone-400 disabled:bg-stone-100"
          />
        </div>

        {/* 5. 나의 묵상 (Reflection) */}
        <div className="border-t border-stone-200 pt-4 space-y-2">
          <label className="flex items-center gap-2 text-sm font-serif font-medium text-stone-700">
            <BookOpen className="w-3 h-3 text-amber-500" />
            나의 묵상 - 삶의 적용 (Reflection)
            {!canWrite && <span className="text-xs text-amber-600">(로그인 필요)</span>}
          </label>
          
          {/* Reflection List */}
          {reflections.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {reflections.map((reflection) => (
                <div key={reflection.id} className="p-3 bg-amber-50/50 border border-amber-100 rounded-lg">
                  <p className="text-sm text-stone-700 leading-relaxed">{reflection.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-stone-400">{reflection.user_name}</span>
                    <span className="text-xs text-stone-400">
                      {new Date(reflection.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Reflection Input */}
          <textarea
            value={reflectionNote}
            onChange={(e) => canWrite && setReflectionNote(e.target.value)}
            disabled={!canWrite}
            placeholder={canWrite 
              ? "이 말씀에 대한 묵상과 적용을 작성하세요..." 
              : "로그인 후 작성할 수 있습니다."}
            className="w-full h-24 p-3 text-sm leading-relaxed bg-amber-50/30 border border-amber-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-200 placeholder:text-stone-400 disabled:bg-stone-100"
          />
        </div>

      </div>
    </div>
    </>
  );
}
