'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, Heart, Loader2, User, AlertCircle, Send, MessageSquare,
  CheckCircle2, XCircle, HelpCircle, Shield, Link2, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/app/components/AuthProvider';
import { 
  getSupabase, addLike, removeLike, hasUserLiked, getLikesCount,
  getReplies, addReply, getMyProfile, toggleUrgentPrayer, updatePrayerResponse,
  Profile
} from '@/app/lib/supabase';

interface Reply {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    nickname: string | null;
    email: string | null;
    tier: string;
    avatar_url?: string | null;
    username?: string | null;
  };
}

interface LinkedPrayer {
  id: string;
  content: string;
  created_at: string;
}

type AdminTier = '소장' | '부소장' | '매니저' | '스태프' | '관리자' | '스태프' | 'Admin' | 'Staff';

interface PrayerPost {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  verse_ref: string;
  category: string;
  is_urgent: boolean;
  is_answered: boolean;
  prayer_response?: 'Wait' | 'Yes' | 'No' | null;
  linked_post_id?: string | null;
  testimony_note?: string;
  likes: number;
  liked?: boolean;
  profiles?: {
    nickname: string | null;
    email: string | null;
    tier: string;
  } | null;
  replies: Reply[];
  linked_prayer?: LinkedPrayer | null;
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
  
  // User profile for tier checking
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  
  // Prayer response modal
  const [responseModalOpen, setResponseModalOpen] = useState(false);
  const [updatingResponse, setUpdatingResponse] = useState(false);

  useEffect(() => {
    if (prayerId) {
      loadPrayer();
    }
  }, [prayerId]);

  useEffect(() => {
    if (user) {
      getMyProfile().then(setMyProfile).catch(console.error);
    }
  }, [user]);

  const loadPrayer = async () => {
    try {
      setLoading(true);
      const supabase = getSupabase();
      
      // Load prayer post with profile and linked prayer
      const { data: prayerData, error: prayerError } = await supabase
        .from('reflections')
        .select(`
          id, user_id, content, created_at, verse_ref, category, 
          is_urgent, is_answered, prayer_response, linked_post_id, testimony_note,
          profiles:profiles(nickname, email, tier),
          linked_prayer:linked_post_id(id, content, created_at)
        `)
        .eq('id', prayerId)
        .single();
        
      if (prayerError) throw prayerError;
      
      // Load likes
      const likes = await getLikesCount(prayerId);
      const liked = user ? await hasUserLiked(prayerId) : false;
      
      // Load replies with profiles
      const replies = await getReplies(prayerId);
      
      setPrayer({
        ...prayerData,
        likes,
        liked,
        replies: replies || [],
        linked_prayer: Array.isArray(prayerData.linked_prayer) 
          ? prayerData.linked_prayer[0] 
          : prayerData.linked_prayer,
        profiles: Array.isArray(prayerData.profiles)
          ? prayerData.profiles[0]
          : prayerData.profiles
      });
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
      if (prayer.liked) {
        await removeLike(prayer.id);
        setPrayer({ ...prayer, liked: false, likes: prayer.likes - 1 });
      } else {
        await addLike(prayer.id);
        setPrayer({ ...prayer, liked: true, likes: prayer.likes + 1 });
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  // Check if user is admin/manager level
  const isAdminLevel = () => {
    const tier = myProfile?.tier;
    const adminTiers: AdminTier[] = ['소장', '부소장', '매니저', '스태프', '관리자', '스태프', 'Admin', 'Staff'];
    return adminTiers.includes(tier as AdminTier);
  };

  // Handle urgent prayer toggle
  const handleToggleUrgent = async () => {
    if (!prayer || !isAdminLevel()) return;
    
    try {
      await toggleUrgentPrayer(prayer.id, !prayer.is_urgent);
      setPrayer({ ...prayer, is_urgent: !prayer.is_urgent });
    } catch (err) {
      console.error('Error toggling urgent prayer:', err);
      alert('긴급 기도 설정 중 오류가 발생했습니다.');
    }
  };

  // Handle prayer response update
  const handleUpdateResponse = async (response: 'Wait' | 'Yes' | 'No') => {
    if (!prayer) return;
    
    setUpdatingResponse(true);
    try {
      await updatePrayerResponse(prayer.id, response);
      setPrayer({ ...prayer, prayer_response: response });
      setResponseModalOpen(false);
    } catch (err) {
      console.error('Error updating prayer response:', err);
      alert('기도 응답 업데이트 중 오류가 발생했습니다.');
    } finally {
      setUpdatingResponse(false);
    }
  };

  // Get prayer response badge
  const getResponseBadge = () => {
    if (!prayer?.prayer_response) return null;
    
    const config = {
      Wait: { color: 'bg-amber-100 text-amber-800', icon: HelpCircle, label: '기다림' },
      Yes: { color: 'bg-green-100 text-green-800', icon: CheckCircle2, label: '응답됨' },
      No: { color: 'bg-red-100 text-red-800', icon: XCircle, label: '거절됨' }
    };
    
    const { color, icon: Icon, label } = config[prayer.prayer_response];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        <Icon className="w-3 h-3" />
        응답: {label}
      </span>
    );
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
          <div className="flex-1 flex items-center gap-2">
            <h1 className="text-lg font-bold text-stone-800">기도 제목</h1>
            {/* Prayer Response Badge */}
            {getResponseBadge()}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto p-4">
        {/* Prayer Card */}
        <div className={`bg-white rounded-xl border p-6 mb-4 ${
          prayer.is_urgent ? 'border-red-300' : 'border-stone-200'
        }`}>
          {/* Admin: Urgent Prayer Toggle */}
          {isAdminLevel() && (
            <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-800">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">관리자 기능</span>
                </div>
                <button
                  onClick={handleToggleUrgent}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    prayer.is_urgent
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {prayer.is_urgent ? '🚨 긴급 해제' : '🚨 긴급 기도로 설정'}
                </button>
              </div>
            </div>
          )}

          {/* Urgent Badge */}
          {prayer.is_urgent && (
            <div className="flex items-center gap-1 text-red-600 text-sm font-medium mb-4">
              <AlertCircle className="w-5 h-5" />
              🚨 긴급 기도 제목
            </div>
          )}

          {/* Linked Previous Prayer */}
          {prayer.linked_prayer && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <button
                onClick={() => router.push(`/community/prayer/${prayer.linked_prayer?.id}`)}
                className="flex items-start gap-2 text-left w-full hover:opacity-80"
              >
                <Link2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-blue-600 font-medium mb-1">🔗 이전 기도</p>
                  <p className="text-sm text-blue-800 truncate">{prayer.linked_prayer.content}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-400 flex-shrink-0" />
              </button>
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
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={handleToggleLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                prayer.liked 
                  ? 'bg-red-100 text-red-600' 
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <Heart className="w-5 h-5" fill={prayer.liked ? 'currentColor' : 'none'} />
              {prayer.liked ? '좋아요 취소' : '좋아요'} ({prayer.likes})
            </button>

            {/* Author: Prayer Response Button */}
            {user?.id === prayer.user_id && (
              <button
                onClick={() => setResponseModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
              >
                <CheckCircle2 className="w-5 h-5" />
                ✅ 기도 완료 및 응답 기록
              </button>
            )}
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

      {/* Prayer Response Modal */}
      {responseModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-stone-800 mb-4">
              하나님의 응답을 기록합니다
            </h3>
            <p className="text-sm text-stone-600 mb-6">
              이 기도 제목에 대한 하나님의 응답을 선택해주세요.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => handleUpdateResponse('Wait')}
                disabled={updatingResponse}
                className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors text-left"
              >
                <HelpCircle className="w-6 h-6 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">기다림 (Wait)</p>
                  <p className="text-xs text-amber-600">아직 응답을 기다리고 있습니다</p>
                </div>
              </button>
              
              <button
                onClick={() => handleUpdateResponse('Yes')}
                disabled={updatingResponse}
                className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-green-200 bg-green-50 hover:bg-green-100 transition-colors text-left"
              >
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">응답됨 (Yes)</p>
                  <p className="text-xs text-green-600">하나님이 기도를 응답하셨습니다</p>
                </div>
              </button>
              
              <button
                onClick={() => handleUpdateResponse('No')}
                disabled={updatingResponse}
                className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-red-200 bg-red-50 hover:bg-red-100 transition-colors text-left"
              >
                <XCircle className="w-6 h-6 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">거절됨 (No)</p>
                  <p className="text-xs text-red-600">다른 길로 인도하십니다</p>
                </div>
              </button>
            </div>
            
            <button
              onClick={() => setResponseModalOpen(false)}
              disabled={updatingResponse}
              className="mt-6 w-full py-2 px-4 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
