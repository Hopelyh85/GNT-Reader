'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, LogOut, LogIn, Menu, X, ArrowLeft, Loader2, Heart,
  Search, ChevronDown, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/app/components/AuthProvider';
import { 
  bookNameMapReverse, getSupabase, getMyProfile, signOut,
  getPublicReflections, addLike, removeLike, hasUserLiked, getLikesCount
} from '@/app/lib/supabase';

// Book list for sorting/display
const books = [
  { id: 'Matt', name: '마태복음', chapters: 28 },
  { id: 'Mark', name: '마가복음', chapters: 16 },
  { id: 'Luke', name: '누가복음', chapters: 24 },
  { id: 'John', name: '요한복음', chapters: 21 },
  { id: 'Acts', name: '사도행전', chapters: 28 },
  { id: 'Rom', name: '로마서', chapters: 16 },
  { id: '1Cor', name: '고린도전서', chapters: 16 },
  { id: '2Cor', name: '고린도후서', chapters: 13 },
  { id: 'Gal', name: '갈라디아서', chapters: 6 },
  { id: 'Eph', name: '에베소서', chapters: 6 },
  { id: 'Phil', name: '빌립보서', chapters: 4 },
  { id: 'Col', name: '골로새서', chapters: 4 },
  { id: '1Thess', name: '데살로니가전서', chapters: 5 },
  { id: '2Thess', name: '데살로니가후서', chapters: 3 },
  { id: '1Tim', name: '디모데전서', chapters: 6 },
  { id: '2Tim', name: '디모데후서', chapters: 4 },
  { id: 'Titus', name: '디도서', chapters: 3 },
  { id: 'Phlm', name: '빌레몬서', chapters: 1 },
  { id: 'Heb', name: '히브리서', chapters: 13 },
  { id: 'Jas', name: '야고보서', chapters: 5 },
  { id: '1Pet', name: '베드로전서', chapters: 5 },
  { id: '2Pet', name: '베드로후서', chapters: 3 },
  { id: '1John', name: '요한일서', chapters: 5 },
  { id: '2John', name: '요한이서', chapters: 1 },
  { id: '3John', name: '요한삼서', chapters: 1 },
  { id: 'Jude', name: '유다서', chapters: 1 },
  { id: 'Rev', name: '요한계시록', chapters: 22 },
];

interface ScripturePost {
  id: string;
  content: string;
  verse_ref?: string;
  book?: string;
  chapter?: number;
  verse?: number;
  category?: string;
  created_at: string;
  profiles?: {
    nickname?: string;
    email?: string;
    tier?: string;
    church_name?: string;
    job_position?: string;
    show_church?: boolean;
    show_job?: boolean;
  };
  likes?: number;
  liked?: boolean;
}

function ScriptureBoardContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Posts data
  const [posts, setPosts] = useState<ScripturePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  
  // Filters and sort
  const [scriptureSort, setScriptureSort] = useState<'bible' | 'newest' | 'oldest'>('newest');
  const [bookFilter, setBookFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  
  // Check auth
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    };
    checkAuth();
  }, [user]);
  
  // Load scripture posts
  const loadPosts = async (append = false) => {
    if (!append) setLoading(true);
    try {
      const result = await getPublicReflections(undefined, append ? page + 1 : 1, 50);
      const data = result.data || [];
      
      // Filter for scripture posts only (has verse_ref and not prayer/community)
      const scripturePosts = data.filter((post: any) => {
        const hasVerseRef = post.verse_ref && post.verse_ref !== '글로벌 게시판' && post.verse_ref !== '';
        const cat = post.category;
        return hasVerseRef && cat !== 'prayer_general' && cat !== 'prayer_world' && cat !== 'community_free';
      }) as ScripturePost[];
      
      // Load likes for each post
      for (const post of scripturePosts) {
        const count = await getLikesCount(post.id);
        const liked = user ? await hasUserLiked(post.id) : false;
        post.likes = count;
        post.liked = liked;
      }
      
      if (append) {
        setPosts(prev => [...prev, ...scripturePosts]);
        setPage(prev => prev + 1);
      } else {
        setPosts(scripturePosts);
        setPage(1);
      }
      
      setHasMore(data.length === 50);
    } catch (err) {
      console.error('Error loading posts:', err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadPosts();
  }, [user]);
  
  // Get sorted and filtered posts
  const getSortedPosts = () => {
    let filtered = [...posts];
    
    // Apply book filter
    if (bookFilter !== 'all') {
      filtered = filtered.filter(post => {
        const bookName = bookNameMapReverse[bookFilter];
        return post.verse_ref?.includes(bookName) || post.book === bookName;
      });
    }
    
    // Apply tag filter (simple hashtag search)
    if (tagFilter) {
      filtered = filtered.filter(post => 
        post.content?.toLowerCase().includes(tagFilter.toLowerCase())
      );
    }
    
    // Sort
    return filtered.sort((a, b) => {
      if (scriptureSort === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (scriptureSort === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (scriptureSort === 'bible') {
        // Bible order: sort by verse_ref
        return (a.verse_ref || '').localeCompare(b.verse_ref || '', 'ko-KR');
      }
      return 0;
    });
  };
  
  // Handle like toggle
  const handleToggleLike = async (postId: string, currentlyLiked: boolean) => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    try {
      if (currentlyLiked) {
        await removeLike(postId);
      } else {
        await addLike(postId);
      }
      // Update local state
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            liked: !currentlyLiked,
            likes: (post.likes || 0) + (currentlyLiked ? -1 : 1)
          };
        }
        return post;
      }));
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };
  
  // Navigate to verse detail
  const navigateToVerse = (post: ScripturePost) => {
    if (!post.verse_ref) return;
    
    // Parse verse_ref to extract book, chapter, verse
    const match = post.verse_ref.match(/^(.+)\s+(\d+):(\d+)$/);
    if (match) {
      const bookName = match[1];
      const chapter = parseInt(match[2]);
      const verse = parseInt(match[3]);
      const bookId = Object.entries(bookNameMapReverse).find(([k, v]) => v === bookName)?.[0] || 'John';
      router.push(`/read/${bookId}/${chapter}/${verse}`);
    }
  };
  
  // Get display name helper
  const getDisplayName = (profile?: ScripturePost['profiles']) => {
    if (!profile) return '익명';
    const parts: string[] = [];
    if (profile.show_church && profile.church_name) parts.push(`[${profile.church_name}]`);
    if (profile.show_job && profile.job_position) parts.push(`[${profile.job_position}]`);
    parts.push(profile.nickname || profile.email?.split('@')[0] || '익명');
    return parts.join(' ');
  };
  
  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };
  
  // Get category label
  const getCategoryLabel = (post: ScripturePost) => {
    if (post.category === 'translation') return { label: '번역', color: 'text-emerald-600 bg-emerald-50' };
    if (post.category === 'ministry') return { label: '사역', color: 'text-purple-600 bg-purple-50' };
    return { label: '묵상', color: 'text-amber-600 bg-amber-50' };
  };
  
  // Get unique tags from all posts
  const getAllTags = () => {
    const tags = new Set<string>();
    posts.forEach(post => {
      const matches = post.content?.match(/#[\w가-힣]+/g);
      matches?.forEach(tag => tags.add(tag.slice(1)));
    });
    return Array.from(tags).slice(0, 20);
  };
  
  const sortedPosts = getSortedPosts();
  const allTags = getAllTags();
  
  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <a href="/" className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-stone-600" />
          </a>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-100 rounded-lg">
              <BookOpen className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold text-stone-800">
                말씀 묵상 연구소
              </h1>
              <p className="text-xs text-stone-500 hidden sm:block">
                성경 구절 중심의 깊은 묵상과 나눔
              </p>
            </div>
          </div>
        </div>
        
        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          <a href="/" className="px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 rounded-lg transition-colors">
            홈
          </a>
          <a href="/read" className="px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 rounded-lg transition-colors">
            성경읽기
          </a>
          <a href="/community" className="px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 rounded-lg transition-colors">
            커뮤니티
          </a>
          <a href="/scripture-board" className="px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 rounded-lg">
            묵상연구소
          </a>
        </nav>
        
        {/* Auth & Mobile Menu */}
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <button
              onClick={async () => { await signOut(); setIsLoggedIn(false); router.push('/'); }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-sm text-stone-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </button>
          ) : (
            <a
              href="/login"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 text-white rounded-lg text-sm hover:bg-stone-700 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              로그인
            </a>
          )}
          
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-stone-200 px-4 py-3 space-y-2">
          <a href="/" className="flex items-center gap-3 p-3 rounded-lg text-stone-600 hover:bg-stone-50">
            홈
          </a>
          <a href="/read" className="flex items-center gap-3 p-3 rounded-lg text-stone-600 hover:bg-stone-50">
            성경읽기
          </a>
          <a href="/community" className="flex items-center gap-3 p-3 rounded-lg text-stone-600 hover:bg-stone-50">
            커뮤니티
          </a>
          <a href="/scripture-board" className="flex items-center gap-3 p-3 rounded-lg text-amber-700 bg-amber-50">
            묵상연구소
          </a>
          {isLoggedIn ? (
            <button
              onClick={async () => { await signOut(); setIsLoggedIn(false); router.push('/'); }}
              className="w-full flex items-center gap-3 p-3 text-stone-600 hover:bg-stone-50 rounded-lg"
            >
              <LogOut className="w-5 h-5" />
              로그아웃
            </button>
          ) : (
            <a href="/login" className="flex items-center gap-3 p-3 bg-stone-800 text-white rounded-lg">
              <LogIn className="w-5 h-5" />
              로그인
            </a>
          )}
        </div>
      )}
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4">
        {/* Controls Bar */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-stone-500">정렬:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setScriptureSort('bible')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    scriptureSort === 'bible'
                      ? 'bg-amber-100 text-amber-700 border border-amber-300'
                      : 'bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200'
                  }`}
                >
                  성경 순서
                </button>
                <button
                  onClick={() => setScriptureSort('newest')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    scriptureSort === 'newest'
                      ? 'bg-amber-100 text-amber-700 border border-amber-300'
                      : 'bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200'
                  }`}
                >
                  최신순
                </button>
                <button
                  onClick={() => setScriptureSort('oldest')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    scriptureSort === 'oldest'
                      ? 'bg-amber-100 text-amber-700 border border-amber-300'
                      : 'bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200'
                  }`}
                >
                  과거순
                </button>
              </div>
            </div>
            
            {/* Book Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-stone-500">성경:</span>
              <select
                value={bookFilter}
                onChange={(e) => setBookFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg bg-white"
              >
                <option value="all">전체</option>
                {books.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            
            {/* Tag Filter */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-stone-500">태그:</span>
                <div className="flex gap-1 flex-wrap">
                  <button
                    onClick={() => setTagFilter(null)}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      tagFilter === null
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    전체
                  </button>
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
                      className={`px-2 py-1 text-xs rounded-full transition-colors ${
                        tagFilter === tag
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Count */}
            <div className="lg:ml-auto text-sm text-stone-500">
              총 {sortedPosts.length}개
            </div>
          </div>
        </div>
        
        {/* Posts Table */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
            </div>
          ) : sortedPosts.length === 0 ? (
            <div className="text-center py-16 text-stone-400">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg">말씀 연결된 게시글이 없습니다.</p>
              <p className="text-sm mt-2">성경읽기에서 묵상을 남겨보세요!</p>
              <a href="/read" className="inline-block mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
                성경 읽기 →
              </a>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 w-32">구절</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 w-20">분류</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600">내용</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 w-40">작성자</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 w-24">날짜</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-stone-600 w-24">반응</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {sortedPosts.map(post => {
                    const catStyle = getCategoryLabel(post);
                    return (
                      <tr 
                        key={post.id}
                        className="hover:bg-stone-50 transition-colors cursor-pointer"
                        onClick={() => navigateToVerse(post)}
                      >
                        <td className="px-4 py-4">
                          <span className="font-serif font-semibold text-amber-700">
                            {post.verse_ref}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${catStyle.color}`}>
                            {catStyle.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-stone-700 line-clamp-2">{post.content}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-stone-600">{getDisplayName(post.profiles)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-stone-400">{formatDate(post.created_at)}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleLike(post.id, post.liked || false); }}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                              post.liked 
                                ? 'bg-red-100 text-red-600' 
                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                            }`}
                          >
                            <Heart className="w-3 h-3" />
                            {post.likes || 0}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Load More */}
          {hasMore && !loading && sortedPosts.length > 0 && (
            <div className="p-4 border-t border-stone-200 text-center">
              <button
                onClick={() => loadPosts(true)}
                className="px-4 py-2 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors"
              >
                더 불러오기
              </button>
            </div>
          )}
        </div>
        
        {/* Footer Info */}
        <div className="mt-8 text-center text-xs text-stone-400">
          <p>성경 구절을 클릭하면 해당 구절의 상세 페이지로 이동합니다</p>
        </div>
      </main>
    </div>
  );
}

export default function ScriptureBoardPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-[#faf9f7]">
      <div className="flex items-center gap-3">
        <BookOpen className="w-6 h-6 text-stone-400" />
        <span className="text-stone-500">묵상 게시판을 불러오는 중...</span>
      </div>
    </div>}>
      <ScriptureBoardContent />
    </Suspense>
  );
}
