'use client';

import { useEffect, useState } from 'react';
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
  Copy
} from 'lucide-react';

interface StudioPanelProps {
  verseRef: string;
  book: string;
  chapter: number;
  verse: number;
}

export default function StudioPanel({ verseRef, book, chapter, verse }: StudioPanelProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<'notes' | 'reflections'>('notes');
  
  // Ministry Notes state
  const [myNote, setMyNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  
  // Reflections state
  const [reflections, setReflections] = useState<StudioReflection[]>([]);
  const [bestReflections, setBestReflections] = useState<StudioReflection[]>([]);
  const [newReflection, setNewReflection] = useState('');
  const [submittingReflection, setSubmittingReflection] = useState(false);
  const [reflectionPage, setReflectionPage] = useState(1);
  const [reflectionCount, setReflectionCount] = useState(0);
  const [likedReflections, setLikedReflections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [verseRef]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load profile
      const profileData = await getMyProfile();
      setProfile(profileData);
      
      // Load my note for this verse
      if (profileData) {
        const notes = await getMyStudyNotes(verseRef, 1);
        if (notes.length > 0) {
          setMyNote(notes[0].content);
        }
      }
      
      // Load best reflections
      const best = await getBestReflections(verseRef, 5);
      setBestReflections(best);
      
      // Load public reflections
      const { data, count } = await getPublicReflections(verseRef, 1, 20);
      setReflections(data);
      setReflectionCount(count || 0);
      
      // Check which reflections user has liked
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
    if (!profile || profile.tier === 'General') return;
    
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
      await addPublicReflection(verseRef, book, chapter, verse, newReflection, true);
      setNewReflection('');
      
      // Refresh reflections
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
      
      // Refresh reflections to update counts
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
      
      // Refresh best reflections
      const best = await getBestReflections(verseRef, 5);
      setBestReflections(best);
      
      // Refresh public reflections
      const { data, count } = await getPublicReflections(verseRef, reflectionPage, 20);
      setReflections(data);
      setReflectionCount(count || 0);
    } catch (err) {
      console.error('Error marking best:', err);
    }
  };

  // Export study notes as Markdown
  const [exporting, setExporting] = useState(false);
  const handleExportNotes = async () => {
    if (!profile) return;
    
    try {
      setExporting(true);
      const notes = await exportMyStudyNotes();
      
      if (notes.length === 0) {
        alert('보낼 사역 노트가 없습니다.');
        return;
      }
      
      // Generate Markdown content
      const date = new Date().toISOString().split('T')[0];
      let mdContent = `# K-GNT 위키 스튜디오 - 내 사역 노트\n\n`;
      mdContent += `**생성일:** ${date}\n`;
      mdContent += `**총 노트 수:** ${notes.length}개\n\n`;
      mdContent += `---\n\n`;
      
      notes.forEach((note, index) => {
        mdContent += `## ${index + 1}. ${note.verse_ref}\n\n`;
        mdContent += `**성경:** ${note.book} ${note.chapter}:${note.verse}\n\n`;
        mdContent += `**작성일:** ${new Date(note.created_at).toLocaleDateString('ko-KR')}\n\n`;
        mdContent += `### 내용\n\n${note.content}\n\n`;
        mdContent += `---\n\n`;
      });
      
      // Create and download file
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

  // Share reflection link
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleShareReflection = (reflection: StudioReflection) => {
    // Generate shareable URL with reflection context
    const shareUrl = `${window.location.origin}/?book=${reflection.book}&chapter=${reflection.chapter}&verse=${reflection.verse}&reflection=${reflection.id}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedId(reflection.id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(err => {
      console.error('Failed to copy link:', err);
    });
  };

  // Share verse link
  const [verseCopied, setVerseCopied] = useState(false);
  const handleShareVerse = () => {
    const shareUrl = `${window.location.origin}/?book=${book}&chapter=${chapter}&verse=${verse}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      setVerseCopied(true);
      setTimeout(() => setVerseCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy link:', err);
    });
  };

  const canWriteNotes = profile && ['Admin', 'Hardworking'].includes(profile.tier);
  const isAdmin = profile?.tier === 'Admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
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
          {profile && <span className="text-xs opacity-70">({profile.tier})</span>}
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
          ) : !canWriteNotes ? (
            <div className="text-center py-8">
              <Lock className="w-12 h-12 mx-auto mb-3 text-stone-300" />
              <p className="text-stone-500 text-sm mb-2">
                현재 등급 <span className="font-medium text-stone-700">{profile.tier}</span>으로는 
                사역 노트 작성이 제한됩니다.
              </p>
              <p className="text-xs text-stone-400">
                Admin 또는 Hardworking 등급에서 작성 가능합니다.
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
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-green-600">복사됨</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        공유하기
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleSaveNote}
                    disabled={savingNote}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                  >
                    {savingNote ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <PenLine className="w-4 h-4" />
                    )}
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
        <div className="p-4 space-y-4">
          {/* Best Reflections Section */}
          {bestReflections.length > 0 && (
            <div className="mb-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-700 mb-3">
                <Sparkles className="w-4 h-4" />
                ✨ 베스트 묵상
              </h3>
              <div className="space-y-3">
                {bestReflections.map((r) => (
                  <div key={r.id} className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-stone-800 text-sm">
                          {r.profiles?.nickname || '묵상자'}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          r.profiles?.tier === 'Admin' ? 'bg-purple-100 text-purple-700' :
                          r.profiles?.tier === 'Hardworking' ? 'bg-blue-100 text-blue-700' :
                          r.profiles?.tier === 'Regular' ? 'bg-green-100 text-green-700' :
                          'bg-stone-100 text-stone-600'
                        }`}>
                          {r.profiles?.tier}
                        </span>
                        {isAdmin && (
                          <button
                            onClick={() => handleMarkBest(r.id, false)}
                            className="text-xs text-amber-600 hover:text-amber-700 underline"
                          >
                            베스트 해제
                          </button>
                        )}
                      </div>
                      <span className="text-xs text-stone-400">
                        {new Date(r.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                    <p className="text-stone-700 text-sm leading-relaxed">{r.content}</p>
                    <div className="mt-3 flex items-center gap-4">
                      <button
                        onClick={() => handleLike(r.id)}
                        disabled={!profile}
                        className={`flex items-center gap-1 text-sm ${
                          likedReflections.has(r.id) 
                            ? 'text-red-500' 
                            : 'text-stone-400 hover:text-red-500'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${likedReflections.has(r.id) ? 'fill-current' : ''}`} />
                        {r.likes_count}
                      </button>
                      <button
                        onClick={() => handleShareReflection(r)}
                        className={`flex items-center gap-1 text-sm text-stone-400 hover:text-amber-600 transition-colors ${
                          copiedId === r.id ? 'text-green-500' : ''
                        }`}
                      >
                        {copiedId === r.id ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>복사됨</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-4 h-4" />
                            <span>공유하기</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Write Reflection */}
          {profile && (
            <div className="mb-4">
              <textarea
                value={newReflection}
                onChange={(e) => setNewReflection(e.target.value)}
                placeholder="이 구절에 대한 묵상을 공유하세요..."
                className="w-full h-24 p-3 border border-stone-200 rounded-lg resize-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
              />
              <div className="mt-2 flex justify-end">
                <button
                  onClick={handleSubmitReflection}
                  disabled={submittingReflection || !newReflection.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-stone-800 text-white text-sm rounded-lg hover:bg-stone-900 transition-colors disabled:opacity-50"
                >
                  {submittingReflection ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  묵상 등록
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
              {reflections.filter(r => !r.is_best).map((r) => (
                <div key={r.id} className="p-4 bg-stone-50 border border-stone-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-stone-800 text-sm">
                        {r.profiles?.nickname || '묵상자'}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        r.profiles?.tier === 'Admin' ? 'bg-purple-100 text-purple-700' :
                        r.profiles?.tier === 'Hardworking' ? 'bg-blue-100 text-blue-700' :
                        r.profiles?.tier === 'Regular' ? 'bg-green-100 text-green-700' :
                        'bg-stone-100 text-stone-600'
                      }`}>
                        {r.profiles?.tier}
                      </span>
                      {isAdmin && !r.is_best && (
                        <button
                          onClick={() => handleMarkBest(r.id, true)}
                          className="text-xs text-amber-600 hover:text-amber-700 underline"
                        >
                          베스트 선정
                        </button>
                      )}
                    </div>
                    <span className="text-xs text-stone-400">
                      {new Date(r.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <p className="text-stone-700 text-sm leading-relaxed">{r.content}</p>
                  <div className="mt-3 flex items-center gap-4">
                    <button
                      onClick={() => handleLike(r.id)}
                      disabled={!profile}
                      className={`flex items-center gap-1 text-sm ${
                        likedReflections.has(r.id) 
                          ? 'text-red-500' 
                          : 'text-stone-400 hover:text-red-500'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${likedReflections.has(r.id) ? 'fill-current' : ''}`} />
                      {r.likes_count}
                    </button>
                    <button
                      onClick={() => handleShareReflection(r)}
                      className={`flex items-center gap-1 text-sm text-stone-400 hover:text-amber-600 transition-colors ${
                        copiedId === r.id ? 'text-green-500' : ''
                      }`}
                    >
                      {copiedId === r.id ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>복사됨</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4" />
                          <span>공유하기</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
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
