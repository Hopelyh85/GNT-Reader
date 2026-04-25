'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  MessageSquare, LogOut, LogIn, ArrowLeft, Users, BookOpen
} from 'lucide-react';
import { useAuth } from '@/app/components/AuthProvider';
import { CommunityPanel } from '@/app/components/CommunityPanel';
import { getMyProfile, signOut, Profile, getNotice } from '@/app/lib/supabase';

export default function CommunityPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notice, setNotice] = useState<{ id: number; content: string; updated_at: string } | null>(null);
  
  useEffect(() => {
    if (user) {
      getMyProfile().then(setProfile).catch(console.error);
    }
    getNotice().then(setNotice).catch(console.error);
  }, [user]);

  const isLoggedIn = !!user;
  const userRole = profile?.tier || 'General';
  const isAdmin = userRole === '관리자' || userRole === 'Admin' || userRole?.includes('⭐⭐⭐⭐⭐');
  const userName = profile?.nickname || user?.email?.split('@')[0] || '게스트';

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="h-screen flex flex-col bg-[#faf9f7]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-stone-100 border-b border-stone-200">
        <div className="flex items-center gap-3">
          <a href="/" className="p-2 hover:bg-stone-200 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-stone-600" />
          </a>
          <div>
            <h1 className="text-lg font-serif font-bold text-stone-800">
              커뮤니티 게시판
            </h1>
            <p className="text-xs text-stone-500">
              성경 묵상과 나눔의 공간
            </p>
          </div>
        </div>

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

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <CommunityPanel
          selectedVerse={null}
          isLoggedIn={isLoggedIn}
          userRole={userRole}
          userName={userName}
          onNavigateToVerse={(book, chapter, verse) => {
            // Navigate to study page with verse
            router.push(`/study?book=${book}&chapter=${chapter}&verse=${verse}`);
          }}
        />
      </main>
    </div>
  );
}
