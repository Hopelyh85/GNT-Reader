'use client';

import { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { BiblePanel } from '@/app/components/BiblePanel';
import { StudyPanel } from '@/app/components/StudyPanel';
import { CommunityPanel } from '@/app/components/CommunityPanel';
import { MobileWordSheet } from '@/app/components/MobileWordSheet';
import { useSBLGNT } from '@/app/hooks/useSBLGNT';
import { SelectedVerse, SelectedWord } from '@/app/types';
import { BookOpen, User, LogOut, LogIn } from 'lucide-react';

export default function Home() {
  const { data: session, status } = useSession();
  const { getBooks, loading, error } = useSBLGNT();
  const books = getBooks();
  const [selectedVerse, setSelectedVerse] = useState<SelectedVerse | null>(null);
  const [selectedWord, setSelectedWord] = useState<SelectedWord | null>(null);
  const [mobileWordOpen, setMobileWordOpen] = useState(false);

  // Handle word selection - open mobile sheet on mobile devices
  const handleSelectWord = (word: SelectedWord | null) => {
    setSelectedWord(word);
    if (word && typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileWordOpen(true);
    }
  };

  // Handle mobile sheet close
  const handleCloseMobileWord = () => {
    setMobileWordOpen(false);
    setSelectedWord(null);
  };

  const isLoggedIn = status === 'authenticated';
  const userRole = session?.user?.role || 'GUEST';
  const userName = session?.user?.name || '게스트';

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
                {userRole === 'ADMIN' ? '👑 ' : ''}{userName}
              </span>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>로그아웃</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn()}
              className="flex items-center gap-2 px-3 py-1.5 bg-stone-700 text-white rounded-lg text-sm hover:bg-stone-600 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              로그인
            </button>
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

      {/* Main Content - RESPONSIVE: Mobile=Stack, Desktop=Side by Side */}
      <main className="flex-1 flex flex-col md:flex-row overflow-auto md:overflow-hidden">
        {/* Left Panel - Bible Text */}
        <div className="w-full md:w-1/2 md:min-w-[450px] md:border-r border-stone-200">
          <BiblePanel
            books={books}
            selectedVerse={selectedVerse}
            onSelectVerse={setSelectedVerse}
            onSelectWord={handleSelectWord}
            loading={loading}
          />
        </div>

        {/* Center Panel - Study Notes (Desktop only) */}
        <div className="hidden md:block md:w-5/12 md:min-w-[400px] md:border-r border-stone-200">
          <StudyPanel
            selectedVerse={selectedVerse}
            selectedWord={selectedWord}
            isLoggedIn={isLoggedIn}
            userRole={userRole}
            userName={userName}
          />
        </div>

        {/* Right Panel - Community (Desktop only) */}
        <div className="hidden lg:block lg:w-[280px]">
          <CommunityPanel
            selectedVerse={selectedVerse}
            isLoggedIn={isLoggedIn}
            userRole={userRole}
            userName={userName}
          />
        </div>
      </main>

      {/* Mobile Word Analysis Bottom Sheet */}
      <MobileWordSheet 
        selectedWord={mobileWordOpen ? selectedWord : null}
        onClose={handleCloseMobileWord}
      />

    </div>
  );
}
