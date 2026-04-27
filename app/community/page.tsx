'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, LogOut, LogIn, MessageSquare, Heart, Loader2, User, Megaphone
} from 'lucide-react';
import { useAuth } from '@/app/components/AuthProvider';
import { 
  getPublicReflections, getSupabase, addLike, removeLike, hasUserLiked, getLikesCount,
  getMyProfile, signOut, Profile
} from '@/app/lib/supabase';

interface Post {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  verse_ref: string;
  category: string;
  likes: number;
  liked?: boolean;
  profiles?: {
    nickname: string;
    email: string;
    tier: string;
  };
}

interface Notice {
  id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

function CommunityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingNotices, setLoadingNotices] = useState(true);

  // Get post ID from URL for deep linking
  const postId = searchParams.get('post');

  useEffect(() => {
    if (user) {
      getMyProfile().then(setProfile).catch(console.error);
    }
    loadPosts();
    loadNotices();
  }, [user]);

  const loadNotices = async () => {
    setLoadingNotices(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
      if (!error) {
        setNotices(data || []);
      }
    } catch (err) {
      console.error('Error loading notices:', err);
    } finally {
      setLoadingNotices(false);
    }
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      const result = await getPublicReflections(undefined, 1, 100);
      const allPosts = result.data || [];
      
      // Filter only community posts (not prayer, not translation)
      const communityPosts = allPosts.filter((p: any) => 
        p.category !== 'prayer_general' && 
        p.category !== 'prayer_world' && 
        p.category !== 'translation'
      );
      
      // Load likes for each post
      const postsWithLikes = await Promise.all(
        communityPosts.map(async (post: any) => {
          const likes = await getLikesCount(post.id);
          const liked = user ? await hasUserLiked(post.id) : false;
          return { ...post, likes, liked } as Post;
        })
      );
      
      setPosts(postsWithLikes);
    } catch (err) {
      console.error('Error loading posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLike = async (postId: string, currentlyLiked: boolean) => {
    if (!user) {
      router.push('/login');
      return;
    }
    try {
      if (currentlyLiked) {
        await removeLike(postId);
      } else {
        await addLike(postId);
      }
      setPosts(posts.map(p => 
        p.id === postId 
          ? { ...p, liked: !currentlyLiked, likes: p.likes + (currentlyLiked ? -1 : 1) }
          : p
      ));
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isLoggedIn = !!user;
  const isAdmin = profile?.tier === '관리자' || profile?.tier === 'Admin';
  const userName = profile?.nickname || user?.email?.split('@')[0] || '게스트';

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-stone-600" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-stone-800">커뮤니티 게시판</h1>
              <p className="text-xs text-stone-500">성경 묵상과 나눔의 공간</p>
            </div>
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-2">
            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push('/profile')}
                  className="text-xs text-stone-500 hover:text-amber-600 hover:underline"
                >
                  {isAdmin ? '👑 ' : ''}{userName}
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-sm text-stone-600"
                >
                  <LogOut className="w-4 h-4" />
                  <span>로그아웃</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="flex items-center gap-2 px-3 py-1.5 bg-stone-700 text-white rounded-lg text-sm hover:bg-stone-600"
              >
                <LogIn className="w-4 h-4" />
                로그인
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4">
        {/* Notice Section */}
        {!loadingNotices && notices.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Megaphone className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold text-blue-800">📢 공지사항</h2>
            </div>
            <div className="space-y-2">
              {notices.map((notice) => (
                <div key={notice.id} className="bg-white/70 rounded-lg p-3 border border-blue-100">
                  <p className="text-sm text-stone-800 whitespace-pre-wrap">{notice.content}</p>
                  <p className="text-xs text-stone-400 mt-2">{formatTime(notice.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Posts Section */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-3" />
            <p>아직 게시글이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-xl border border-stone-200 p-4 hover:shadow-md transition-shadow"
              >
                {/* Author */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-stone-400" />
                  </div>
                  <div className="flex-1">
                    <button
                      onClick={() => router.push(`/profile/${post.user_id}`)}
                      className="text-sm font-medium text-stone-700 hover:text-blue-600 hover:underline"
                    >
                      {post.profiles?.nickname || post.profiles?.email?.split('@')[0] || '익명'}
                    </button>
                    <p className="text-xs text-stone-400">{formatTime(post.created_at)}</p>
                  </div>
                </div>

                {/* Content */}
                <p className="text-stone-800 leading-relaxed mb-3 whitespace-pre-wrap">{post.content}</p>

                {/* Actions */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleToggleLike(post.id, post.liked || false)}
                    className={`flex items-center gap-1 text-sm ${post.liked ? 'text-red-600' : 'text-stone-500'}`}
                  >
                    <Heart className="w-4 h-4" fill={post.liked ? 'currentColor' : 'none'} />
                    {post.likes || 0}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function CommunityPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-stone-50">
      <div className="text-stone-500">로딩 중...</div>
    </div>}>
      <CommunityContent />
    </Suspense>
  );
}
