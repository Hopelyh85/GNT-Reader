'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BiblePanel } from '@/app/components/BiblePanel';
import { StudyPanel } from '@/app/components/StudyPanel';
import { CommunityPanel } from '@/app/components/CommunityPanel';
import { useSBLGNT } from '@/app/hooks/useSBLGNT';
import { SelectedVerse, SelectedWord } from '@/app/types';
import { BookOpen, LogOut, LogIn, Menu, X, ExternalLink, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/app/components/AuthProvider';
import { getMyProfile, signOut, Profile, getGlobalNotice } from '@/app/lib/supabase';

export default function StudyPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { getBooks, loading, error } = useSBLGNT();
  const books = getBooks();
  const [selectedVerse, setSelectedVerse] = useState<SelectedVerse | null>(null);
  const [selectedWord, setSelectedWord] = useState<SelectedWord | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [globalNotice, setGlobalNotice] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [initialPostId, setInitialPostId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'bible' | 'study' | 'community'>('bible');
  const [focusPostId, setFocusPostId] = useState<string | null>(null);
  
  // Navigate to verse from community post
  const handleNavigateToVerse = (book: string, chapter: number, verse: number) => {
    // Switch to bible panel (especially for mobile)
    setActivePanel('bible');
    
    // Find book name from the books list
    const bookData = books.find(b => {
      const abbrev = b.name === '마태복음' ? 'Matt' :
                    b.name === '마가복음' ? 'Mark' :
                    b.name === '누가복음' ? 'Luke' :
                    b.name === '요한복음' ? 'John' :
                    b.name === '사도행전' ? 'Acts' :
                    b.name === '로마서' ? 'Rom' :
                    b.name === '고린도전서' ? '1Cor' :
                    b.name === '고린도후서' ? '2Cor' :
                    b.name === '갈라디아서' ? 'Gal' :
                    b.name === '에베소서' ? 'Eph' :
                    b.name === '빌립보서' ? 'Phil' :
                    b.name === '골로새서' ? 'Col' :
                    b.name === '데살로니가전서' ? '1Thess' :
                    b.name === '데살로니가후서' ? '2Thess' :
                    b.name === '디모데전서' ? '1Tim' :
                    b.name === '디모데후서' ? '2Tim' :
                    b.name === '디도서' ? 'Titus' :
                    b.name === '빌레몬서' ? 'Phlm' :
                    b.name === '히브리서' ? 'Heb' :
                    b.name === '야고보서' ? 'Jas' :
                    b.name === '베드로전서' ? '1Pet' :
                    b.name === '베드로후서' ? '2Pet' :
                    b.name === '요한일서' ? '1John' :
                    b.name === '요한이서' ? '2John' :
                    b.name === '요한삼서' ? '3John' :
                    b.name === '유다서' ? 'Jude' :
                    b.name === '요한계시록' ? 'Rev' : '';
      return abbrev.toLowerCase() === book.toLowerCase();
    });
    
    if (bookData) {
      const chapterData = bookData.chapters.find(c => c.number === chapter);
      const verseWords = chapterData?.verses[verse - 1]; // verses is 0-indexed array
      
      if (verseWords) {
        setSelectedVerse({
          book,
          bookName: bookData.name,
          chapter,
          verse,
          text: verseWords.map((w: any) => w.text).join(' ')
        });
      }
    }
  };
  
  // Get post_id from URL for deep linking (client-side only)
  // Handle deep link post ID
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      // Support both post=ID and post_id=ID for backwards compatibility
      const postParam = params.get('post') || params.get('post_id');
      setInitialPostId(postParam);
    }
  }, []);

  useEffect(() => {
    if (user) {
      getMyProfile().then(setProfile).catch(console.error);
    }
    // Load global notice
    getGlobalNotice().then(setGlobalNotice).catch(console.error);
  }, [user]);

  const isLoggedIn = !!user;
  const userRole = profile?.tier || '준회원';
  const userName = profile?.nickname || user?.email?.split('@')[0] || '게스트';
  const userEmail = user?.email || '';
  const isAdmin = userRole === '관리자';

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="flex flex-col h-screen bg-[#faf9f7]">
      {/* Global Notice Banner */}
      {globalNotice && (
        <div className="px-4 py-2 bg-amber-100 border-b border-amber-200 text-center">
          <p className="text-sm text-amber-800 font-medium">📢 {globalNotice}</p>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-stone-100 border-b border-stone-200">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <a href="/" className="p-2 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors">
            <ArrowLeft className="w-5 h-5 text-amber-700" />
          </a>
          <div>
            <h1 className="text-lg font-serif font-bold text-stone-800">
              원어 성경 연구소
            </h1>
            <p className="text-xs text-stone-500">
              헬라어 신약 성경 연구와 묵상
            </p>
          </div>
        </div>

        {/* Desktop External Links */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="https://naver.me/xXnPSav8"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-stone-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            기독교 커뮤니티
          </a>
          <a
            href="https://sermon-archive.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-stone-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            설교 아카이브
          </a>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-stone-600 hover:bg-stone-200 rounded-lg"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        
        {/* Desktop Auth */}
        <div className="hidden md:flex items-center gap-2">
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500">
                {isAdmin ? '👑 ' : ''}{userName}
              </span>
              {isAdmin && (
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

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-stone-100 border-b border-stone-200 px-4 py-3 space-y-2">
          <a
            href="https://naver.me/xXnPSav8"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-stone-600 hover:text-amber-700 py-2"
          >
            <ExternalLink className="w-4 h-4" />
            기독교 커뮤니티
          </a>
          <a
            href="https://sermon-archive.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-stone-600 hover:text-blue-700 py-2"
          >
            <ExternalLink className="w-4 h-4" />
            설교 아카이브
          </a>
          <a
            href="/"
            className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-800 py-2"
          >
            <ArrowLeft className="w-4 h-4" />
            홈으로
          </a>
          <div className="border-t border-stone-200 pt-2">
            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-stone-600 hover:text-red-600 py-2"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            ) : (
              <a
                href="/login"
                className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-800 py-2"
              >
                <LogIn className="w-4 h-4" />
                로그인
              </a>
            )}
          </div>
        </div>
      )}

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
            isLoggedIn={isLoggedIn}
            userName={userName}
            onFocusCommunity={(postId) => {
              setActivePanel('community');
              if (postId) setFocusPostId(postId);
            }}
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
            initialPostId={focusPostId || initialPostId}
            currentPath="/study"
            onNavigateToVerse={handleNavigateToVerse}
            onlyScripture={true}
          />
        </div>

        {/* Mobile Community Panel Overlay */}
        {activePanel === 'community' && (
          <div className="md:hidden fixed inset-0 z-50 bg-white flex flex-col">
            {/* Mobile Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-stone-50">
              <h2 className="text-lg font-semibold text-stone-800">커뮤니티 게시판</h2>
              <button
                onClick={() => setActivePanel('bible')}
                className="p-2 hover:bg-stone-200 rounded-full transition-colors"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>
            {/* Mobile Community Content */}
            <div className="flex-1 overflow-hidden">
              <CommunityPanel
                selectedVerse={selectedVerse}
                isLoggedIn={isLoggedIn}
                userRole={userRole}
                userName={userName}
                initialPostId={focusPostId || initialPostId}
                currentPath="/study"
                onNavigateToVerse={handleNavigateToVerse}
                onlyScripture={true}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
