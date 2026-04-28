'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Heart, Loader2, User, AlertCircle, Megaphone, Pencil, Link2, X
} from 'lucide-react';
import { useAuth } from '@/app/components/AuthProvider';
import { getSupabase, addLike, removeLike, hasUserLiked, getLikesCount } from '@/app/lib/supabase';

interface PrayerPost {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  verse_ref: string;
  category: string;
  is_urgent: boolean;
  is_answered: boolean;
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

export default function PrayerBoardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState<PrayerPost[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingNotices, setLoadingNotices] = useState(true);

  // New prayer form states
  const [isWritingPrayer, setIsWritingPrayer] = useState(false);
  const [newPrayerContent, setNewPrayerContent] = useState('');
  const [linkedPrayerId, setLinkedPrayerId] = useState<string | null>(null);
  const [userPreviousPrayers, setUserPreviousPrayers] = useState<PrayerPost[]>([]);
  const [submittingPrayer, setSubmittingPrayer] = useState(false);

  useEffect(() => {
    loadPrayers();
    loadNotices();
  }, []);

  useEffect(() => {
    if (user && isWritingPrayer) {
      loadUserPreviousPrayers();
    }
  }, [user, isWritingPrayer]);

  const loadUserPreviousPrayers = async () => {
    if (!user) return;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('reflections')
        .select('id, content, created_at, is_answered')
        .eq('user_id', user.id)
        .or('category.eq.prayer_general,category.eq.prayer_world')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!error && data) {
        setUserPreviousPrayers(data);
      }
    } catch (err) {
      console.error('Error loading previous prayers:', err);
    }
  };

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

  const loadPrayers = async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data: prayers, error } = await supabase
        .from('reflections')
        .select('*, profiles(nickname, email, tier)')
        .eq('is_public', true)
        .in('category', ['prayer_general', 'prayer_world'])
        .order('is_urgent', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Load likes for each post
      const postsWithLikes = await Promise.all(
        (prayers || []).map(async (post: any) => {
          const likes = await getLikesCount(post.id);
          const liked = user ? await hasUserLiked(post.id) : false;
          return { ...post, likes, liked } as PrayerPost;
        })
      );
      
      setPosts(postsWithLikes);
    } catch (err) {
      console.error('Error loading prayers:', err);
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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleAddPrayer = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!newPrayerContent.trim()) {
      alert('기도 제목을 입력해주세요.');
      return;
    }
    
    setSubmittingPrayer(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('reflections')
        .insert({
          user_id: user.id,
          content: newPrayerContent.trim(),
          verse_ref: '기도제목',
          category: 'prayer_general',
          is_public: true,
          linked_post_id: linkedPrayerId
        });
      
      if (error) throw error;
      
      // Reset form and reload
      setNewPrayerContent('');
      setLinkedPrayerId(null);
      setIsWritingPrayer(false);
      await loadPrayers();
      alert('기도 제목이 등록되었습니다.');
    } catch (err) {
      console.error('Error adding prayer:', err);
      alert('기도 제목 등록 중 오류가 발생했습니다.');
    } finally {
      setSubmittingPrayer(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        {/* New Prayer Button */}
        {user && !isWritingPrayer && (
          <div className="mb-6">
            <button
              onClick={() => setIsWritingPrayer(true)}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Pencil className="w-4 h-4" />
              ✏️ 새 기도 제목 작성
            </button>
          </div>
        )}

        {/* New Prayer Form */}
        {user && isWritingPrayer && (
          <div className="mb-6 bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-stone-800 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-600" />
                새 기도 제목
              </h3>
              <button
                onClick={() => {
                  setIsWritingPrayer(false);
                  setNewPrayerContent('');
                  setLinkedPrayerId(null);
                }}
                className="p-1 hover:bg-stone-100 rounded"
              >
                <X className="w-4 h-4 text-stone-500" />
              </button>
            </div>

            {/* Linked Previous Prayer Dropdown */}
            {userPreviousPrayers.length > 0 && (
              <div className="mb-3">
                <label className="text-sm text-stone-600 flex items-center gap-1 mb-1">
                  <Link2 className="w-3 h-3" />
                  🔗 이전 기도 제목 불러오기 (선택)
                </label>
                <select
                  value={linkedPrayerId || ''}
                  onChange={(e) => setLinkedPrayerId(e.target.value || null)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">이전 기도와 연결하지 않음</option>
                  {userPreviousPrayers.map((prayer) => (
                    <option key={prayer.id} value={prayer.id}>
                      {prayer.content?.substring(0, 50)}{prayer.content?.length > 50 ? '...' : ''}
                      {prayer.is_answered ? ' (응답됨)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <textarea
              value={newPrayerContent}
              onChange={(e) => setNewPrayerContent(e.target.value)}
              placeholder="기도 제목을 입력하세요..."
              rows={4}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            />

            <div className="flex gap-2">
              <button
                onClick={handleAddPrayer}
                disabled={submittingPrayer || !newPrayerContent.trim()}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingPrayer ? '등록 중...' : '등록하기'}
              </button>
              <button
                onClick={() => {
                  setIsWritingPrayer(false);
                  setNewPrayerContent('');
                  setLinkedPrayerId(null);
                }}
                className="py-2 px-4 bg-stone-200 text-stone-700 rounded-lg font-medium hover:bg-stone-300 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        )}
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-stone-600" />
          </button>
          <h1 className="text-lg font-bold text-stone-800">기도 제목 게시판</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-4">
        {/* Notice Section - Yellow for prayer board */}
        {!loadingNotices && notices.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Megaphone className="w-5 h-5 text-amber-600" />
              <h2 className="font-bold text-amber-800">📢 공지사항</h2>
            </div>
            <div className="space-y-2">
              {notices.map((notice) => (
                <div key={notice.id} className="bg-white/70 rounded-lg p-3 border border-amber-100">
                  <p className="text-sm text-stone-800 whitespace-pre-wrap">{notice.content}</p>
                  <p className="text-xs text-stone-400 mt-2">{formatTime(notice.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <p>아직 기도 제목이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {posts.map((post) => (
              <div
                key={post.id}
                className={`bg-white rounded-lg border hover:shadow-md transition-shadow overflow-hidden ${
                  post.is_urgent ? 'border-red-300 bg-red-50/30' : 'border-stone-200'
                }`}
              >
                {/* Row Header - Click to navigate */}
                <div
                  className="flex items-center px-4 py-3 cursor-pointer hover:bg-stone-50 transition-colors"
                  onClick={() => router.push(`/community/prayer/${post.id}`)}
                >
                  {/* Urgent Badge + Author */}
                  <div className="w-24 flex-shrink-0 flex items-center gap-2">
                    {post.is_urgent && (
                      <span className="text-red-600" title="긴급 기도">🚨</span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/profile/${post.user_id}`);
                      }}
                      className="text-sm text-stone-700 hover:text-blue-600 truncate text-left"
                    >
                      {post.profiles?.nickname || post.profiles?.email?.split('@')[0] || '익명'}
                    </button>
                  </div>

                  {/* Content/Title - Flex grow with truncate */}
                  <div className="flex-1 px-3 min-w-0">
                    <p className="text-sm text-stone-800 truncate text-left">
                      {post.content?.substring(0, 60) || ''}
                      {post.content?.length > 60 ? '...' : ''}
                    </p>
                  </div>

                  {/* Likes */}
                  <div className="w-14 flex-shrink-0 flex items-center justify-center gap-1 text-xs text-stone-400">
                    <Heart className="w-3 h-3" />
                    {post.likes || 0}
                  </div>

                  {/* Time - HH:mm format */}
                  <p className="w-14 flex-shrink-0 text-xs text-stone-400 text-right">
                    {new Date(post.created_at).toLocaleTimeString('ko-KR', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: false 
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
