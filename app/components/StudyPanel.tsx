'use client';

import { useState, useEffect, useCallback } from 'react';
import { SelectedVerse, SelectedWord } from '@/app/types';
import { PenLine, BookText, Save, Loader2, BookOpen, Search } from 'lucide-react';

interface StudyPanelProps {
  selectedVerse: SelectedVerse | null;
  selectedWord: SelectedWord | null;
  isLoggedIn: boolean;
  userRole: string;
  userName: string;
}

interface LexiconEntry {
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

export function StudyPanel({ selectedVerse, selectedWord, isLoggedIn, userRole, userName }: StudyPanelProps) {
  const isAdmin = userRole === 'ADMIN';
  const canWrite = isLoggedIn;
  const [ministryNote, setMinistryNote] = useState('');
  const [commentary, setCommentary] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
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
        
        // Fetch NET English translation
        const netResponse = await fetch(
          `/api/translations?version=net&book=${selectedVerse!.book}&chapter=${selectedVerse!.chapter}&verse=${selectedVerse!.verse}`
        );
        if (netResponse.ok) {
          const netData = await netResponse.json();
          setNetTranslation(netData.text || netData.translation || '');
        } else {
          setNetTranslation('');
        }
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
        } else {
          setMinistryNote(result.data.ministry_note || '');
          setCommentary(result.data.commentary || '');
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

      setLastSaved(new Date());
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

  // Get definition for selected word - tries lemma first, then surface form
  const getWordDefinition = (lemma: string, surfaceForm?: string): LexiconEntry | null => {
    // Try lemma (root form) first
    if (lexicon[lemma]) {
      return lexicon[lemma];
    }
    // Fallback to surface form if provided and different from lemma
    if (surfaceForm && surfaceForm !== lemma && lexicon[surfaceForm]) {
      return lexicon[surfaceForm];
    }
    return null;
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

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3 bg-stone-100 border-b border-stone-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PenLine className="w-4 h-4 text-stone-600" />
            <h2 className="text-sm font-serif font-semibold text-stone-700">
              나의 묵상 공간 {isAdmin && <span className="text-amber-600">👑</span>}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
            ) : lastSaved ? (
              <span className="text-xs text-stone-400">
                저장됨 {lastSaved.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            ) : null}
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
        {/* Comparative Study: GNT - KRV - NET */}
        <div className="mt-2 space-y-2">
          {/* GNT Original */}
          <div className="p-3 bg-amber-50 rounded border-l-4 border-amber-500">
            <p className="text-xs font-semibold text-amber-700 mb-1">📜 GNT 원문 (Original)</p>
            <p className="text-sm text-stone-700 font-greek leading-relaxed">
              {selectedVerse.text}
            </p>
          </div>
          
          {/* Korean Translation (KRV) */}
          <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-500">
            <p className="text-xs font-semibold text-blue-700 mb-1">🇰🇷 개역한글 (KRV)</p>
            {translationLoading ? (
              <p className="text-sm text-stone-500 animate-pulse">번역 데이터 로딩 중...</p>
            ) : koreanTranslation ? (
              <p className="text-sm text-stone-700 leading-relaxed">{koreanTranslation}</p>
            ) : (
              <p className="text-sm text-stone-400 italic">(개역한글 데이터 준비 중 - API 연결 필요)</p>
            )}
          </div>
          
          {/* NET English Translation */}
          <div className="p-3 bg-green-50 rounded border-l-4 border-green-500">
            <p className="text-xs font-semibold text-green-700 mb-1">🌐 NET English (New English Translation)</p>
            {translationLoading ? (
              <p className="text-sm text-stone-500 animate-pulse">Translation loading...</p>
            ) : netTranslation ? (
              <p className="text-sm text-stone-700 leading-relaxed">{netTranslation}</p>
            ) : (
              <p className="text-sm text-stone-400 italic">(NET 데이터 연결 준비 중)</p>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Private Translation */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-serif font-medium text-stone-700">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
            나의 사역 (Private Translation)
            {!canWrite && <span className="text-xs text-amber-600">(로그인 필요)</span>}
          </label>
          <textarea
            value={ministryNote}
            onChange={(e) => canWrite && setMinistryNote(e.target.value)}
            disabled={!canWrite}
            placeholder={canWrite 
              ? "이 말씀을 내 언어와 상황으로 옮긴다면... (개인적 번역)" 
              : "로그인 후 나의 사역을 작성할 수 있습니다."}
            className="w-full h-32 p-3 text-sm leading-relaxed bg-stone-50 border border-stone-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 placeholder:text-stone-400 disabled:bg-stone-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Commentary - ADMIN ONLY */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-serif font-medium text-stone-700">
            <span className="w-1.5 h-1.5 bg-stone-500 rounded-full" />
            주석 (Commentary)
            {isAdmin && <span className="text-xs text-amber-600">👑 관리자</span>}
            {!isAdmin && <span className="text-xs text-stone-400">(관리자 전용)</span>}
          </label>
          <textarea
            value={commentary}
            onChange={(e) => isAdmin && setCommentary(e.target.value)}
            disabled={!isAdmin}
            placeholder={isAdmin 
              ? "헬라어 원문의 뉘앙스, 역사적 배경, 신학적 의미 등을 기록하세요..." 
              : "주석 작성은 관리자(지혜 소장님)만 가능합니다."}
            className="w-full h-32 p-3 text-sm leading-relaxed bg-stone-50 border border-stone-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-stone-300 placeholder:text-stone-400 disabled:bg-stone-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Dictionary Lookup */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-serif font-medium text-stone-700">
            <Search className="w-3 h-3 text-amber-500" />
            사전 조회 (Dictionary)
            {selectedWord && <span className="text-xs text-amber-600"> - {selectedWord.word.t}</span>}
          </label>
          
          {lexiconLoading ? (
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
            </div>
          ) : selectedWord ? (
            <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-lg">
              {(() => {
                const entry = getWordDefinition(selectedWord.word.l, selectedWord.word.t);
                return entry ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-greek text-lg font-semibold text-amber-700">
                        {selectedWord.word.l}
                      </span>
                      <span className="text-xs text-stone-500">[{entry.transliteration}]</span>
                    </div>
                    <p className="text-sm text-stone-700 leading-relaxed">
                      {entry.definition}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-stone-500">
                      <span>Strong&apos;s: {entry.strongs}</span>
                      <span>•</span>
                      <span>{entry.frequency}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-stone-500 mb-2">
                      &quot;{selectedWord.word.l}&quot;에 대한 사전 정보가 없습니다
                    </p>
                    <p className="text-xs text-stone-400">
                      원형: {selectedWord.word.l} | 문법: {selectedWord.word.m}
                    </p>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg text-center">
              <BookOpen className="w-5 h-5 mx-auto mb-2 text-stone-300" />
              <p className="text-xs text-stone-400">
                왼쪽 패널에서 단어를 클릭하면<br />사전 정보가 표시됩니다
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
