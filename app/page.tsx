'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  BookOpen, LogOut, LogIn, Menu, X, ExternalLink, 
  Megaphone, Sparkles, Search, Users, Settings, Crown,
  ChevronRight, Bell, MessageSquare, GraduationCap, Heart,
  Home as HomeIcon, ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/app/components/AuthProvider';
import { CommunityPanel } from '@/app/components/CommunityPanel';
import { getMyProfile, signOut, Profile, getNotice } from '@/app/lib/supabase';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notice, setNotice] = useState<{ id: number; content: string; updated_at: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Get post ID from URL for deep linking
  const postId = searchParams.get('post');
  
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

  // Navigation items
  const navItems = [
    { id: 'home', title: '홈', href: '/', icon: HomeIcon, active: true },
    { id: 'read', title: '한글 성경', href: '/read', icon: BookOpen },
    { id: 'study', title: '원어 연구', href: '/study', icon: Search },
    { id: 'community', title: '커뮤니티', href: '/community', icon: Users },
    { id: 'sermon', title: '설교 아카이브', href: 'https://sermon-archive.vercel.app/', icon: GraduationCap, external: true },
  ];

  const adminNavItem = { id: 'admin', title: '관리자', href: '/admin', icon: Settings };

  return (
    <div className="h-screen flex flex-col bg-[#faf9f7]">
      {/* Header / Navbar */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-stone-200 sticky top-0 z-50">
        {/* Logo & Navigation */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg">
              <BookOpen className="w-5 h-5 text-amber-700" />
            </div>
            <span className="font-serif font-bold text-stone-800 hidden sm:block">GNT Reader</span>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  item.active 
                    ? 'bg-stone-100 text-stone-800 font-medium' 
                    : 'text-stone-600 hover:bg-stone-50 hover:text-stone-800'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.title}
                {item.external && <ExternalLink className="w-3 h-3" />}
              </a>
            ))}
            {isAdmin && (
              <a
                href={adminNavItem.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-amber-600 hover:bg-amber-50 transition-colors"
              >
                <Crown className="w-4 h-4" />
                {adminNavItem.title}
              </a>
            )}
          </nav>
        </div>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500">
                {isAdmin ? '👑 ' : ''}{userName}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-sm text-stone-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>로그아웃</span>
              </button>
            </div>
          ) : (
            <a
              href="/login"
              className="flex items-center gap-2 px-4 py-1.5 bg-stone-800 text-white rounded-lg text-sm hover:bg-stone-700 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              로그인
            </a>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-lg"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-stone-200 px-4 py-3 space-y-2">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={item.href}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noopener noreferrer' : undefined}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                item.active ? 'bg-stone-100 text-stone-800' : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.title}</span>
              {item.external && <ExternalLink className="w-4 h-4 ml-auto" />}
            </a>
          ))}
          {isAdmin && (
            <a
              href="/admin"
              className="flex items-center gap-3 p-3 rounded-lg text-amber-600 hover:bg-amber-50"
            >
              <Crown className="w-5 h-5" />
              <span className="font-medium">관리자</span>
            </a>
          )}
          
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-3 text-stone-600 hover:bg-stone-50 rounded-lg"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">로그아웃</span>
            </button>
          ) : (
            <a
              href="/login"
              className="flex items-center gap-3 p-3 bg-stone-800 text-white rounded-lg"
            >
              <LogIn className="w-5 h-5" />
              <span className="font-medium">로그인</span>
            </a>
          )}
        </div>
      )}

      {/* Main Content - Community Panel */}
      <main className="flex-1 overflow-hidden">
        <CommunityPanel
          selectedVerse={null}
          isLoggedIn={isLoggedIn}
          userRole={userRole}
          userName={userName}
          initialPostId={postId}
          currentPath="/"
          showPrayerTabs={true}
          onNavigateToVerse={(book, chapter, verse) => {
            router.push(`/study?book=${book}&chapter=${chapter}&verse=${verse}`);
          }}
        />
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-[#faf9f7]">
      <div className="text-stone-500">로딩 중...</div>
    </div>}>
      <HomeContent />
    </Suspense>
  );
}
