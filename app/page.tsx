'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, LogOut, LogIn, Menu, X, ExternalLink, 
  Megaphone, Sparkles, Search, Users, Settings, Crown,
  ChevronRight, Bell, MessageSquare, GraduationCap
} from 'lucide-react';
import { useAuth } from '@/app/components/AuthProvider';
import { getMyProfile, signOut, Profile, getNotice } from '@/app/lib/supabase';

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notice, setNotice] = useState<{ id: number; content: string; updated_at: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    if (user) {
      getMyProfile().then(setProfile).catch(console.error);
    }
    // Load notice
    getNotice().then(setNotice).catch(console.error);
  }, [user]);

  const isLoggedIn = !!user;
  const userRole = profile?.tier || 'General';
  const isAdmin = userRole === 'Admin' || userRole?.includes('⭐⭐⭐⭐⭐');

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  const menuItems = [
    {
      id: 'notice',
      title: '📢 실시간 공지사항',
      description: '연구소의 중요 소식과 안내',
      href: null,
      icon: Megaphone,
      color: 'bg-blue-50 border-blue-200 text-blue-700',
      adminOnly: false,
      isNotice: true
    },
    {
      id: 'read',
      title: '📖 한글 성경 나눔터',
      description: '개역한글(KRV) 성경 읽기와 묵상 나눔',
      href: '/read',
      icon: BookOpen,
      color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      adminOnly: false
    },
    {
      id: 'study',
      title: '🔍 원어 성경 연구소',
      description: '헬라어 원어와 구문 분석, 심층 연구',
      href: '/study',
      icon: Search,
      color: 'bg-amber-50 border-amber-200 text-amber-700',
      adminOnly: false
    },
    {
      id: 'sermon',
      title: '🎧 설교 아카이브',
      description: '지나간 설교와 말씀을 다시 듣기',
      href: 'https://sermon-archive.vercel.app/',
      icon: GraduationCap,
      color: 'bg-purple-50 border-purple-200 text-purple-700',
      external: true
    },
    {
      id: 'community',
      title: '👥 커뮤니티 게시판',
      description: '성도들의 교제와 나눔의 공간',
      href: '/community',
      icon: Users,
      color: 'bg-stone-50 border-stone-200 text-stone-700',
      adminOnly: false
    },
    {
      id: 'admin',
      title: '⚙️ 관리자 대시보드',
      description: '회원 관리, 승인, 설정',
      href: '/admin',
      icon: Settings,
      color: 'bg-red-50 border-red-200 text-red-700',
      adminOnly: true
    },
  ];

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 bg-white border-b border-stone-200 sticky top-0 z-50">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl">
            <BookOpen className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-stone-800">
              기독교 커뮤니티 성경 연구 포털
            </h1>
            <p className="text-xs text-stone-500">
              헬라어 원어 연구와 성경 묵상의 공간
            </p>
          </div>
        </div>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {profile?.avatar_url && (
                  <img 
                    src={profile.avatar_url} 
                    alt="avatar" 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                )}
                <div className="text-right">
                  <span className="text-sm font-medium text-stone-700 block">
                    {profile?.nickname || user?.email?.split('@')[0]}
                  </span>
                  <span className="text-xs text-stone-500">
                    {isAdmin ? '👑 관리자' : userRole}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-sm text-stone-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:inline">로그아웃</span>
              </button>
            </div>
          ) : (
            <a
              href="/login"
              className="flex items-center gap-2 px-4 py-2 bg-stone-800 text-white rounded-lg text-sm hover:bg-stone-700 transition-colors"
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
        <div className="md:hidden bg-white border-b border-stone-200 px-4 py-4 space-y-3">
          {isLoggedIn ? (
            <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
              {profile?.avatar_url && (
                <img 
                  src={profile.avatar_url} 
                  alt="avatar" 
                  className="w-10 h-10 rounded-full object-cover"
                />
              )}
              <div>
                <p className="font-medium text-stone-800">
                  {profile?.nickname || user?.email?.split('@')[0]}
                </p>
                <p className="text-xs text-stone-500">{isAdmin ? '👑 관리자' : userRole}</p>
              </div>
            </div>
          ) : null}
          
          <div className="space-y-2">
            {menuItems.filter(item => !item.adminOnly || isAdmin).map((item) => (
              <a
                key={item.id}
                href={item.href || '#'}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                className={`flex items-center gap-3 p-3 rounded-lg border ${item.color} hover:shadow-md transition-all`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.title}</span>
                {item.external && <ExternalLink className="w-4 h-4 ml-auto" />}
              </a>
            ))}
          </div>
          
          {isLoggedIn && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 p-3 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              로그아웃
            </button>
          )}
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-stone-800 mb-3">
            성경 연구와 나눔의 공간에 오신 것을 환영합니다
          </h2>
          <p className="text-stone-600 max-w-2xl mx-auto">
            헬라어 원어 연구부터 성경 묵상, 설교 아카이브까지 <br className="hidden md:block" />
            성도들의 영적 성장을 돕는 종합 성경 연구 포털입니다.
          </p>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuItems.filter(item => !item.adminOnly || isAdmin).map((item) => (
            item.isNotice ? (
              // Notice Card (special rendering)
              <div 
                key={item.id}
                className={`col-span-1 md:col-span-2 lg:col-span-3 p-5 rounded-xl border-2 ${item.color} mb-2`}
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <item.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-blue-800 mb-1">{item.title}</h3>
                    {notice ? (
                      <div className="text-stone-700 whitespace-pre-wrap">
                        {notice.content}
                      </div>
                    ) : (
                      <p className="text-stone-500">공지사항이 없습니다.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Regular Menu Card
              <a
                key={item.id}
                href={item.href || '#'}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                className={`group p-5 rounded-xl border-2 ${item.color} hover:shadow-lg transition-all duration-200 flex flex-col`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                    <item.icon className="w-6 h-6" />
                  </div>
                  {item.external && (
                    <ExternalLink className="w-4 h-4 opacity-50" />
                  )}
                  {!item.external && item.href && (
                    <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                <h3 className="text-lg font-bold mb-1">{item.title}</h3>
                <p className="text-sm opacity-80 leading-relaxed">{item.description}</p>
              </a>
            )
          ))}
        </div>

        {/* Footer Info */}
        <div className="mt-12 pt-8 border-t border-stone-200 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <a 
              href="https://naver.me/xXnPSav8" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-stone-600 hover:text-amber-700 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              기독교 커뮤니티 카페
            </a>
            <span className="text-stone-300">|</span>
            <a 
              href="https://sermon-archive.vercel.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-stone-600 hover:text-purple-700 transition-colors"
            >
              <Bell className="w-4 h-4" />
              설교 아카이브
            </a>
          </div>
          <p className="text-xs text-stone-400">
            기독교 커뮤니티 성경 연구 포털 © 2024
          </p>
        </div>
      </main>
    </div>
  );
}
