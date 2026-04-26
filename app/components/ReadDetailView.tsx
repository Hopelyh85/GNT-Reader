'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, MessageSquare, Loader2, CornerDownRight } from 'lucide-react';
import { getSupabase } from '@/app/lib/supabase';

interface Profile {
  nickname?: string;
  email?: string;
  tier?: string;
  church_name?: string;
  job_position?: string;
  show_church?: boolean;
  show_job?: boolean;
}

interface Reply {
  id: string;
  content: string;
  created_at: string;
  profiles?: Profile;
}

interface Post {
  id: string;
  verse_ref: string;
  book: string;
  chapter: number;
  verse: number;
  content: string;
  commentary?: string;
  category?: string;
  created_at: string;
  profiles?: Profile;
}

interface ReadDetailViewProps {
  post: Post;
  onClose: () => void;
  onNavigateToStudy: () => void;
}

export default function ReadDetailView({ post, onClose, onNavigateToStudy }: ReadDetailViewProps) {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [newReply, setNewReply] = useState('');
  const [savingReply, setSavingReply] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  // Load replies
  useEffect(() => {
    loadReplies();
  }, [post.id]);

  const loadReplies = async () => {
    setLoadingReplies(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('replies')
        .select('*, profiles(nickname, email, tier, church_name, job_position, show_church, show_job)')
        .eq('parent_id', post.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setReplies(data || []);
    } catch (err) {
      console.error('Error loading replies:', err);
    } finally {
      setLoadingReplies(false);
    }
  };

  const handleSaveReply = async () => {
    if (!newReply.trim() || !currentUser) return;
    
    setSavingReply(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('replies').insert({
        user_id: currentUser.id,
        parent_id: post.id,
        content: newReply,
        is_public: true
      });
      
      if (error) throw error;
      
      setNewReply('');
      await loadReplies();
    } catch (err) {
      console.error('Error saving reply:', err);
      alert('댓글 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingReply(false);
    }
  };

  const getDisplayName = (profile?: Profile) => {
    if (!profile) return '익명';
    
    const parts: string[] = [];
    
    if (profile.show_church && profile.church_name) {
      parts.push(`[${profile.church_name}]`);
    }
    
    if (profile.show_job && profile.job_position) {
      parts.push(`[${profile.job_position}]`);
    }
    
    parts.push(profile.nickname || profile.email?.split('@')[0] || '익명');
    
    return parts.join(' ');
  };

  const isTranslation = post.category === 'translation';
  const isLoggedIn = !!currentUser;

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-white">
      {/* Dual Navigation Buttons */}
      <div className="sticky top-0 z-20 bg-white border-b border-stone-200 px-4 py-3 flex items-center gap-2">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-sm text-stone-600 hover:text-stone-800 hover:bg-stone-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          말씀 나눔터로
        </button>
        <button
          onClick={onNavigateToStudy}
          className="flex items-center gap-1 text-sm text-amber-700 hover:text-amber-800 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors ml-auto"
        >
          <BookOpen className="w-4 h-4" />
          원어 연구소 해당 구절로
        </button>
      </div>
      
      {/* Verse Reference Header */}
      <div className="px-6 py-4 bg-amber-50/50 border-b border-amber-100">
        <h3 className="font-serif font-bold text-lg text-stone-800">
          {post.verse_ref}
        </h3>
        <p className="text-xs text-stone-500 mt-1">
          {post.book} {post.chapter}장 {post.verse}절
        </p>
      </div>
      
      {/* Post Content */}
      <div className="p-6 space-y-6">
        {/* Post Card */}
        <div className={`p-4 rounded-lg border-2 ${
          isTranslation 
            ? 'bg-blue-50 border-blue-200' 
            : 'bg-purple-50 border-purple-200'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs font-bold px-2 py-1 rounded ${
              isTranslation
                ? 'bg-blue-100 text-blue-700'
                : 'bg-purple-100 text-purple-700'
            }`}>
              {isTranslation ? '📝 개인 번역' : '👑 공식 주석'}
            </span>
            <span className="text-sm font-medium text-stone-700">{getDisplayName(post.profiles)}</span>
            <span className="text-xs text-stone-400">
              {new Date(post.created_at).toLocaleDateString('ko-KR')}
            </span>
          </div>
          <p className="text-base text-stone-800 whitespace-pre-wrap leading-relaxed">
            {post.content}
          </p>
          {post.commentary && (
            <p className="text-sm text-purple-700 mt-3 bg-purple-100 p-3 rounded">
              {post.commentary}
            </p>
          )}
        </div>
        
        {/* Replies Section */}
        <div className="space-y-3">
          <h4 className="font-bold text-stone-700 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            댓글 ({replies.length})
          </h4>
          
          {/* Reply Input */}
          {isLoggedIn && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                placeholder="댓글을 입력하세요..."
                className="flex-1 px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newReply.trim()) {
                    handleSaveReply();
                  }
                }}
              />
              <button
                onClick={handleSaveReply}
                disabled={!newReply.trim() || savingReply}
                className="px-3 py-2 bg-stone-800 text-white text-sm rounded-lg hover:bg-stone-700 disabled:opacity-50"
              >
                {savingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : '작성'}
              </button>
            </div>
          )}
          
          {/* Replies List */}
          {loadingReplies ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
            </div>
          ) : replies.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-4">첫 댓글을 남겨보세요</p>
          ) : (
            <div className="space-y-3">
              {replies.map((reply) => (
                <div key={reply.id} className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <div className="flex items-center gap-2 mb-1">
                    <CornerDownRight className="w-4 h-4 text-stone-400" />
                    <span className="text-sm font-medium text-stone-700">{getDisplayName(reply.profiles)}</span>
                    <span className="text-xs text-stone-400">
                      {new Date(reply.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <p className="text-sm text-stone-800 ml-6">{reply.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
