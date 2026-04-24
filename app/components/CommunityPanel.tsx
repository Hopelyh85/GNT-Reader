'use client';

import { useState, useEffect, useCallback } from 'react';
import { SelectedVerse } from '@/app/types';
import { 
  Users, Send, Loader2, MessageSquare, Pin, BookOpen, Hash, 
  ChevronDown, ChevronUp, Link2, Crown, MessageCircle, CornerDownRight,
  Heart, Trash2
} from 'lucide-react';
import { 
  addPublicReflection, getPublicReflections, getSupabase, toggleBestReflection,
  addReply, getReplies, togglePinPost, getPinnedPosts, StudioReflection,
  addLike, removeLike, hasUserLiked, getLikesCount, deleteReflection, getCurrentUser
} from '@/app/lib/supabase';

interface CommunityPanelProps {
  selectedVerse: SelectedVerse | null;
  isLoggedIn: boolean;
  userRole: string;
  userName: string;
  initialPostId?: string | null;
}

interface Post extends StudioReflection {
  replyCount?: number;
  likesCount?: number;
  userHasLiked?: boolean;
}

export function CommunityPanel({ 
  selectedVerse, isLoggedIn, userRole, userName, initialPostId 
}: CommunityPanelProps) {
  const canWrite = isLoggedIn;
  const isAdmin = userRole === '⭐⭐⭐' || userRole === 'admin' || userRole === 'ADMIN';
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // New post states
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [includeVerse, setIncludeVerse] = useState(false);
  
  // Posts states
  const [posts, setPosts] = useState<Post[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  
  // Accordion state
  const [expandedPostId, setExpandedPostId] = useState<string | null>(initialPostId || null);
  
  // Replies state
  const [replies, setReplies] = useState<Record<string, StudioReflection[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({});
  const [newReply, setNewReply] = useState<Record<string, string>>({});
  const [savingReply, setSavingReply] = useState<Record<string, boolean>>({});

  // Get current user ID
  useEffect(() => {
    getCurrentUser().then(user => setCurrentUserId(user?.id || null));
  }, []);

  // Load pinned posts with likes
  const loadPinnedPosts = useCallback(async () => {
    try {
      const data = await getPinnedPosts();
      const postsWithLikes = await Promise.all(
        (data as Post[]).map(async (post) => {
          const [count, liked] = await Promise.all([
            getLikesCount(post.id),
            hasUserLiked(post.id)
          ]);
          return { ...post, likesCount: count, userHasLiked: liked };
        })
      );
      setPinnedPosts(postsWithLikes);
    } catch (err: any) {
      console.error('Error loading pinned posts:', err?.message);
    }
  }, []);

  // Load regular posts with likes
  const loadPosts = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    setLoadingPosts(true);
    try {
      const result = await getPublicReflections(undefined, pageNum, 20);
      const pinnedIds = new Set(pinnedPosts.map(p => p.id));
      const filteredPosts = (result.data || []).filter(p => !pinnedIds.has(p.id));
      
      const postsWithLikes = await Promise.all(
        (filteredPosts as Post[]).map(async (post) => {
          const [count, liked] = await Promise.all([
            getLikesCount(post.id),
            hasUserLiked(post.id)
          ]);
          return { ...post, likesCount: count, userHasLiked: liked };
        })
      );
      
      if (append) {
        setPosts(prev => [...prev, ...postsWithLikes]);
      } else {
        setPosts(postsWithLikes);
      }
      
      setHasMore((result.data || []).length === 20);
    } catch (err: any) {
      console.error('Error loading posts:', err?.message);
    } finally {
      setLoadingPosts(false);
    }
  }, [pinnedPosts]);

  // Load reply counts
  const loadReplyCounts = useCallback(async () => {
    const supabase = getSupabase();
    const allPosts = [...pinnedPosts, ...posts];
    
    for (const post of allPosts) {
      const { count } = await supabase
        .from('reflections')
        .select('*', { count: 'exact', head: true })
        .eq('parent_id', post.id)
        .eq('is_public', true);
      
      post.replyCount = count || 0;
    }
    
    setPosts([...posts]);
    setPinnedPosts([...pinnedPosts]);
  }, [posts, pinnedPosts]);

  // Initial load
  useEffect(() => {
    loadPinnedPosts();
  }, [loadPinnedPosts]);

  useEffect(() => {
    if (pinnedPosts.length >= 0) {
      loadPosts(1, false);
    }
  }, [pinnedPosts.length, loadPosts]);

  // Load replies when post is expanded
  useEffect(() => {
    if (expandedPostId && !replies[expandedPostId]) {
      loadReplies(expandedPostId);
    }
  }, [expandedPostId]);

  const loadReplies = async (postId: string) => {
    setLoadingReplies(prev => ({ ...prev, [postId]: true }));
    try {
      const data = await getReplies(postId);
      setReplies(prev => ({ ...prev, [postId]: data }));
    } catch (err: any) {
      console.error('Error loading replies:', err?.message);
    } finally {
      setLoadingReplies(prev => ({ ...prev, [postId]: false }));
    }
  };

  // Save new post
  const handleSavePost = async () => {
    if (!newContent.trim() || !canWrite) return;

    setSaving(true);
    try {
      const verseRef = includeVerse && selectedVerse 
        ? `${selectedVerse.book} ${selectedVerse.chapter}:${selectedVerse.verse}`
        : '글로벌 게시판';
      
      await addPublicReflection(
        verseRef,
        selectedVerse?.book || 'GLOBAL',
        selectedVerse?.chapter || 0,
        selectedVerse?.verse || 0,
        newContent,
        true,
        'general',
        null,
        newTitle.trim() || null
      );

      setNewTitle('');
      setNewContent('');
      await loadPosts(1, false);
      await loadPinnedPosts();
    } catch (err: any) {
      console.error('Error saving post:', err?.message, err?.details);
      alert('게시글 저장 중 오류: ' + (err?.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  // Save reply
  const handleSaveReply = async (postId: string) => {
    const content = newReply[postId];
    if (!content?.trim() || !canWrite) return;

    setSavingReply(prev => ({ ...prev, [postId]: true }));
    try {
      await addReply(postId, content);
      setNewReply(prev => ({ ...prev, [postId]: '' }));
      await loadReplies(postId);
      await loadReplyCounts();
    } catch (err: any) {
      console.error('Error saving reply:', err?.message);
      alert('댓글 저장 중 오류: ' + (err?.message || 'Unknown error'));
    } finally {
      setSavingReply(prev => ({ ...prev, [postId]: false }));
    }
  };

  // Toggle like
  const handleToggleLike = async (postId: string, currentLiked: boolean) => {
    if (!isLoggedIn) {
      alert('로그인 후 좋아요를 누를 수 있습니다.');
      return;
    }
    try {
      if (currentLiked) {
        await removeLike(postId);
      } else {
        await addLike(postId);
      }
      // Update local state
      const newCount = await getLikesCount(postId);
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, likesCount: newCount, userHasLiked: !currentLiked } : p
      ));
      setPinnedPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, likesCount: newCount, userHasLiked: !currentLiked } : p
      ));
    } catch (err: any) {
      console.error('Error toggling like:', err?.message);
    }
  };

  // Delete post
  const handleDelete = async (postId: string, postUserId: string) => {
    const canDelete = currentUserId === postUserId || isAdmin;
    if (!canDelete) {
      alert('삭제 권한이 없습니다.');
      return;
    }
    
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
      await deleteReflection(postId);
      await loadPosts(1, false);
      await loadPinnedPosts();
    } catch (err: any) {
      console.error('Error deleting post:', err?.message);
      alert('삭제 중 오류: ' + (err?.message || 'Unknown error'));
    }
  };

  // Toggle pin
  const handleTogglePin = async (postId: string, currentPin: boolean) => {
    try {
      await togglePinPost(postId, !currentPin);
      await loadPinnedPosts();
      await loadPosts(1, false);
    } catch (err: any) {
      console.error('Error toggling pin:', err?.message);
      alert('공지 설정 중 오류: ' + (err?.message || 'Unknown error'));
    }
  };

  // Toggle best
  const handleToggleBest = async (postId: string, currentBest: boolean) => {
    try {
      await toggleBestReflection(postId, !currentBest);
      await loadPosts(1, false);
    } catch (err: any) {
      console.error('Error toggling best:', err?.message);
      alert('베스트 설정 중 오류: ' + (err?.message || 'Unknown error'));
    }
  };

  // Share/copy link
  const handleShare = (postId: string) => {
    const url = `https://gnt-reader.vercel.app/?post_id=${postId}`;
    navigator.clipboard.writeText(url);
    alert('링크가 클립보드에 복사되었습니다!');
  };

  // Toggle accordion
  const toggleExpand = (postId: string) => {
    setExpandedPostId(prev => prev === postId ? null : postId);
  };

  // Load more
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadPosts(nextPage, true);
  };

  // Absolute time format: YYYY. MM. DD. HH:mm
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}. ${month}. ${day}. ${hours}:${minutes}`;
  };

  // Get display name from profile with fallback chain
  // 1. nickname → 2. username → 3. email.split('@')[0] → 4. '익명 동역자'
  const getDisplayName = (profile: any) => {
    if (!profile) return '익명 동역자';
    if (profile.nickname) return profile.nickname;
    if (profile.username) return profile.username;
    if (profile.email) return profile.email.split('@')[0];
    return '익명 동역자';
  };

  // Convert URLs in text to clickable links
  const renderContentWithLinks = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  // Avatar component
  const Avatar = ({ url, tier, size = 'md' }: { url?: string | null; tier?: string; size?: 'sm' | 'md' }) => {
    const isAdminUser = tier?.toLowerCase().includes('admin');
    const sizeClass = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';
    const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
    
    return (
      <div className={`relative ${sizeClass} rounded-full overflow-hidden ${isAdminUser ? 'ring-2 ring-amber-400' : 'bg-stone-200'}`}>
        {url ? (
          <img src={url} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-400">
            <Users className={iconSize} />
          </div>
        )}
        {isAdminUser && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center">
            <Crown className="w-2 h-2 text-white" />
          </div>
        )}
      </div>
    );
  };

  // Render post item
  const renderPost = (post: Post, isPinned: boolean = false) => {
    const isExpanded = expandedPostId === post.id;
    const canDelete = currentUserId === post.user_id || isAdmin;
    
    return (
      <div key={post.id} className={`bg-white rounded-lg border ${isPinned ? 'border-amber-300 bg-amber-50/20' : 'border-stone-200'} overflow-hidden`}>
        {/* Post Header - Always visible */}
        <div 
          className="p-4 cursor-pointer hover:bg-stone-50/50 transition-colors"
          onClick={() => toggleExpand(post.id)}
        >
          <div className="flex items-start gap-3">
            <Avatar url={post.profiles?.avatar_url} tier={post.profiles?.tier} />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-stone-800">
                  {getDisplayName(post.profiles)}
                </span>
                {post.profiles?.tier && !post.profiles.tier.toLowerCase().includes('admin') && (
                  <span className="text-xs bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                    {post.profiles.tier}
                  </span>
                )}
                {post.is_best && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                    ★ 베스트
                  </span>
                )}
              </div>
              
              {/* Title */}
              <h3 className="text-base font-semibold text-stone-900 mb-1 line-clamp-2">
                {post.title || '제목 없음'}
              </h3>
              
              {/* Meta info */}
              <div className="flex items-center gap-3 text-xs text-stone-500">
                <span>{formatTime(post.created_at)}</span>
                {post.verse_ref && post.verse_ref !== '글로벌 게시판' && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <BookOpen className="w-3 h-3" />
                    {post.verse_ref}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  {post.replyCount || 0}
                </span>
                <span className="flex items-center gap-1 text-red-500">
                  <Heart className="w-3 h-3" />
                  {post.likesCount || 0}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {isPinned && <Pin className="w-4 h-4 text-amber-500" />}
              {isExpanded ? <ChevronUp className="w-5 h-5 text-stone-400" /> : <ChevronDown className="w-5 h-5 text-stone-400" />}
            </div>
          </div>
        </div>
        
        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-stone-100">
            {/* Post Content */}
            <div className="p-4 pt-3">
              <p className="text-sm text-stone-700 leading-relaxed break-words whitespace-pre-wrap">
                {renderContentWithLinks(post.content)}
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
              {/* Like Button */}
              <button
                onClick={(e) => { e.stopPropagation(); handleToggleLike(post.id, post.userHasLiked || false); }}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                  post.userHasLiked 
                    ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                    : 'text-stone-600 hover:text-red-600 hover:bg-stone-100'
                }`}
              >
                <Heart className={`w-3 h-3 ${post.userHasLiked ? 'fill-current' : ''}`} />
                좋아요 {post.likesCount || 0}
              </button>
              
              <button
                onClick={(e) => { e.stopPropagation(); handleShare(post.id); }}
                className="flex items-center gap-1 px-2 py-1 text-xs text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded transition-colors"
              >
                <Link2 className="w-3 h-3" />
                링크 복사
              </button>
              
              {/* Delete Button - Only for author or admin */}
              {canDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(post.id, post.user_id); }}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  삭제
                </button>
              )}
              
              {isAdmin && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleTogglePin(post.id, post.is_pinned); }}
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                      post.is_pinned 
                        ? 'text-amber-700 bg-amber-50 hover:bg-amber-100' 
                        : 'text-stone-600 hover:text-amber-700 hover:bg-stone-100'
                    }`}
                  >
                    <Pin className="w-3 h-3" />
                    {post.is_pinned ? '공지 해제' : '공지 등록'}
                  </button>
                  
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleBest(post.id, post.is_best); }}
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                      post.is_best 
                        ? 'text-amber-700 bg-amber-50 hover:bg-amber-100' 
                        : 'text-stone-600 hover:text-amber-700 hover:bg-stone-100'
                    }`}
                  >
                    <Crown className="w-3 h-3" />
                    {post.is_best ? '베스트 해제' : '베스트 선정'}
                  </button>
                </>
              )}
            </div>
            
            {/* Replies Section */}
            <div className="border-t border-stone-100 bg-stone-50/30 p-4">
              <h4 className="text-xs font-medium text-stone-600 mb-3 flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                댓글 {replies[post.id]?.length || post.replyCount || 0}
              </h4>
              
              {/* Existing Replies */}
              {loadingReplies[post.id] ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                </div>
              ) : (
                <div className="space-y-3 mb-4">
                  {(replies[post.id] || []).map((reply) => (
                    <div key={reply.id} className="flex gap-2">
                      <CornerDownRight className="w-4 h-4 text-stone-300 mt-1 flex-shrink-0" />
                      <div className="flex-1 bg-white rounded-lg p-3 border border-stone-100">
                        <div className="flex items-center gap-2 mb-1">
                          <Avatar url={reply.profiles?.avatar_url} tier={reply.profiles?.tier} size="sm" />
                          <span className="text-xs font-medium text-stone-700">
                            {getDisplayName(reply.profiles)}
                          </span>
                          <span className="text-xs text-stone-400">{formatTime(reply.created_at)}</span>
                        </div>
                        <p className="text-sm text-stone-700 leading-relaxed break-words whitespace-pre-wrap pl-8">
                          {reply.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Reply Input */}
              {canWrite && (
                <div className="flex gap-2">
                  <CornerDownRight className="w-4 h-4 text-stone-300 mt-2 flex-shrink-0" />
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={newReply[post.id] || ''}
                      onChange={(e) => setNewReply(prev => ({ ...prev, [post.id]: e.target.value }))}
                      placeholder="댓글을 입력하세요..."
                      className="flex-1 px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-200"
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveReply(post.id)}
                    />
                    <button
                      onClick={() => handleSaveReply(post.id)}
                      disabled={!newReply[post.id]?.trim() || savingReply[post.id]}
                      className="px-3 py-2 bg-stone-700 text-white text-sm rounded-lg hover:bg-stone-600 disabled:opacity-50 transition-colors"
                    >
                      {savingReply[post.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
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
        {/* New Post Input */}
        {canWrite && (
          <div className="p-3 border-b border-stone-200 bg-white">
            <div className="space-y-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="제목을 입력하세요 (선택사항)"
                className="w-full px-3 py-2 text-sm font-medium bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-200 placeholder:text-stone-400"
              />
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
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
                  disabled={!newContent.trim() || saving}
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

        {/* Pinned Posts */}
        {pinnedPosts.length > 0 && (
          <div className="p-3 space-y-2 border-b border-stone-200 bg-amber-50/20">
            <div className="flex items-center gap-2 px-1">
              <Pin className="w-3 h-3 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">공지사항</span>
            </div>
            {pinnedPosts.map(post => renderPost(post, true))}
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
          ) : posts.length === 0 && pinnedPosts.length === 0 ? (
            <div className="text-center py-8 text-stone-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">아직 게시글이 없습니다.</p>
              <p className="text-xs mt-1">첫 번째 글을 작성해보세요!</p>
            </div>
          ) : (
            <>
              {posts.map(post => renderPost(post))}
              
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
