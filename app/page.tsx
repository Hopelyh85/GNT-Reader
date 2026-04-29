'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, LogOut, LogIn, Menu, X, ExternalLink, 
  Megaphone, Sparkles, Search, Users, Settings, Crown,
  ChevronRight, Bell, MessageSquare, GraduationCap, Heart,
  Home as HomeIcon, AlertTriangle, Globe, Clock, Scroll, UserPlus, ArrowUpCircle
} from 'lucide-react';
import { useAuth } from '@/app/components/AuthProvider';
import { getMyProfile, signOut, Profile, getNotice, getUrgentPrayers, StudioReflection, getSupabase } from '@/app/lib/supabase';

// Post type for home dashboard
interface BoardPost {
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
  const [prayers, setPrayers] = useState<BoardPost[]>([]);
  const [greetings, setGreetings] = useState<BoardPost[]>([]);
  const [levelUpRequests, setLevelUpRequests] = useState<BoardPost[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadData() {
      if (user) {
        getMyProfile().then(setProfile).catch(console.error);
      }
      
      const supabase = getSupabase();
      const [noticeData] = await Promise.all([getNotice()]);
      setNotice(noticeData);
      
      // 공통 데이터 로드 함수
      const fetchLatestPosts = async (category: string) => {
        const { data } = await supabase
          .from('posts')
          .select('id, title, content, created_at, user_id, profiles!inner(id, nickname, tier)')
          .eq('category', category)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(5);
        return (data || []) as BoardPost[];
      };

      // 각 게시판 데이터 병렬 로드
      const [prayerData, greetingData, levelUpData] = await Promise.all([
        fetchLatestPosts('prayer'),
        fetchLatestPosts('greeting'), // 가입 인사 카테고리 가정
        fetchLatestPosts('levelup')   // 등업 요청 카테고리 가정
      ]);

      setPrayers(prayerData);
      setGreetings(greetingData);
      setLevelUpRequests(levelUpData);
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

  const portalItems = [
    { id: 'study', title: '카시키아쿰 말씀 나눔터', subtitle: '공동체와 함께 성경을 읽고 원문 성경을 깊이 연구하고 묵상을 나눕니다', href: '/study', icon: Search, color: 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700' },
    { id: 'community', title: '커뮤니티 게시판', subtitle: '자유롭게 나누는 공간입니다', href: '/community', icon: MessageSquare, color: 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700' },
    { id: 'prayer', title: '모두의 기도', subtitle: '기도를 요청하고 기도 응답을 나누는 공간입니다', href: '/community/prayer', icon: Heart, color: 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700' },
    { id: 'scripture', title: '묵상 데이터 보관소', subtitle: '묵상한 내용을 성경별, 참여자별, 시간별로 확인할 수 있습니다\n※ 모바일에 최적화되어 있지 않습니다', href: '/scripture-board', icon: Scroll, color: 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700' },
  ];

  const navItems = [
    { id: 'home', title: '홈', href: '/', icon: HomeIcon, active: true },
    { id: 'study', title: '말씀 나눔터', href: '/study', icon: Search },
    { id: 'scripture', title: '묵상 데이터', href: '/scripture-board', icon: Scroll },
    { id: 'community', title: '커뮤니티', href: '/community', icon: MessageSquare },
    { id: 'prayer', title: '기도 제목', href: '/community/prayer', icon: Heart },
    { id: 'cafe', title: '기독교 커뮤니티', href: 'https://naver.me/xXnPSav8', icon: ExternalLink, external: true },
  ];

  // 공통 게시판 카드 렌더링 함수
  const renderBoardCard = (title: string, icon: any, data: BoardPost[], href: string, colorClass: string, iconColor: string) => (
    <div className={`bg-white rounded-xl border ${colorClass} shadow-sm overflow-hidden flex flex-col`}>
      <div className={`flex items-center gap-2 px-4 py-3 border-b bg-gradient-to-r ${colorClass.replace('border-', 'from-').replace('-200', '-50')} to-white`}>
        {icon}
        <div className="flex-1">
          <h3 className={`font-bold text-sm ${iconColor.replace('text-', 'text-').replace('-600', '-800')}`}>{title}</h3>
        </div>
        <a href={href} className={`text-xs ${iconColor} hover:underline flex items-center gap-1`}>
          전체보기 <ChevronRight className="w-3 h-3" />
        </a>
      </div>
      <div className="p-2 flex-grow">
        {loading ? (
          <div className="h-24 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-stone-200 border-t-stone-400 rounded-full animate-spin" />
          </div>
        ) : data.length > 0 ? (
          <ul className="space-y-1">
            {data.map((post) => (post && (
              <li 
                key={post.id} 
                className="flex items-start gap-2 p-2 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer"
                onClick={() => router.push(`${href}/${post.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-700 truncate">
                    {post.title || post.content.substring(0, 40) + '...'}
                  </p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    {post.profiles?.[0]?.nickname || '익명'} · {new Date(post.created_at).toLocaleDateString()}
                  </p>
                </div>
              </li>
            )))}
          </ul>
        ) : (
          <p className="text-xs text-stone-400 text-center py-8">게시물이 없습니다.</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-[#faf9f7]">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg">
              <BookOpen className="w-5 h-5 text-amber-700" />
            </div>
            <span className="font-serif font-bold text-stone-800 hidden sm:block">GNT Reader</span>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <a key={item.id} href={item.href} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${item.active ? 'bg-stone-100 text-stone-800 font-medium' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-800'}`}>
                <item.icon className="w-4 h-4" />{item.title}
              </a>
            ))}
          </nav>
        </div>
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <a href="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer">
                <span className="text-xs text-stone-500">{isAdmin ? '👑 ' : ''}{userName}</span>
                <span className="text-xs px-2 py-0.5 bg-stone-100 rounded text-stone-600">{userRole}</span>
              </a>
              <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-sm text-stone-600 transition-colors"><LogOut className="w-4 h-4" /><span>로그아웃</span></button>
            </div>
          ) : (
            <a href="/login" className="flex items-center gap-2 px-4 py-1.5 bg-stone-800 text-white rounded-lg text-sm hover:bg-stone-700 transition-colors"><LogIn className="w-4 h-4" />로그인</a>
          )}
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-lg">{mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
      </header>

      <main className="flex-1 overflow-y-auto bg-[#faf9f7]">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
          <div className="text-center mb-10 md:mb-14">
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-stone-800 mb-3">카시키아쿰 말씀 나눔터</h1>
            <p className="text-stone-500 text-sm md:text-base max-w-md mx-auto">공동체와 함께 성경을 읽고 원문 성경을 깊이 연구하며 묵상을 나눕니다.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10 md:mb-14">
            {portalItems.map((item) => (
              <a key={item.id} href={item.href} className={`group relative p-4 md:p-6 rounded-xl border-2 transition-all duration-200 ${item.color}`}>
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="p-2.5 rounded-lg bg-white/60 shadow-sm group-hover:scale-110 transition-transform"><item.icon className="w-6 h-6 md:w-8 md:h-8" /></div>
                  <div>
                    <h3 className="font-bold text-sm md:text-base">{item.title}</h3>
                    <p className="text-[11px] md:text-xs opacity-70 mt-0.5 whitespace-pre-line leading-relaxed">{item.subtitle}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* 🌟 기존: 공지사항 & 긴급 기도 제목 */}
          <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
            <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
                <Megaphone className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm text-amber-800">공지사항</h3>
              </div>
              <div className="p-4 min-h-[100px]">
                {!loading && notice?.content ? (
                  <div className="text-sm text-stone-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: notice.content.replace(/\n/g, '<br/>') }} />
                ) : <p className="text-xs text-stone-400 text-center py-4">등록된 공지사항이 없습니다.</p>}
              </div>
            </div>
            {renderBoardCard('긴급 기도 제목', <Heart className="w-4 h-4 text-red-600" />, prayers, '/community/prayer', 'border-red-200', 'text-red-600')}
          </div>

          {/* 🌟 신규: 가입 인사 & 등업 요청 */}
          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            {renderBoardCard('가입 인사 및 자기 소개', <UserPlus className="w-4 h-4 text-emerald-600" />, greetings, '/community', 'border-emerald-200', 'text-emerald-600')}
            {renderBoardCard('등업 요청 게시판', <ArrowUpCircle className="w-4 h-4 text-blue-600" />, levelUpRequests, '/community', 'border-blue-200', 'text-blue-600')}
          </div>

          <div className="mt-8 md:mt-10">
            <a href="https://naver.me/xXnPSav8" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl hover:shadow-md transition-all group">
              <div className="p-2 bg-green-100 rounded-lg group-hover:scale-110 transition-transform"><ExternalLink className="w-5 h-5 text-green-600" /></div>
              <div className="text-center">
                <p className="font-bold text-green-800 text-sm md:text-base">기독교 커뮤니티 (네이버 카페)</p>
                <p className="text-xs text-green-600 mt-0.5">더 많은 성도들과 교제하러 가기</p>
              </div>
              <ChevronRight className="w-5 h-5 text-green-400 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>

          <footer className="mt-12 text-center text-xs text-stone-400"><p>© 2026 카시키아쿰 말씀 나눔터</p></footer>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-[#faf9f7]"><div className="text-stone-500">로딩 중...</div></div>}>
      <HomeContent />
    </Suspense>
  );
}