'use client';

import { useState, useEffect, useCallback } from 'react';
import { SelectedVerse } from '@/app/types';
import { Users, Save, Loader2, Clock } from 'lucide-react';

interface CommunityPanelProps {
  selectedVerse: SelectedVerse | null;
  isLoggedIn: boolean;
  userRole: string;
  userName: string;
}

interface ReflectionData {
  user_nickname: string;
  verse_ref: string;
  book: string;
  chapter: number;
  verse: number;
  content: string;
  updated_at: string;
}

export function CommunityPanel({ selectedVerse, isLoggedIn, userRole, userName }: CommunityPanelProps) {
  const canWrite = isLoggedIn;
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const verseRef = selectedVerse
    ? `${selectedVerse.book} ${selectedVerse.chapter}:${selectedVerse.verse}`
    : '';

  // Load reflection when verse changes via API
  useEffect(() => {
    if (!selectedVerse) {
      setContent('');
      return;
    }

    async function loadReflection() {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/reflections?book=${selectedVerse!.book}&chapter=${selectedVerse!.chapter}&verse=${selectedVerse!.verse}&user=${encodeURIComponent(userName)}`
        );

        if (!response.ok) {
          // 404 or other errors - quietly return empty
          setContent('');
          return;
        }

        const result = await response.json();

        // Return empty quietly if no reflection exists
        if (!result.data) {
          setContent('');
        } else {
          setContent(result.data.content || '');
          setLastSaved(new Date(result.data.updated_at));
        }
      } catch (err) {
        // Quietly handle errors - just start with empty reflection
        console.error('Error loading reflection:', err);
        setContent('');
      } finally {
        setLoading(false);
      }
    }

    loadReflection();
  }, [selectedVerse, userName]);

  // Save reflection via API
  const handleSave = useCallback(async () => {
    if (!selectedVerse || !canWrite) return;

    setSaving(true);
    try {
      const response = await fetch('/api/reflections', {
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
          content: content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save reflection');
      }

      setLastSaved(new Date());
    } catch (err) {
      console.error('Error saving reflection:', err);
    } finally {
      setSaving(false);
    }
  }, [selectedVerse, userName, verseRef, content, canWrite]);

  // Auto-save after 1 second of inactivity (debounce)
  useEffect(() => {
    if (!selectedVerse) return;

    const timer = setTimeout(() => {
      handleSave();
    }, 1000);

    return () => clearTimeout(timer);
  }, [content, selectedVerse, handleSave]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  if (!selectedVerse) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center text-stone-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-serif text-sm">
            구절을 선택하여<br />묵상을 기록하세요
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-stone-50">
      {/* Header */}
      <div className="px-4 py-3 bg-stone-100 border-b border-stone-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-stone-600" />
            <h2 className="text-sm font-serif font-semibold text-stone-700">
              묵상 기록
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
            ) : lastSaved ? (
              <span className="flex items-center gap-1 text-xs text-stone-400">
                <Clock className="w-3 h-3" />
                {formatTime(lastSaved.toISOString())}
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
        <p className="mt-2 text-xs text-stone-500">
          {selectedVerse.bookName || selectedVerse.book} {selectedVerse.chapter}:{selectedVerse.verse}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-serif font-medium text-stone-700">
              <span className="w-1.5 h-1.5 bg-stone-500 rounded-full" />
              나의 묵상 (Reflection)
              {!canWrite && <span className="text-xs text-amber-600">(로그인 필요)</span>}
            </label>
            <textarea
              value={content}
              onChange={(e) => canWrite && setContent(e.target.value)}
              disabled={!canWrite}
              placeholder={canWrite 
                ? "이 말씀을 묵상하며 느낀 점, 적용할 점, 기도 제목 등을 자유롭게 기록하세요... (1초 후 자동 저장)" 
                : "로그인 후 묵상을 작성할 수 있습니다."}
              className="w-full h-[calc(100vh-280px)] min-h-[300px] p-3 text-sm leading-relaxed bg-white border border-stone-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-stone-300 placeholder:text-stone-400 disabled:bg-stone-100 disabled:cursor-not-allowed"
            />
          </div>
        )}
      </div>
    </div>
  );
}
