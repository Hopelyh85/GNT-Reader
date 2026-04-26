'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { 
  ArrowLeft, Heart, MessageSquare, Loader2, Send,
  Crown, Sparkles, Share2, BookOpen
} from 'lucide-react';
import { useAuth } from '@/app/components/AuthProvider';
import { 
  getSupabase, getMyProfile, Profile,
  addReply, getReplies, addLike, removeLike, hasUserLiked, getLikesCount
} from '@/app/lib/supabase';

// Books array with English ID to Korean name mapping
const books = [
  { id: 'Matt', name: '마태복음' }, { id: 'Mark', name: '마가복음' },
  { id: 'Luke', name: '누가복음' }, { id: 'John', name: '요한복음' },
  { id: 'Acts', name: '사도행전' }, { id: 'Rom', name: '로마서' },
  { id: '1Cor', name: '고린도전서' }, { id: '2Cor', name: '고린도후서' },
  { id: 'Gal', name: '갈라디아서' }, { id: 'Eph', name: '에베소서' },
  { id: 'Phil', name: '빌립보서' }, { id: 'Col', name: '골로새서' },
  { id: '1Thess', name: '데살로니가전서' }, { id: '2Thess', name: '데살로니가후서' },
  { id: '1Tim', name: '디모데전서' }, { id: '2Tim', name: '디모데후서' },
  { id: 'Titus', name: '디도서' }, { id: 'Phlm', name: '빌레몬서' },
  { id: 'Heb', name: '히브리서' }, { id: 'Jas', name: '야고보서' },
  { id: '1Pet', name: '베드로전서' }, { id: '2Pet', name: '베드로후서' },
  { id: '1John', name: '요한일서' }, { id: '2John', name: '요한이서' },
  { id: '3John', name: '요한삼서' }, { id: 'Jude', name: '유다서' },
  { id: 'Rev', name: '요한계시록' },
];

// English ID to Korean book name
const englishToKoreanMap: Record<string, string> = {
  'Matt': '마태복음', 'Mark': '마가복음', 'Luke': '누가복음', 'John': '요한복음',
  'Acts': '사도행전', 'Rom': '로마서', '1Cor': '고린도전서', '2Cor': '고린도후서',
  'Gal': '갈라디아서', 'Eph': '에베소서', 'Phil': '빌립보서', 'Col': '골로새서',
  '1Thess': '데살로니가전서', '2Thess': '데살로니가후서', '1Tim': '디모데전서', '2Tim': '디모데후서',
  'Titus': '디도서', 'Phlm': '빌레몬서', 'Heb': '히브리서', 'Jas': '야고보서',
  '1Pet': '베드로전서', '2Pet': '베드로후서', '1John': '요한일서', '2John': '요한이서',
  '3John': '요한삼서', 'Jude': '유다서', 'Rev': '요한계시록',
};

interface BibleData {
  [key: string]: string;
}

interface Comment {
  id: string;
  user_id: string;
  verse_ref: string;
  content: string;
  created_at: string;
  is_translation: boolean;
  is_official: boolean;
  profiles: {
    display_name: string;
    tier: string;
  };
  likesCount: number;
  userHasLiked: boolean;
  replies: Reply[];
}

interface Reply {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    display_name: string;
    tier: string;
  };
}

interface OfficialNote {
  id: string;
  content: string;
  profiles: {
    display_name: string;
  };
}

function VersePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  
  const bookId = params.book as string;
  const chapterNum = parseInt(params.chapter as string);
  const verseNum = parseInt(params.verse as string);
  const commentId = searchParams.get('commentId');
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bibleText, setBibleText] = useState('');
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [officialNote, setOfficialNote] = useState<OfficialNote | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isTranslation, setIsTranslation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [replyInputs, setReplyInputs] = useState<{[key: string]: string}>({});
  const [savingReply, setSavingReply] = useState<{[key: string]: boolean}>({});
  const [highlightedId, setHighlightedId] = useState<string | null>(commentId);
  
  const commentRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  
  // Get Korean book name from English ID
  const bookName = englishToKoreanMap[bookId] || bookId;
  const verseRef = `${bookName} ${chapterNum}:${verseNum}`;
  
  // Load profile
  useEffect(() => {
    if (user) {
      getMyProfile().then(setProfile);
    }
  }, [user]);
  
  // Load Bible text
  useEffect(() => {
    const loadBible = async () => {
      try {
        const response = await fetch('/bible_krv.json');
        const data: BibleData = await response.json();
        const key = `${bookId}_${chapterNum}_${verseNum}`;
        setBibleText(data[key] || '성경 텍스트를 불러올 수 없습니다.');
      } catch (err) {
        console.error('Error loading Bible:', err);
      }
    };
    loadBible();
  }, [bookId, chapterNum, verseNum]);
  
  // Load official admin commentary
  useEffect(() => {
    const loadOfficialNote = async () => {
      try {
        const supabase = getSupabase();
        const { data: notes, error } = await supabase
          .from('study_notes')
          .select(`
            id, content,
            profiles(display_name)
          `)
          .eq('book_id', bookId)
          .eq('chapter', chapterNum)
          .eq('verse', verseNum)
          .limit(1);
        
        if (!error && notes && notes.length > 0) {
          const note = notes[0];
          setOfficialNote({
            id: note.id,
            content: note.content,
            profiles: {
              display_name: Array.isArray(note.profiles) 
                ? note.profiles[0]?.display_name || '관리자'
                : (note.profiles as any)?.display_name || '관리자'
            }
          });
        }
      } catch (err) {
        console.error('Error loading official note:', err);
      }
    };
    loadOfficialNote();
  }, [bookId, chapterNum, verseNum]);
  
  // Load comments (translations and reflections)
  useEffect(() => {
    const loadComments = async () => {
      setLoading(true);
      try {
        const supabase = getSupabase();
        
        // Get reflections (translations and meditations)
        const { data: reflections, error } = await supabase
          .from('reflections')
          .select(`
            id, user_id, verse_ref, content, created_at, is_translation, is_official,
            profiles(display_name, tier)
          `)
          .ilike('verse_ref', verseRef)
          .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        // Get likes and replies for each comment
        const commentsWithDetails = await Promise.all(
          (reflections || []).map(async (post: any) => {
            const [likesCount, userHasLiked, replies] = await Promise.all([
              getLikesCount(post.id),
              hasUserLiked(post.id),
              getReplies(post.id)
            ]);
            
            return {
              ...post,
              likesCount,
              userHasLiked,
              replies: replies || []
            };
          })
        );
        
        setComments(commentsWithDetails);
      } catch (err) {
        console.error('Error loading comments:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadComments();
  }, [verseRef, user, saving, savingReply]);
  
  // Scroll to highlighted comment
  useEffect(() => {
    if (commentId && commentRefs.current[commentId]) {
      setTimeout(() => {
        commentRefs.current[commentId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Remove highlight after 5 seconds
        setTimeout(() => setHighlightedId(null), 5000);
      }, 500);
    }
  }, [commentId, comments]);
  
  const handleSaveComment = async () => {
    if (!user || !newComment.trim()) return;
    
    setSaving(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('reflections').insert({
        user_id: user.id,
        verse_ref: verseRef,
        content: newComment.trim(),
        is_translation: isTranslation,
        category: isTranslation ? 'translation' : 'meditation'
      });
      
      if (error) throw error;
      
      setNewComment('');
      setIsTranslation(false);
    } catch (err) {
      console.error('Error saving comment:', err);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };
  
  const handleToggleLike = async (commentId: string, currentlyLiked: boolean) => {
    if (!user) {
      alert('로그인 후 공감할 수 있습니다.');
      return;
    }
    
    try {
      if (currentlyLiked) {
        await removeLike(commentId);
      } else {
        await addLike(commentId);
      }
      
      // Refresh comments to update like state
      const updatedComments = comments.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            userHasLiked: !currentlyLiked,
            likesCount: c.likesCount + (currentlyLiked ? -1 : 1)
          };
        }
        return c;
      });
      setComments(updatedComments);
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };
  
  const handleSaveReply = async (commentId: string) => {
    const replyText = replyInputs[commentId];
    if (!user || !replyText?.trim()) return;
    
    setSavingReply(prev => ({ ...prev, [commentId]: true }));
    try {
      await addReply(commentId, replyText.trim());
      setReplyInputs(prev => ({ ...prev, [commentId]: '' }));
      setExpandedReplies(prev => new Set(prev).add(commentId));
    } catch (err) {
      console.error('Error saving reply:', err);
      alert('답글 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingReply(prev => ({ ...prev, [commentId]: false }));
    }
  };
  
  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };
  
  const formatTime = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diff = now.getTime() - past.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '방금';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return past.toLocaleDateString('ko-KR');
  };
  
  const shareComment = (commentId: string) => {
    const url = `${window.location.origin}/read/${bookId}/${chapterNum}/${verseNum}?commentId=${commentId}`;
    navigator.clipboard.writeText(url);
    alert('링크가 복사되었습니다.');
  };
  
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push('/read')}
            className="flex items-center gap-2 text-stone-600 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">성경읽기</span>
          </button>
          
          <div className="flex items-center gap-2">
            {user ? (
              <span className="text-sm text-stone-600">
                {profile?.nickname || '사용자'}
              </span>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="text-sm text-amber-600 hover:text-amber-700"
              >
                로그인
              </button>
            )}
          </div>
        </div>
      </header>
      
      <main className="max-w-2xl mx-auto">
        {/* Main Bible Text Section */}
        <div className="bg-white border-b border-stone-200">
          <div className="px-6 py-8 md:py-12">
            {/* Verse Reference */}
            <div className="mb-6">
              <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-full">
                {verseRef}
              </span>
            </div>
            
            {/* Main Bible Text */}
            <h1 className="text-2xl md:text-3xl font-bold text-stone-900 leading-relaxed mb-4">
              {bibleText}
            </h1>
            
            <p className="text-sm text-stone-500">
              개역한글
            </p>
          </div>
        </div>
        
        {/* Official Admin Commentary */}
        {officialNote && (
          <div className="bg-purple-50 border-b border-purple-100">
            <div className="px-6 py-6">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">소장님의 해설</span>
              </div>
              <p className="text-stone-800 leading-relaxed whitespace-pre-wrap">
                {officialNote.content}
              </p>
            </div>
          </div>
        )}
        
        {/* Comments Section */}
        <div className="bg-stone-50 min-h-screen">
          {/* Comment Input */}
          {user && (
            <div className="bg-white border-b border-stone-200 p-4">
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setIsTranslation(false)}
                  className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                    !isTranslation 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  묵상
                </button>
                <button
                  onClick={() => setIsTranslation(true)}
                  className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                    isTranslation 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  개인 번역
                </button>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={isTranslation ? "개인 번역을 입력하세요..." : "묵상을 나누어 주세요..."}
                    className="w-full p-3 text-sm bg-stone-50 border border-stone-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-amber-200"
                    rows={3}
                  />
                </div>
                <button
                  onClick={handleSaveComment}
                  disabled={!newComment.trim() || saving}
                  className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-xl hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2 self-end"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {isTranslation ? '번역' : '묵상'}
                </button>
              </div>
            </div>
          )}
          
          {/* Comments List */}
          <div className="divide-y divide-stone-200">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageSquare className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <p className="text-stone-500 text-sm">
                  아직 나눔이 없습니다.<br />
                  첫 번째 묵상이나 번역을 남겨보세요.
                </p>
              </div>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  ref={(el) => { commentRefs.current[comment.id] = el; }}
                  className={`transition-all duration-500 ${
                    highlightedId === comment.id 
                      ? 'bg-amber-100 ring-2 ring-amber-300' 
                      : comment.is_translation 
                        ? 'bg-emerald-50/30' 
                        : 'bg-white'
                  }`}
                >
                  <div className="p-4">
                    {/* Comment Header - Simple: Name, Date, Badge */}
                    <div className="flex items-center gap-2 mb-2">
                      {comment.is_official && <Crown className="w-3.5 h-3.5 text-amber-600" />}
                      {comment.is_translation && <Sparkles className="w-3.5 h-3.5 text-emerald-600" />}
                      <span className="font-medium text-sm text-stone-800">
                        {comment.profiles?.display_name || '익명'}
                      </span>
                      <span className="text-xs text-stone-400">·</span>
                      <span className="text-xs text-stone-400">{formatTime(comment.created_at)}</span>
                      {comment.is_translation && (
                        <span className="ml-auto text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                          번역
                        </span>
                      )}
                    </div>
                    
                    {/* Comment Content */}
                    <p className="text-stone-800 text-sm leading-relaxed whitespace-pre-wrap mb-3">
                      {comment.content}
                    </p>
                    
                    {/* Comment Actions - Only Two Buttons */}
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleToggleLike(comment.id, comment.userHasLiked)}
                        className={`flex items-center gap-1 text-sm transition-colors ${
                          comment.userHasLiked 
                            ? 'text-red-600' 
                            : 'text-stone-500 hover:text-stone-700'
                        }`}
                      >
                        <span className="text-lg">🙏</span>
                        <span className="text-xs">기도합니다</span>
                        {comment.likesCount > 0 && (
                          <span className="text-xs font-medium">{comment.likesCount}</span>
                        )}
                      </button>
                      
                      <button
                        onClick={() => toggleReplies(comment.id)}
                        className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-xs">답글 달기</span>
                        {comment.replies.length > 0 && (
                          <span className="text-xs font-medium">{comment.replies.length}</span>
                        )}
                      </button>
                      
                      <button
                        onClick={() => shareComment(comment.id)}
                        className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 transition-colors ml-auto"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Replies Section */}
                  {expandedReplies.has(comment.id) && (
                    <div className="px-4 pb-4 bg-stone-100/50">
                      {/* Reply List */}
                      {comment.replies.length > 0 && (
                        <div className="space-y-3 mb-3 pl-2 border-l-2 border-stone-200">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex gap-3 p-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium text-stone-700">
                                    {reply.profiles?.display_name || '익명'}
                                  </span>
                                  <span className="text-xs text-stone-400">
                                    {new Date(reply.created_at).toLocaleDateString('ko-KR')}
                                  </span>
                                  <button 
                                    onClick={() => handleToggleLike(reply.id, reply.liked || false)}
                                    className={`text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors ${reply.liked ? 'bg-red-100 text-red-600' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                                  >
                                    🙏 기도합니다 ({reply.likes || 0})
                                  </button>
                                </div>
                                <p className="text-sm text-stone-800">{reply.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Reply Input */}
                      {user && (
                        <div className="flex gap-2 pl-2">
                          <input
                            type="text"
                            value={replyInputs[comment.id] || ''}
                            onChange={(e) => setReplyInputs(prev => ({ ...prev, [comment.id]: e.target.value }))}
                            placeholder="답글을 입력하세요..."
                            className="flex-1 px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && replyInputs[comment.id]?.trim()) {
                                handleSaveReply(comment.id);
                              }
                            }}
                          />
                          <button
                            onClick={() => handleSaveReply(comment.id)}
                            disabled={!replyInputs[comment.id]?.trim() || savingReply[comment.id]}
                            className="px-3 py-2 bg-stone-700 text-white text-sm rounded-lg hover:bg-stone-800 disabled:opacity-50"
                          >
                            {savingReply[comment.id] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VersePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    }>
      <VersePageContent />
    </Suspense>
  );
}
