'use client';

import { useState, useEffect, useCallback } from 'react';
import { SelectedVerse } from '@/app/types';
import { Users, Send, Loader2, Clock, MessageSquare, Pin, BookOpen, Hash } from 'lucide-react';
import { addPublicReflection, getPublicReflections, getSupabase } from '@/app/lib/supabase';

interface CommunityPanelProps {
  selectedVerse: SelectedVerse | null;
  isLoggedIn: boolean;
  userRole: string;
  userName: string;
}

interface Post {
  id: string;
  content: string;
  user_id: string;
  verse_ref: string;
  book: string;
  chapter: number;
  verse: number;
  category?: string;
  is_public?: boolean;
  is_best?: boolean;
  created_at: string;
  updated_at?: string;
  profiles?: {
    nickname: string | null;
    tier: string;
    avatar_url?: string | null;
    email?: string;
  };
  replies?: Post[];
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_pinned: boolean;
}

export function CommunityPanel({ selectedVerse, isLoggedIn, userRole, userName }: CommunityPanelProps) {
  const canWrite = isLoggedIn;
  const isAdmin = userRole === '⭐⭐⭐' || userRole === 'admin' || userRole === 'ADMIN';
  
  // Post states
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  
  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  
  // Include verse reference in post
  const [includeVerse, setIncludeVerse] = useState(false);

  // Load announcements (Admin notices)
  useEffect(() => {
    async function loadAnnouncements() {
      setLoadingAnnouncements(true);
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .eq('is_pinned', true)
          .order('created_at', { ascending: false })
          .limit(3);
          
        if (error) {
          console.error('Error loading announcements:', error.message);
          return;
        }
        
        setAnnouncements(data || []);
      } catch (err: any) {
        console.error('Error loading announcements:', err?.message);
      } finally {
        setLoadingAnnouncements(false);
      }
    }
    
    loadAnnouncements();
  }, []);

  // Load global posts (all public reflections)
  const loadPosts = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    setLoadingPosts(true);
    try {
      const result = await getPublicReflections(undefined, pageNum, 20);
      
      if (append) {
        setPosts(prev => [...prev, ...(result.data || [])]);
      } else {
        setPosts(result.data || []);
      }
      
      setHasMore((result.data || []).length === 20);
    } catch (err: any) {
      console.error('Error loading posts:', err?.message);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadPosts(1, false);
  }, [loadPosts]);

  // Save new post
  const handleSavePost = async () => {
    if (!newPost.trim() || !canWrite) return;

    setSaving(true);
    try {
      // If includeVerse is checked and there's a selected verse, include it
      const verseRef = includeVerse && selectedVerse 
        ? `${selectedVerse.book} ${selectedVerse.chapter}:${selectedVerse.verse}`
        : null;
      
      await addPublicReflection(
        verseRef || '글로벌 게시판',
        selectedVerse?.book || 'GLOBAL',
        selectedVerse?.chapter || 0,
        selectedVerse?.verse || 0,
        newPost,
        true, // isPublic
        'general', // category
        null // parentId
      );

      setNewPost('');
      // Reload posts
      await loadPosts(1, false);
    } catch (err: any) {
      console.error('Error saving post:', err?.message, err?.details);
      alert('게시글 저장 중 오류: ' + (err?.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  // Load more posts
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadPosts(nextPage, true);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="h-full flex flex-col bg-stone-50">
      {/* Header */}
      <div className="px-4 py-3 bg-stone-100 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-stone-600" />
          <h2 className="text-sm font-serif font-semibold text-stone-700">
            커뮤니티 게시판
          </h2>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          성경 묵상과 나눔의 공간
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Admin Announcements */}
        {loadingAnnouncements ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
          </div>
        ) : announcements.length > 0 && (
          <div className="p-3 space-y-2 border-b border-stone-200 bg-amber-50/30">
            <div className="flex items-center gap-2 px-1">
              <Pin className="w-3 h-3 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">공지사항</span>
            </div>
            {announcements.map((ann) => (
              <div key={ann.id} className="bg-white rounded-lg p-3 border border-amber-200">
                <h4 className="text-sm font-medium text-stone-800 mb-1">{ann.title}</h4>
                <p className="text-xs text-stone-600 leading-relaxed break-words">{ann.content}</p>
                <p className="text-xs text-stone-400 mt-2">{formatTime(ann.created_at)}</p>
              </div>
            ))}
          </div>
        )}

        {/* New Post Input */}
        {canWrite && (
          <div className="p-3 border-b border-stone-200">
            <div className="space-y-2">
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="성경 묵상, 질문, 기도제목 등을 자유롭게 나눠보세요..."
                className="w-full h-24 p-3 text-sm leading-relaxed bg-white border border-stone-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-stone-300 placeholder:text-stone-400"
              />
              
              {/* Include verse reference toggle */}
              {selectedVerse && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIncludeVerse(!includeVerse)}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                      includeVerse 
                        ? 'bg-amber-100 text-amber-700' 
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    <Hash className="w-3 h-3" />
                    {includeVerse ? '성경 주소 포함됨' : '성경 주소 포함'}
                    {includeVerse && (
                      <span className="ml-1 font-medium">
                        {selectedVerse.book} {selectedVerse.chapter}:{selectedVerse.verse}
                      </span>
                    )}
                  </button>
                </div>
              )}
              
              <div className="flex justify-end">
                <button
                  onClick={handleSavePost}
                  disabled={!newPost.trim() || saving}
                  className="flex items-center gap-1 px-4 py-2 bg-stone-700 text-white text-sm rounded-lg hover:bg-stone-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {saving ? '저장 중...' : '게시하기'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Posts Feed */}
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Users className="w-3 h-3 text-stone-500" />
            <span className="text-xs font-medium text-stone-600">전체 게시글</span>
          </div>
          
          {loadingPosts && posts.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8 text-stone-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">아직 게시글이 없습니다.</p>
              <p className="text-xs mt-1">첫 번째 글을 작성해보세요!</p>
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <div key={post.id} className="bg-white rounded-lg p-4 border border-stone-200">
                  {/* Post Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-stone-700">
                        {post.profiles?.nickname || post.user_id.slice(0, 8)}
                      </span>
                      {post.profiles?.tier && (
                        <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded">
                          {post.profiles.tier}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-stone-400">
                      {formatTime(post.created_at)}
                    </span>
                  </div>
                  
                  {/* Verse Reference Tag */}
                  {post.verse_ref && post.verse_ref !== '글로벌 게시판' && (
                    <div className="flex items-center gap-1 mb-2">
                      <BookOpen className="w-3 h-3 text-amber-600" />
                      <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                        {post.verse_ref}
                      </span>
                    </div>
                  )}
                  
                  {/* Post Content */}
                  <p className="text-sm text-stone-700 leading-relaxed break-words whitespace-pre-wrap">
                    {post.content}
                  </p>
                </div>
              ))}
              
              {/* Load More */}
              {hasMore && (
                <button
                  onClick={handleLoadMore}
                  disabled={loadingPosts}
                  className="w-full py-2 text-sm text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  {loadingPosts ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    '더 보기'
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
