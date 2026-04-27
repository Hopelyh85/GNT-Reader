'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, LogOut, LogIn, Menu, X, ExternalLink, 
  Megaphone, Sparkles, Search, Users, Settings, Crown,
  ChevronRight, Bell, MessageSquare, GraduationCap, Heart,
  Home as HomeIcon, AlertTriangle, Globe, Clock, Scroll
} from 'lucide-react';
import { useAuth } from '@/app/components/AuthProvider';
import { getMyProfile, signOut, Profile, getNotice, getUrgentPrayers, StudioReflection, getSupabase } from '@/app/lib/supabase';

// Prayer Post type for home dashboard
interface PrayerPost {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    id: string;
    nickname: string | null;
    tier: string | null;
  }[];
}

function HomeContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notice, setNotice] = useState<{ id: number; content: string; updated_at: string } | null>(null);
  const [urgentPrayers, setUrgentPrayers] = useState<StudioReflection[]>([]);
  const [prayers, setPrayers] = useState<PrayerPost[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadData() {
      if (user) {
        getMyProfile().then(setProfile).catch(console.error);
      }
      const [noticeData, urgentData] = await Promise.all([
        getNotice(),
        getUrgentPrayers(3)
      ]);
      setNotice(noticeData);
      setUrgentPrayers(urgentData);
      
      // Load prayers from prayer board
      const supabase = getSupabase();
      const { data: prayersData } = await supabase
        .from('posts')
        .select('id, title, content, created_at, user_id, profiles!inner(id, nickname, tier)')
        .eq('category', 'prayer')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(5);
      setPrayers((prayersData || []) as PrayerPost[]);
      
      setLoading(false);
    }
    loadData();
  }, [user]);

  const isLoggedIn = !!user;
  const userRole = profile?.tier || '준회원';
  const isAdmin = userRole === '관리자' || userRole === 'Admin';
  const userName = profile?.nickname || user?.email?.split('@')[0] || '게스트';

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  // Portal menu items - Home Dashboard
  const portalItems = [
    { id: 'read', title: '한글 성경', subtitle: '공동체와 함께 한글 성경을 읽고 묵상을 나눕니다', href: '/read', icon: BookOpen, color: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700' },
    { id: 'study', title: '성경 원어 연구소', subtitle: '헬라어 원문 성경을 깊이 연구하고 주석을 작성합니다', href: '/study', icon: Search, color: 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700' },
    { id: 'community', title: '커뮤니티 게시판', subtitle: '성경 묵상과 나눔의 공간', href: '/community', icon: MessageSquare, color: 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700' },
    { id: 'prayer', title: '기도 제목 게시판', subtitle: '함께 기도하며 중보하는 공간', href: '/community/prayer', icon: Heart, color: 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700' },
    { id: 'scripture', title: '묵상 데이터 저장 공간', subtitle: '모바일에 최적화되어 있지 않습니다', href: '/scripture-board', icon: Scroll, color: 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700' },
  ];

  // Navigation items - Community split into free and prayer boards
  const navItems = [
    { id: 'home', title: '홈', href: '/', icon: HomeIcon, active: true },
    { id: 'read', title: '한글 성경', href: '/read', icon: BookOpen },
    { id: 'scripture', title: '묵상 데이터', href: '/scripture-board', icon: Scroll },
    { id: 'study', title: '원어 연구', href: '/study', icon: Search },
    { id: 'community', title: '커뮤니티', href: '/community', icon: MessageSquare },
    { id: 'prayer', title: '기도 제목', href: '/community/prayer', icon: Heart },
    { id: 'cafe', title: '기독교 커뮤니티', href: 'https://naver.me/xXnPSav8', icon: ExternalLink, external: true },
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  item.active 
                    ? 'bg-stone-100 text-stone-800 font-medium' 
                    : 'text-stone-600 hover:bg-stone-50 hover:text-stone-800'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.title}
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
              <a 
                href="/profile"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <span className="text-xs text-stone-500">
                  {isAdmin ? '👑 ' : ''}{userName}
                </span>
                <span className="text-xs px-2 py-0.5 bg-stone-100 rounded text-stone-600">
                  {userRole}
                </span>
              </a>
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

      {/* Main Content - Portal Style */}
      <main className="flex-1 overflow-y-auto bg-[#faf9f7]">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
          {/* Hero Section */}
          <div className="text-center mb-10 md:mb-14">
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-stone-800 mb-3">
              기독교 커뮤니티 성경 연구소
            </h1>
            <p className="text-stone-500 text-sm md:text-base max-w-md mx-auto">
              헬라어·히브리어 원어를 통해 하나님의 말씀을 깊이 묵상하는 공간
            </p>
          </div>

          {/* Portal Menu Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10 md:mb-14">
            {portalItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                className={`group relative p-4 md:p-6 rounded-xl border-2 transition-all duration-200 ${item.color}`}
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="p-2.5 rounded-lg bg-white/60 shadow-sm group-hover:scale-110 transition-transform">
                    <item.icon className="w-6 h-6 md:w-8 md:h-8" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm md:text-base">{item.title}</h3>
                    <p className="text-xs opacity-70 mt-0.5">{item.subtitle}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* Summary Section - Notice & Urgent Prayers */}
          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            {/* Notice Card */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
                <Megaphone className="w-4 h-4 text-amber-600" />
                <div>
                  <h3 className="font-bold text-sm text-amber-800">공지사항</h3>
                  <p className="text-xs text-amber-600">기독교 커뮤니티 성경 연구소의 공지 사항 및 규칙입니다</p>
                </div>
              </div>
              <div className="p-4">
                {loading ? (
                  <div className="h-16 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-stone-200 border-t-stone-400 rounded-full animate-spin" />
                  </div>
                ) : notice?.content ? (
                  <div 
                    className="text-sm text-stone-700 prose prose-sm max-w-none prose-stone"
                    dangerouslySetInnerHTML={{ __html: notice.content.replace(/\n/g, '<br/>') }}
                  />
                ) : (
                  <p className="text-sm text-stone-400 text-center py-4">등록된 공지사항이 없습니다.</p>
                )}
              </div>
            </div>

            {/* 모두의 기도 Card */}
            <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-50 to-sky-50 border-b border-blue-100">
                <Heart className="w-4 h-4 text-blue-600" />
                <div className="flex-1">
                  <h3 className="font-bold text-sm text-blue-800">모두의 기도</h3>
                  <p className="text-xs text-blue-600">기도 제목 게시판입니다</p>
                </div>
                <a 
                  href="/community/prayer" 
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  전체보기 <ChevronRight className="w-3 h-3" />
                </a>
              </div>
              <div className="p-2">
                {loading ? (
                  <div className="h-16 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-stone-200 border-t-stone-400 rounded-full animate-spin" />
                  </div>
                ) : prayers.length > 0 ? (
                  <ul className="space-y-1">
                    {prayers.map((prayer, idx) => (
                      <li 
                        key={prayer.id} 
                        className="flex items-start gap-2 p-2.5 rounded-lg hover:bg-blue-50/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/community/prayer/${prayer.id}`)}
                      >
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-bold mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-stone-700 line-clamp-2">
                            {prayer.title || prayer.content.substring(0, 60) + '...'}
                          </p>
                          <p className="text-xs text-stone-400 mt-0.5">
                            {(() => {
                              const profiles = prayer.profiles;
                              if (Array.isArray(profiles) && profiles.length > 0 && profiles[0].nickname) {
                                return profiles[0].nickname;
                              }
                              return '익명';
                            })()} · {new Date(prayer.created_at).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-6">
                    <Heart className="w-8 h-8 text-stone-200 mx-auto mb-2" />
                    <p className="text-sm text-stone-500 font-medium">현재 올라온 기도 제목이 없습니다.</p>
                    <p className="text-xs text-stone-400 mt-1">새로운 기도 제목을 게시판에 올려주세요.</p>
                    <a href="/community/prayer" className="text-xs text-blue-600 hover:text-blue-700 underline mt-2 inline-block font-medium">
                      기도 게시판에서 작성하기 →
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* External Community Link Banner */}
          <div className="mt-8 md:mt-10">
            <a 
              href="https://naver.me/xXnPSav8"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl hover:shadow-md transition-all group"
            >
              <div className="p-2 bg-green-100 rounded-lg group-hover:scale-110 transition-transform">
                <ExternalLink className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-center">
                <p className="font-bold text-green-800 text-sm md:text-base">기독교 커뮤니티 (네이버 카페)</p>
                <p className="text-xs text-green-600 mt-0.5">더 많은 성도들과 교제하러 가기</p>
              </div>
              <ChevronRight className="w-5 h-5 text-green-400 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>

          {/* Footer Info */}
          <footer className="mt-12 text-center text-xs text-stone-400">
            <p>© 2026 기독교 커뮤니티 성경 원어 연구소</p>
          </footer>
        </div>
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
