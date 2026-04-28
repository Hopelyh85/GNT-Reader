'use client';

import { useEffect, useState, useRef } from 'react';
import { 
  getMyProfile, 
  getMyStudyNotes, 
  saveMyStudyNote,
  getPublicReflections,
  getBestReflections,
  addPublicReflection,
  addLike,
  removeLike,
  hasUserLiked,
  markReflectionAsBest,
  exportMyStudyNotes,
  deleteReflection,
  Profile,
  StudioReflection 
} from '@/app/lib/supabase';
import { 
  PenLine, 
  MessageCircle, 
  Heart, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Loader2,
  Send,
  Lock,
  Download,
  Share2,
  Check,
  Trash2,
  MessageSquare,
  Star,
  Mail,
  X
} from 'lucide-react';

interface StudioPanelProps {
  verseRef: string;
  book: string;
  chapter: number;
  verse: number;
}

// Star rating display based on tier
const TierStars = ({ tier }: { tier: string }) => {
  const starCount = {
    'Admin': 5,
    'Staff': 4,
    'Hardworking': 3,
    'Regular': 2,
    'General': 1
  }[tier] || 1;
  
  return (
    <span className="text-amber-500 text-xs tracking-tight">
      {'⭐'.repeat(starCount)}
    </span>
  );
};

// Category badge
const CategoryBadge = ({ category }: { category: string }) => {
  const styles: Record<string, string> = {
    'ministry': 'bg-purple-100 text-purple-700',
    'commentary': 'bg-blue-100 text-blue-700',
    'reflection': 'bg-green-100 text-green-700'
  };
  const labels: Record<string, string> = {
    'ministry': '사역',
    'commentary': '주석',
    'reflection': '묵상'
  };
  
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${styles[category] || styles.reflection}`}>
      {labels[category] || '묵상'}
    </span>
  );
};

// Format timestamp
const formatTime = (date: string) => {
  const d = new Date(date);
  const year = d.getFullYear().toString().slice(2);
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${year}.${month}.${day} ${hours}:${minutes}`;
};

// Check if user can delete
const canDelete = (profile: Profile | null, reflectionUserId: string) => {
  if (!profile) return false;
  if (profile.id === reflectionUserId) return true;
  if (['Admin', 'Staff'].includes(profile.tier)) return true;
  return false;
};

export default function StudioPanel({ verseRef, book, chapter, verse }: StudioPanelProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<'notes' | 'reflections'>('notes');
  
  // Ministry Notes state
  const [myNote, setMyNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Reflections state
  const [reflections, setReflections] = useState<StudioReflection[]>([]);
  const [bestReflections, setBestReflections] = useState<StudioReflection[]>([]);
  const [newReflection, setNewReflection] = useState('');
  const [reflectionCategory, setReflectionCategory] = useState<'ministry' | 'commentary' | 'reflection'>('reflection');
  const [submittingReflection, setSubmittingReflection] = useState(false);
  const [reflectionPage, setReflectionPage] = useState(1);
  const [reflectionCount, setReflectionCount] = useState(0);
  const [likedReflections, setLikedReflections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Share states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [verseCopied, setVerseCopied] = useState(false);

  // Refs for scrolling
  const reflectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    loadData();
  }, [verseRef]);

  // Handle deep link scroll
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reflectionId = urlParams.get('reflection');
    if (reflectionId && reflectionRefs.current[reflectionId]) {
      setTimeout(() => {
        reflectionRefs.current[reflectionId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    }
  }, [reflections]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const profileData = await getMyProfile();
      setProfile(profileData);
      
      if (profileData) {
        const notes = await getMyStudyNotes(verseRef, 1);
        if (notes.length > 0) {
          setMyNote(notes[0].content);
        }
      }
      
      const best = await getBestReflections(verseRef, 5);
      setBestReflections(best);
      
      const { data, count } = await getPublicReflections(verseRef, 1, 20);
      setReflections(data);
      setReflectionCount(count || 0);
      
      if (profileData) {
        const likedSet = new Set<string>();
        for (const r of data) {
          const hasLiked = await hasUserLiked(r.id);
          if (hasLiked) likedSet.add(r.id);
        }
        setLikedReflections(likedSet);
      }
    } catch (err) {
      console.error('Error loading studio data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!profile || !['Admin', 'Hardworking'].includes(profile.tier)) return;
    
    try {
      setSavingNote(true);
      await saveMyStudyNote(verseRef, book, chapter, verse, myNote, true);
    } catch (err) {
      console.error('Error saving note:', err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleSubmitReflection = async () => {
    if (!profile || !newReflection.trim()) return;
    
    try {
      setSubmittingReflection(true);
      await addPublicReflection(verseRef, book, chapter, verse, newReflection, true, reflectionCategory, replyTo);
      setNewReflection('');
      setReplyTo(null);
      setReplyContent('');
      
      const { data, count } = await getPublicReflections(verseRef, 1, 20);
      setReflections(data);
      setReflectionCount(count || 0);
    } catch (err) {
      console.error('Error submitting reflection:', err);
    } finally {
      setSubmittingReflection(false);
    }
  };

  const handleLike = async (reflectionId: string) => {
    if (!profile) return;
    
    try {
      const isLiked = likedReflections.has(reflectionId);
      
      if (isLiked) {
        await removeLike(reflectionId);
        setLikedReflections(prev => {
          const newSet = new Set(prev);
          newSet.delete(reflectionId);
          return newSet;
        });
      } else {
        await addLike(reflectionId);
        setLikedReflections(prev => new Set(prev).add(reflectionId));
      }
      
      const { data } = await getPublicReflections(verseRef, reflectionPage, 20);
      setReflections(data);
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleMarkBest = async (reflectionId: string, isBest: boolean) => {
    if (!profile || profile.tier !== 'Admin') return;
    
    try {
      await markReflectionAsBest(reflectionId, isBest);
      
      const best = await getBestReflections(verseRef, 5);
      setBestReflections(best);
      
      const { data, count } = await getPublicReflections(verseRef, reflectionPage, 20);
      setReflections(data);
      setReflectionCount(count || 0);
    } catch (err) {
      console.error('Error marking best:', err);
    }
  };

  const handleDelete = async (reflectionId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
      setDeletingId(reflectionId);
      await deleteReflection(reflectionId);
      
      const { data, count } = await getPublicReflections(verseRef, 1, 20);
      setReflections(data);
      setReflectionCount(count || 0);
    } catch (err) {
      console.error('Error deleting reflection:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportNotes = async () => {
    if (!profile) return;
    
    try {
      setExporting(true);
      const notes = await exportMyStudyNotes();
      
      if (notes.length === 0) {
        alert('보낼 사역 노트가 없습니다.');
        return;
      }
      
      const date = new Date().toISOString().split('T')[0];
      let mdContent = `# K-GNT 말씀 나눔 - 내 사역 노트\n\n`;
      mdContent += `**생성일:** ${date}\n`;
      mdContent += `**총 노트 수:** ${notes.length}개\n\n`;
      mdContent += `---\n\n`;
      
      notes.forEach((note, index) => {
        mdContent += `## ${index + 1}. ${note.verse_ref}\n\n`;
        mdContent += `**성경:** ${note.book} ${note.chapter}:${note.verse}\n\n`;
        mdContent += `**작성일:** ${formatTime(note.created_at)}\n\n`;
        mdContent += `### 내용\n\n${note.content}\n\n`;
        mdContent += `---\n\n`;
      });
      
      const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `K-GNT_MyNotes_${date}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting notes:', err);
      alert('노트보내기 중 오류가 발생했습니다.');
    } finally {
      setExporting(false);
    }
  };

  const handleShareReflection = (reflection: StudioReflection) => {
    const shareUrl = `${window.location.origin}/?book=${reflection.book}&chapter=${reflection.chapter}&verse=${reflection.verse}&reflection=${reflection.id}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedId(reflection.id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(err => {
      console.error('Failed to copy link:', err);
    });
  };

  const handleShareVerse = () => {
    const shareUrl = `${window.location.origin}/?book=${book}&chapter=${chapter}&verse=${verse}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      setVerseCopied(true);
      setTimeout(() => setVerseCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy link:', err);
    });
  };

  // Reflection Card Component
  const ReflectionCard = ({ r, isBest = false, depth = 0 }: { r: StudioReflection, isBest?: boolean, depth?: number }) => {
    const isLiked = likedReflections.has(r.id);
    const showDelete = canDelete(profile, r.user_id);
    const isReplying = replyTo === r.id;
    
    return (
      <div 
        ref={(el) => { reflectionRefs.current[r.id] = el; }}
        className={`min-w-0 ${depth > 0 ? 'ml-8 border-l-2 border-stone-200 pl-4' : ''}`}
      >
        <div className={`p-4 min-w-0 ${isBest ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200' : 'bg-stone-50 border border-stone-200'} rounded-lg`}>
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-stone-800 text-sm">
                {r.profiles?.nickname || r.user_id.slice(0, 8)}
              </span>
              <TierStars tier={r.profiles?.tier || 'General'} />
              <CategoryBadge category={r.category || 'reflection'} />
              {isBest && (
                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                  ✨ 베스트
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400">
                {formatTime(r.created_at)}
              </span>
              {profile?.tier === 'Admin' && (
                <button
                  onClick={() => handleMarkBest(r.id, !isBest)}
                  className="text-xs text-amber-600 hover:text-amber-700 underline"
                >
                  {isBest ? '해제' : '선정'}
                </button>
              )}
            </div>
          </div>
          
          {/* Content */}
          <p className="text-stone-700 text-sm leading-relaxed mb-3 break-all whitespace-pre-wrap w-full overflow-hidden">{r.content}</p>
          
          {/* Actions */}
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => handleLike(r.id)}
              disabled={!profile}
              className={`flex items-center gap-1 text-sm ${
                isLiked ? 'text-red-500' : 'text-stone-400 hover:text-red-500'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              {r.likes_count}
            </button>
            
            <button
              onClick={() => handleShareReflection(r)}
              className={`flex items-center gap-1 text-sm text-stone-400 hover:text-amber-600 transition-colors ${
                copiedId === r.id ? 'text-green-500' : ''
              }`}
            >
              {copiedId === r.id ? (
                <><Check className="w-4 h-4" /><span>복사됨</span></>
              ) : (
                <><Share2 className="w-4 h-4" /><span>공유</span></>
              )}
            </button>
            
            {profile && (
              <button
                onClick={() => setReplyTo(replyTo === r.id ? null : r.id)}
                className="flex items-center gap-1 text-sm text-stone-400 hover:text-blue-600"
              >
                <MessageSquare className="w-4 h-4" />
                <span>답글</span>
              </button>
            )}
            
            {/* Email contact */}
            {r.profiles?.email && (
              <a
                href={`mailto:${r.profiles.email}`}
                className="flex items-center gap-1 text-sm text-stone-400 hover:text-blue-600"
                title={`${r.profiles.email}에게 메일 보내기`}
              >
                <Mail className="w-4 h-4" />
              </a>
            )}
            
            {showDelete && (
              <button
                onClick={() => handleDelete(r.id)}
                disabled={deletingId === r.id}
                className="flex items-center gap-1 text-sm text-stone-400 hover:text-red-600 ml-auto"
              >
                {deletingId === r.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <><Trash2 className="w-4 h-4" /><span>삭제</span></>
                )}
              </button>
            )}
          </div>
          
          {/* Reply Input */}
          {isReplying && (
            <div className="mt-3 pt-3 border-t border-stone-200">
              <div className="flex gap-2 mb-2">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={`${r.profiles?.nickname || '묵상자'}님에게 답글 작성...`}
                  className="flex-1 h-20 p-2 border border-stone-200 rounded-lg resize-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setReplyTo(null)}
                  className="px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setNewReflection(replyContent);
                    handleSubmitReflection().then(() => setReplyContent(''));
                  }}
                  disabled={!replyContent.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  답글 등록
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Replies */}
        {r.replies?.map(reply => (
          <div key={reply.id} className="mt-2">
            <ReflectionCard r={reply} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden min-w-0">
      {/* Tabs */}
      <div className="flex border-b border-stone-200">
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'notes' 
              ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50/50' 
              : 'text-stone-600 hover:text-stone-800 hover:bg-stone-50'
          }`}
        >
          <PenLine className="w-4 h-4" />
          사역 노트
          {profile && (
            <span className="flex items-center gap-1 text-xs opacity-70">
              <TierStars tier={profile.tier} />
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('reflections')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'reflections' 
              ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50/50' 
              : 'text-stone-600 hover:text-stone-800 hover:bg-stone-50'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          묵상 피드
          <span className="text-xs bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-full">
            {reflectionCount}
          </span>
        </button>
      </div>

      {/* Ministry Notes Tab */}
      {activeTab === 'notes' && (
        <div className="p-4">
          {!profile ? (
            <div className="text-center py-8">
              <Lock className="w-12 h-12 mx-auto mb-3 text-stone-300" />
              <p className="text-stone-500 text-sm">
                사역 노트를 작성하려면 <a href="/login" className="text-amber-600 hover:underline">로그인</a>이 필요합니다.
              </p>
            </div>
          ) : !['Admin', 'Hardworking'].includes(profile.tier) ? (
            <div className="text-center py-8">
              <Lock className="w-12 h-12 mx-auto mb-3 text-stone-300" />
              <p className="text-stone-500 text-sm mb-2">
                현재 등급 <TierStars tier={profile.tier} />으로는 사역 노트 작성이 제한됩니다.
              </p>
              <p className="text-xs text-stone-400">
                Admin(⭐⭐⭐⭐⭐) 또는 Hardworking(⭐⭐⭐) 등급에서 작성 가능합니다.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-stone-700">
                  {verseRef} - 사역 노트
                </label>
                <button
                  onClick={handleExportNotes}
                  disabled={exporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors disabled:opacity-50"
                >
                  {exporting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  내 노트 다운로드
                </button>
              </div>
              <textarea
                value={myNote}
                onChange={(e) => setMyNote(e.target.value)}
                placeholder="이 구절에 대한 사역 노트를 작성하세요..."
                className="w-full h-40 p-3 border border-stone-200 rounded-lg resize-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-400">
                  {myNote.length} / 5000 자
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShareVerse}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    {verseCopied ? (
                      <><Check className="w-4 h-4 text-green-500" /><span className="text-green-600">복사됨</span></>
                    ) : (
                      <><Share2 className="w-4 h-4" />공유하기</>
                    )}
                  </button>
                  <button
                    onClick={handleSaveNote}
                    disabled={savingNote}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                  >
                    {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
                    저장하기
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reflections Tab */}
      {activeTab === 'reflections' && (
        <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto min-w-0">
          {/* Best Reflections */}
          {bestReflections.length > 0 && (
            <div className="mb-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-700 mb-3">
                <Sparkles className="w-4 h-4" />
                ✨ 베스트 묵상
              </h3>
              <div className="space-y-3">
                {bestReflections.map(r => (
                  <ReflectionCard key={r.id} r={r} isBest={true} />
                ))}
              </div>
            </div>
          )}

          {/* Write Reflection */}
          {profile && (
            <div className="mb-4 p-4 bg-stone-50 border border-stone-200 rounded-lg">
              <div className="flex gap-2 mb-2">
                {(['reflection', 'ministry', 'commentary'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setReflectionCategory(cat)}
                    className={`px-2 py-1 text-xs rounded ${
                      reflectionCategory === cat 
                        ? 'bg-amber-500 text-white' 
                        : 'bg-white text-stone-600 border border-stone-200'
                    }`}
                  >
                    {cat === 'reflection' ? '묵상' : cat === 'ministry' ? '사역' : '주석'}
                  </button>
                ))}
              </div>
              <textarea
                value={newReflection}
                onChange={(e) => setNewReflection(e.target.value)}
                placeholder={`${reflectionCategory === 'reflection' ? '묵상' : reflectionCategory === 'ministry' ? '사역' : '주석'}을 작성하세요...`}
                className="w-full h-24 p-3 border border-stone-200 rounded-lg resize-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
              />
              <div className="mt-2 flex justify-end">
                <button
                  onClick={handleSubmitReflection}
                  disabled={submittingReflection || !newReflection.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-stone-800 text-white text-sm rounded-lg hover:bg-stone-900 transition-colors disabled:opacity-50"
                >
                  {submittingReflection ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  등록하기
                </button>
              </div>
            </div>
          )}

          {/* All Reflections */}
          <div>
            <h3 className="text-sm font-semibold text-stone-700 mb-3">
              전체 묵상 ({reflectionCount}개)
            </h3>
            <div className="space-y-3">
              {reflections.filter(r => !r.is_best).map(r => (
                <ReflectionCard key={r.id} r={r} />
              ))}
            </div>

            {/* Pagination */}
            {reflectionCount > 20 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => setReflectionPage(p => Math.max(1, p - 1))}
                  disabled={reflectionPage === 1}
                  className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-stone-600">
                  {reflectionPage} / {Math.ceil(reflectionCount / 20)}
                </span>
                <button
                  onClick={() => setReflectionPage(p => p + 1)}
                  disabled={reflectionPage >= Math.ceil(reflectionCount / 20)}
                  className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
