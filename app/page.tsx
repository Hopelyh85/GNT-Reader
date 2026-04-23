'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BiblePanel } from '@/app/components/BiblePanel';
import { StudyPanel } from '@/app/components/StudyPanel';
import { CommunityPanel } from '@/app/components/CommunityPanel';
import { useSBLGNT } from '@/app/hooks/useSBLGNT';
import { SelectedVerse, SelectedWord } from '@/app/types';
import { BookOpen, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '@/app/components/AuthProvider';
import { getMyProfile, signOut, Profile } from '@/app/lib/supabase';

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { getBooks, loading, error } = useSBLGNT();
  const books = getBooks();
  const [selectedVerse, setSelectedVerse] = useState<SelectedVerse | null>(null);
  const [selectedWord, setSelectedWord] = useState<SelectedWord | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (user) {
      getMyProfile().then(setProfile).catch(console.error);
    }
  }, [user]);

  const isLoggedIn = !!user;
  const userRole = profile?.tier || 'General';
  const userName = profile?.nickname || user?.email || '게스트';
  const userEmail = user?.email || '';

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="flex flex-col h-screen bg-[#faf9f7]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-stone-100 border-b border-stone-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <BookOpen className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h1 className="text-lg font-serif font-semibold text-stone-800">
              성경 원어 연구소
            </h1>
            <p className="text-xs text-stone-500">
              헬라어 신약 성경 연구와 묵상
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500">
                {userRole === 'Admin' ? '👑 ' : ''}{userName}
              </span>
              {userRole === 'Admin' && (
                <a
                  href="/admin"
                  className="text-xs text-amber-600 hover:text-amber-700 underline mr-2"
                >
                  관리자
                </a>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>로그아웃</span>
              </button>
            </div>
          ) : (
            <a
              href="/login"
              className="flex items-center gap-2 px-3 py-1.5 bg-stone-700 text-white rounded-lg text-sm hover:bg-stone-600 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              로그인
            </a>
          )}
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-center">
          <p className="text-sm text-red-600">
            성경 데이터를 불러오는 중 오류가 발생했습니다: {error}
          </p>
        </div>
      )}

      {/* Main Content - 3 Column Grid Layout */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden">
        {/* Left Panel - Bible Text */}
        <div className="h-full border-r border-stone-200 overflow-hidden">
          <BiblePanel
            books={books}
            selectedVerse={selectedVerse}
            onSelectVerse={setSelectedVerse}
            onSelectWord={setSelectedWord}
            loading={loading}
            userRole={userRole}
          />
        </div>

        {/* Center Panel - Study Notes (Desktop only) */}
        <div className="hidden md:block h-full border-r border-stone-200 overflow-hidden">
          <StudyPanel
            selectedVerse={selectedVerse}
            selectedWord={selectedWord}
            isLoggedIn={isLoggedIn}
            userRole={userRole}
            userName={userName}
          />
        </div>

        {/* Mobile Bottom Sheet - StudyPanel */}
        {(selectedVerse || selectedWord) && (
          <div className="md:hidden">
            <StudyPanel
              selectedVerse={selectedVerse}
              selectedWord={selectedWord}
              isLoggedIn={isLoggedIn}
              userRole={userRole}
              userName={userName}
              onClose={() => {
                setSelectedWord(null);
                // Keep verse selected, just close the panel
              }}
            />
          </div>
        )}

        {/* Right Panel - Community/Reflection (Desktop only) */}
        <div className="hidden md:block h-full overflow-hidden">
          <CommunityPanel
            selectedVerse={selectedVerse}
            isLoggedIn={isLoggedIn}
            userRole={userRole}
            userName={userName}
          />
        </div>
      </main>

    </div>
  );
}
