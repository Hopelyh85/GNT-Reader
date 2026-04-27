'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, LogOut, LogIn, MessageSquare, Heart, Loader2, User, Megaphone, Eye
} from 'lucide-react';
import { useAuth } from '@/app/components/AuthProvider';
import { 
  getPublicReflections, getSupabase, addLike, removeLike, hasUserLiked, getLikesCount,
  getMyProfile, signOut, Profile
} from '@/app/lib/supabase';

interface Post {
  id: string;
  user_id: string;
  title?: string;
  content: string;
  created_at: string;
  verse_ref: string;
  category: string;
  likes: number;
  liked?: boolean;
  views?: number;
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
  
  // Accordion state for expanded posts
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<Record<string, any[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});

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

  // Toggle accordion for post
  const toggleAccordion = async (postId: string) => {
    const isExpanding = expandedPostId !== postId;
    setExpandedPostId(prev => prev === postId ? null : postId);
    
    if (isExpanding) {
      // Load comments when expanding
      loadPostComments(postId);
      
      // Increment views via RPC
      try {
        const { error } = await getSupabase().rpc('increment_views', { post_id: postId });
        if (error) throw error;
        
        // Update local views count immediately
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, views: (post.views || 0) + 1 }
            : post
        ));
      } catch (err) {
        console.error('Error incrementing views:', err);
      }
    }
  };

  // Load comments for a post
  const loadPostComments = async (postId: string) => {
    if (loadingComments[postId]) return;
    
    setLoadingComments(prev => ({ ...prev, [postId]: true }));
    try {
      const { data, error } = await getSupabase()
        .from('comments')
        .select('id, content, created_at, user_id, profiles!inner(id, nickname, tier)')
        .eq('post_id', postId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setPostComments(prev => ({ ...prev, [postId]: data || [] }));
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }));
    }
  };

  // Add comment to post
  const addComment = async (postId: string) => {
    const content = newComment[postId]?.trim();
    if (!content) return;
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const { error } = await getSupabase().from('comments').insert({
        post_id: postId,
        user_id: user.id,
        content: content,
        is_deleted: false
      });

      if (error) throw error;

      setNewComment(prev => ({ ...prev, [postId]: '' }));
      await loadPostComments(postId);
    } catch (err) {
      console.error('Error adding comment:', err);
      alert('댓글 등록에 실패했습니다.');
    }
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
              <p className="text-xs text-stone-500">성도들의 자유로운 소통과 나눔의 공간입니다</p>
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
          <div className="border-t border-stone-200">
            {posts.map((post) => {
              const isExpanded = expandedPostId === post.id;
              return (
                <div
                  key={post.id}
                  className="border-b border-stone-200 last:border-b-0"
                >
                  {/* Row Header - Clickable */}
                  <div
                    onClick={() => toggleAccordion(post.id)}
                    className="flex items-center py-3 px-4 hover:bg-stone-50 cursor-pointer transition-colors"
                  >
                    {/* Author Nickname - Fixed width with truncate */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/profile/${post.user_id}`);
                      }}
                      className="w-24 flex-shrink-0 text-sm font-medium text-stone-700 hover:text-blue-600 hover:underline truncate text-left"
                    >
                      {post.profiles?.nickname || post.profiles?.email?.split('@')[0] || '익명'}
                    </button>

                    {/* Title - Flex grow with truncate */}
                    <div className="flex-1 px-3 min-w-0">
                      <p className="text-sm text-stone-800 truncate text-left hover:text-stone-600 transition-colors">
                        {post.title || post.content.substring(0, 60) + (post.content.length > 60 ? '...' : '')}
                      </p>
                    </div>

                    {/* Views */}
                    <div className="w-16 flex-shrink-0 flex items-center justify-center gap-1 text-xs text-stone-400">
                      <Eye className="w-3 h-3" />
                      {post.views || 0}
                    </div>

                    {/* Date - Right aligned */}
                    <p className="w-32 flex-shrink-0 text-xs text-stone-400 text-right">
                      {formatTime(post.created_at)}
                    </p>
                  </div>

                  {/* Accordion Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 bg-stone-50/50 border-t border-stone-100">
                      {/* Post Content */}
                      <p className="text-stone-800 leading-relaxed py-3 whitespace-pre-wrap">{post.content}</p>

                      {/* Like Button */}
                      <div className="flex items-center gap-4 py-2 border-t border-stone-200">
                        <button
                          onClick={() => handleToggleLike(post.id, post.liked || false)}
                          className={`flex items-center gap-1 text-sm ${post.liked ? 'text-red-600' : 'text-stone-500'}`}
                        >
                          <Heart className="w-4 h-4" fill={post.liked ? 'currentColor' : 'none'} />
                          {post.likes || 0}
                        </button>
                      </div>

                      {/* Comments Section */}
                      <div className="mt-3 pt-3 border-t border-stone-200">
                        <h4 className="text-xs font-semibold text-stone-600 mb-2">댓글</h4>
                        
                        {/* Comments List */}
                        {loadingComments[post.id] ? (
                          <div className="py-2 text-xs text-stone-400">댓글 로딩 중...</div>
                        ) : (postComments[post.id] || []).length > 0 ? (
                          <div className="space-y-2">
                            {(postComments[post.id] || []).map((comment) => (
                              <div key={comment.id} className="py-2 border-b border-stone-100 last:border-b-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium text-stone-700">
                                    {comment.profiles?.nickname || '익명'}
                                  </span>
                                  <span className="text-xs text-stone-400">
                                    {formatTime(comment.created_at)}
                                  </span>
                                </div>
                                <p className="text-sm text-stone-800">{comment.content}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-stone-400 py-2">아직 댓글이 없습니다.</p>
                        )}

                        {/* Comment Input */}
                        {user && (
                          <div className="mt-3 pt-2">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newComment[post.id] || ''}
                                onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                                placeholder="댓글을 작성하세요..."
                                className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addComment(post.id);
                                }}
                                disabled={!newComment[post.id]?.trim()}
                                className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                등록
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
