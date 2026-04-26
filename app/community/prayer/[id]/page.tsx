'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, Heart, Loader2, User, AlertCircle, Send, MessageSquare
} from 'lucide-react';
import { useAuth } from '@/app/components/AuthProvider';
import { 
  getSupabase, addLike, removeLike, hasUserLiked, getLikesCount,
  getReplies, addReply
} from '@/app/lib/supabase';

interface Reply {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    nickname: string;
    email: string;
    tier: string;
  };
}

interface PrayerPost {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  verse_ref: string;
  category: string;
  is_urgent: boolean;
  is_answered: boolean;
  testimony_note?: string;
  likes: number;
  liked?: boolean;
  profiles?: {
    nickname: string;
    email: string;
    tier: string;
  };
  replies: Reply[];
}

export default function PrayerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const prayerId = params.id as string;
  const { user } = useAuth();
  
  const [prayer, setPrayer] = useState<PrayerPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    if (prayerId) {
      loadPrayer();
    }
  }, [prayerId]);

  const loadPrayer = async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();
      
      // Get prayer post
      const { data: post, error } = await supabase
        .from('reflections')
        .select('*, profiles(nickname, email, tier)')
        .eq('id', prayerId)
        .maybeSingle();
      
      if (error) throw error;
      if (!post) {
        setPrayer(null);
        return;
      }
      
      // Load likes
      const likes = await getLikesCount(post.id);
      const liked = user ? await hasUserLiked(post.id) : false;
      
      // Load replies
      const replies = await getReplies(prayerId);
      
      setPrayer({ ...post, likes, liked, replies: replies || [] } as PrayerPost);
    } catch (err) {
      console.error('Error loading prayer:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLike = async () => {
    if (!user || !prayer) {
      router.push('/login');
      return;
    }
    try {
      const currentlyLiked = prayer.liked || false;
      if (currentlyLiked) {
        await removeLike(prayer.id);
      } else {
        await addLike(prayer.id);
      }
      setPrayer({ 
        ...prayer, 
        liked: !currentlyLiked, 
        likes: prayer.likes + (currentlyLiked ? -1 : 1) 
      });
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleSendReply = async () => {
    if (!user || !replyContent.trim() || !prayer) return;
    
    setSendingReply(true);
    try {
      await addReply(prayer.id, replyContent.trim());
      setReplyContent('');
      // Reload to get new reply
      await loadPrayer();
    } catch (err) {
      console.error('Error sending reply:', err);
      alert('답글 작성에 실패했습니다.');
    } finally {
      setSendingReply(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!prayer) {
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="max-w-2xl mx-auto p-4">
          <button
            onClick={() => router.push('/community/prayer')}
            className="flex items-center gap-2 text-stone-600 hover:text-stone-800 mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            돌아가기
          </button>
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-stone-500">기도 제목을 찾을 수 없습니다.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push('/community/prayer')}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-stone-600" />
          </button>
          <h1 className="text-lg font-bold text-stone-800">기도 제목</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto p-4">
        {/* Prayer Card */}
        <div className={`bg-white rounded-xl border p-6 mb-4 ${
          prayer.is_urgent ? 'border-red-300' : 'border-stone-200'
        }`}>
          {/* Urgent Badge */}
          {prayer.is_urgent && (
            <div className="flex items-center gap-1 text-red-600 text-sm font-medium mb-4">
              <AlertCircle className="w-5 h-5" />
              🚨 긴급 기도 제목
            </div>
          )}

          {/* Author */}
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-stone-100">
            <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-stone-400" />
            </div>
            <div className="flex-1">
              <button
                onClick={() => router.push(`/profile/${prayer.user_id}`)}
                className="text-base font-medium text-stone-800 hover:text-blue-600 hover:underline"
              >
                {prayer.profiles?.nickname || prayer.profiles?.email?.split('@')[0] || '익명'}
              </button>
              <p className="text-sm text-stone-400">{formatTime(prayer.created_at)}</p>
            </div>
          </div>

          {/* Content */}
          <p className="text-stone-800 leading-relaxed text-lg whitespace-pre-wrap mb-6">
            {prayer.content}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleToggleLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                prayer.liked 
                  ? 'bg-red-100 text-red-600' 
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <Heart className="w-5 h-5" fill={prayer.liked ? 'currentColor' : 'none'} />
              <span className="font-medium">기도합니다</span>
              {prayer.likes > 0 && <span className="font-medium">({prayer.likes})</span>}
            </button>
          </div>
        </div>

        {/* Replies Section */}
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <h2 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            기도 답글 ({prayer.replies.length})
          </h2>

          {/* Reply Input */}
          {user && (
            <div className="mb-4 p-3 bg-stone-50 rounded-lg">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="기도 답글을 작성하세요..."
                className="w-full p-3 border border-stone-200 rounded-lg resize-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                rows={3}
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleSendReply}
                  disabled={!replyContent.trim() || sendingReply}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  {sendingReply ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  답글 작성
                </button>
              </div>
            </div>
          )}

          {/* Replies List */}
          {prayer.replies.length === 0 ? (
            <p className="text-center text-stone-400 py-4">아직 답글이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {prayer.replies.map((reply) => (
                <div key={reply.id} className="p-3 bg-stone-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => router.push(`/profile/${reply.user_id}`)}
                      className="text-sm font-medium text-stone-700 hover:text-blue-600 hover:underline"
                    >
                      {reply.profiles?.nickname || reply.profiles?.email?.split('@')[0] || '익명'}
                    </button>
                    <span className="text-xs text-stone-400">{formatTime(reply.created_at)}</span>
                  </div>
                  <p className="text-stone-800 whitespace-pre-wrap">{reply.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
