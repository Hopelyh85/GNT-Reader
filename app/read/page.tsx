'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  BookOpen, LogOut, LogIn, Menu, X, ArrowLeft, ChevronDown, ChevronRight,
  Loader2, Heart, Link2, FileText
} from 'lucide-react';
import { useAuth } from '@/app/components/AuthProvider';
import { 
  bookNameMap, bookNameMapReverse, getSupabase, getMyProfile, signOut,
  getPublicReflections, getVerseContent, addLike, removeLike, hasUserLiked, getLikesCount
} from '@/app/lib/supabase';

// Book code mapping: JSON key prefix (e.g., "MAT_1_1") -> book ID (e.g., "Matt")
const bookCodeMap: Record<string, string> = {
  'MAT': 'Matt', 'MRK': 'Mark', 'LUK': 'Luke', 'JHN': 'John', 'ACT': 'Acts',
  'ROM': 'Rom', 'CO1': '1Cor', 'CO2': '2Cor', 'GAL': 'Gal', 'EPH': 'Eph',
  'PHP': 'Phil', 'COL': 'Col', 'TH1': '1Thess', 'TH2': '2Thess', 'TI1': '1Tim',
  'TI2': '2Tim', 'TIT': 'Titus', 'PHM': 'Phlm', 'HEB': 'Heb', 'JAS': 'Jas',
  'PE1': '1Pet', 'PE2': '2Pet', 'JN1': '1John', 'JN2': '2John', 'JN3': '3John',
  'JUD': 'Jude', 'REV': 'Rev',
};

// Reverse mapping: book ID -> JSON key prefix
const bookIdToCode: Record<string, string> = Object.fromEntries(
  Object.entries(bookCodeMap).map(([code, id]) => [id, code])
);

// Book list
const books = [
  { id: 'Matt', name: '마태복음', chapters: 28 },
  { id: 'Mark', name: '마가복음', chapters: 16 },
  { id: 'Luke', name: '누가복음', chapters: 24 },
  { id: 'John', name: '요한복음', chapters: 21 },
  { id: 'Acts', name: '사도행전', chapters: 28 },
  { id: 'Rom', name: '로마서', chapters: 16 },
  { id: '1Cor', name: '고린도전서', chapters: 16 },
  { id: '2Cor', name: '고린도후서', chapters: 13 },
  { id: 'Gal', name: '갈라디아서', chapters: 6 },
  { id: 'Eph', name: '에베소서', chapters: 6 },
  { id: 'Phil', name: '빌립보서', chapters: 4 },
  { id: 'Col', name: '골로새서', chapters: 4 },
  { id: '1Thess', name: '데살로니가전서', chapters: 5 },
  { id: '2Thess', name: '데살로니가후서', chapters: 3 },
  { id: '1Tim', name: '디모데전서', chapters: 6 },
  { id: '2Tim', name: '디모데후서', chapters: 4 },
  { id: 'Titus', name: '디도서', chapters: 3 },
  { id: 'Phlm', name: '빌레몬서', chapters: 1 },
  { id: 'Heb', name: '히브리서', chapters: 13 },
  { id: 'Jas', name: '야고보서', chapters: 5 },
  { id: '1Pet', name: '베드로전서', chapters: 5 },
  { id: '2Pet', name: '베드로후서', chapters: 3 },
  { id: '1John', name: '요한일서', chapters: 5 },
  { id: '2John', name: '요한이서', chapters: 1 },
  { id: '3John', name: '요한삼서', chapters: 1 },
  { id: 'Jude', name: '유다서', chapters: 1 },
  { id: 'Rev', name: '요한계시록', chapters: 22 },
];

// Raw Bible data: flat key-value pairs like "MAT_1_1": "text"
type RawBibleData = Record<string, string>;

function ReadContent() {
  const router = useRouter();
  console.log('[DEBUG] ReadContent component mounted');
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  
  // State
  const [selectedBook, setSelectedBook] = useState('Matt');
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [rawBibleData, setRawBibleData] = useState<RawBibleData>({});
  const [loadingBible, setLoadingBible] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Community content
  const [translations, setTranslations] = useState<any[]>([]);
  const [reflections, setReflections] = useState<any[]>([]);
  const [studyNotes, setStudyNotes] = useState<any[]>([]);
  const [verseComments, setVerseComments] = useState<Record<number, any[]>>({});
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  
  // User role for permission-based labeling
  const [userRole, setUserRole] = useState<string>('');
  
  // Accordion state for expanded verses
  const [expandedVerses, setExpandedVerses] = useState<Set<number>>(new Set());
  
  // Reply inputs state for each verse
  const [replyInputs, setReplyInputs] = useState<Record<number, string>>({});
  const [submittingReply, setSubmittingReply] = useState<Record<number, boolean>>({});
  
  // Derived data - filter raw Bible data directly
  const bookInfo = books.find(b => b.id === selectedBook);
  const bookCode = bookIdToCode[selectedBook]; // e.g., 'Matt' -> 'MAT'
  const chapterKey = `${bookCode}_${selectedChapter}_`; // e.g., 'MAT_1_'
  
  // Filter verses for current book and chapter, then parse verse numbers
  const verses = bookCode 
    ? Object.entries(rawBibleData)
        .filter(([key]) => key.startsWith(chapterKey))
        .map(([key, text]) => {
          const verseMatch = key.match(/_(\d+)$/);
          const verseNum = verseMatch ? parseInt(verseMatch[1], 10) : 0;
          return { verse: verseNum, text };
        })
        .sort((a, b) => a.verse - b.verse)
    : [];
  
  console.log('[DEBUG] Rendering verses count:', verses.length);
  console.log('[DEBUG] selectedBook:', selectedBook, 'bookCode:', bookCode, 'chapter:', selectedChapter);
  
  // Check auth and get user role
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      
      // Get user profile for role/tier
      if (user) {
        try {
          const profile = await getMyProfile();
          setUserRole(profile?.tier || '');
        } catch (err) {
          console.error('Error loading profile:', err);
        }
      }
    };
    checkAuth();
  }, [user]);
  
  // Load KRV Bible data - store raw flat data directly
  useEffect(() => {
    const loadKRV = async () => {
      try {
        console.log('[DEBUG] Loading KRV Bible data from /data/krv_bible.json...');
        const response = await fetch('/data/krv_bible.json');
        const rawData = await response.json();
        console.log('[DEBUG] Raw data loaded, total keys:', Object.keys(rawData).length);
        console.log('[DEBUG] Sample keys:', Object.keys(rawData).slice(0, 5));
        console.log('[DEBUG] Sample value:', Object.values(rawData)[0]);
        setRawBibleData(rawData);
      } catch (err) {
        console.error('[DEBUG] Error loading KRV:', err);
      } finally {
        setLoadingBible(false);
      }
    };
    loadKRV();
  }, []);
  
  // Debug verses data
  useEffect(() => {
    console.log('[DEBUG] ==== VERSE DEBUG ====');
    console.log('[DEBUG] selectedBook:', selectedBook, 'chapter:', selectedChapter);
    console.log('[DEBUG] bookCode:', bookCode);
    console.log('[DEBUG] chapterKey:', chapterKey);
    console.log('[DEBUG] rawBibleData keys count:', Object.keys(rawBibleData).length);
    console.log('[DEBUG] verses count:', verses.length);
    if (verses.length > 0) {
      console.log('[DEBUG] First verse:', verses[0]);
    }
    console.log('[DEBUG] ====================');
  }, [selectedBook, selectedChapter, rawBibleData, verses, bookCode, chapterKey]);
  
  // Load community content (translations, reflections, study notes)
  useEffect(() => {
    const loadCommunity = async () => {
      if (!bookInfo) return;
      setLoadingCommunity(true);
      try {
        const koreanBookName = bookInfo.name;
        const verseRefPrefix = `${koreanBookName} ${selectedChapter}`;
        
        // Load public reflections (translations and regular reflections)
        const reflectionsResult = await getPublicReflections(undefined, 1, 100);
        const reflectionsData = reflectionsResult.data || [];
        
        // Filter for current chapter
        const chapterReflections = reflectionsData.filter((r: any) => 
          r.verse_ref?.startsWith(verseRefPrefix) || 
          (r.book === koreanBookName && r.chapter === selectedChapter)
        );
        
        // Separate translations and reflections
        const trans = chapterReflections.filter((r: any) => r.category === 'translation');
        const refls = chapterReflections.filter((r: any) => r.category !== 'translation' && r.category !== 'prayer_general' && r.category !== 'prayer_world');
        
        setTranslations(trans);
        setReflections(refls);
        
        // Load likes status for each item
        for (const item of [...trans, ...refls]) {
          const count = await getLikesCount(item.id);
          const liked = user ? await hasUserLiked(item.id) : false;
          (item as any).likes = count;
          (item as any).liked = liked;
        }
        
        // Refresh state to show likes
        setTranslations([...trans]);
        setReflections([...refls]);
        
      } catch (err) {
        console.error('Error loading community:', err);
      } finally {
        setLoadingCommunity(false);
      }
    };
    loadCommunity();
  }, [selectedBook, selectedChapter, bookInfo, user]);
  
  // Handle like toggle
  const handleToggleLike = async (id: string, currentlyLiked: boolean) => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    try {
      if (currentlyLiked) {
        await removeLike(id);
      } else {
        await addLike(id);
      }
      // Update local state
      const updateItem = (items: any[]) => {
        const item = items.find(i => i.id === id);
        if (item) {
          item.liked = !currentlyLiked;
          item.likes = (item.likes || 0) + (currentlyLiked ? -1 : 1);
        }
      };
      updateItem(translations);
      updateItem(reflections);
      setTranslations([...translations]);
      setReflections([...reflections]);
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  // Check if user can write 'translation' (사역) label - requires elevated permissions
  const canWriteTranslation = (tier?: string): boolean => {
    if (!tier) return false;
    const allowedTiers = ['열심회원', '스태프', '관리자', 'Admin', '⭐⭐⭐⭐⭐'];
    return allowedTiers.includes(tier) || tier.includes('⭐');
  };

  // Add reply to a verse
  const addReply = async (verseNum: number) => {
    const content = replyInputs[verseNum]?.trim();
    if (!content) return;
    if (!user) {
      alert('로그인 후 이용해주세요.');
      return;
    }

    setSubmittingReply(prev => ({ ...prev, [verseNum]: true }));
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('comments').insert({
        post_id: null,
        user_id: user.id,
        content: content,
        book: selectedBook,
        chapter: selectedChapter,
        verse: verseNum,
        is_deleted: false
      });

      if (error) throw error;

      // Clear input and refresh comments
      setReplyInputs(prev => ({ ...prev, [verseNum]: '' }));
      await loadVerseComments(verseNum);
    } catch (err) {
      console.error('Error adding reply:', err);
      alert('댓글 등록에 실패했습니다.');
    } finally {
      setSubmittingReply(prev => ({ ...prev, [verseNum]: false }));
    }
  };

  // Load comments for a specific verse
  const loadVerseComments = async (verseNum: number) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('comments')
        .select('id, content, created_at, user_id, verse, profiles!inner(id, nickname, tier)')
        .eq('book', selectedBook)
        .eq('chapter', selectedChapter)
        .eq('verse', verseNum)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      setVerseComments(prev => ({ ...prev, [verseNum]: data || [] }));
    } catch (err) {
      console.error('Error loading verse comments:', err);
    }
  };

  // Format timestamp with time
  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString('ko-KR', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Toggle verse accordion
  const toggleVerseAccordion = (verseNum: number) => {
    setExpandedVerses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(verseNum)) {
        newSet.delete(verseNum);
      } else {
        newSet.add(verseNum);
        // Load comments when expanding
        loadVerseComments(verseNum);
      }
      return newSet;
    });
  };

  // Copy verse link to clipboard
  const copyVerseLink = async (verseNum: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/read/${selectedBook}/${selectedChapter}/${verseNum}`;
    try {
      await navigator.clipboard.writeText(url);
      alert('링크가 복사되었습니다!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  // Handle logout
  const handleLogout = async () => {
    await signOut();
    setIsLoggedIn(false);
    router.push('/');
  };
  
  // Navigate to verse detail page
  const navigateToVerse = (verseNum: number) => {
    router.push(`/read/${selectedBook}/${selectedChapter}/${verseNum}`);
  };
  
  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <a href="/" className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-stone-600" />
          </a>
          <div>
            <h1 className="text-lg font-serif font-bold text-stone-800">
              카시키아쿰 말씀 나눔터(한글)
            </h1>
            <p className="text-xs text-stone-500">{bookInfo?.name || ''} 성경을 읽고 묵상을 나눕니다</p>
          </div>
        </div>
        
        {/* Book/Chapter Selector */}
        <div className="hidden sm:flex items-center gap-2">
          <select
            value={selectedBook}
            onChange={(e) => {
              setSelectedBook(e.target.value);
              setSelectedChapter(1);
            }}
            className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg bg-white"
          >
            {books.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select
            value={selectedChapter}
            onChange={(e) => setSelectedChapter(parseInt(e.target.value))}
            className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg bg-white w-20"
          >
            {Array.from({ length: bookInfo?.chapters || 28 }, (_, i) => i + 1).map(ch => (
              <option key={ch} value={ch}>{ch}장</option>
            ))}
          </select>
        </div>
        
        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="sm:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-lg"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        
        {/* Desktop Auth */}
        <div className="hidden sm:flex items-center gap-2">
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-sm text-stone-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>로그아웃</span>
            </button>
          ) : (
            <a
              href="/login"
              className="flex items-center gap-2 px-4 py-1.5 bg-stone-800 text-white rounded-lg text-sm hover:bg-stone-700 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              로그인
            </a>
          )}
        </div>
      </header>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white border-b border-stone-200 px-4 py-3 space-y-3">
          <div className="flex gap-2">
            <select
              value={selectedBook}
              onChange={(e) => {
                setSelectedBook(e.target.value);
                setSelectedChapter(1);
              }}
              className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-lg"
            >
              {books.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(parseInt(e.target.value))}
              className="w-24 px-3 py-2 text-sm border border-stone-200 rounded-lg"
            >
              {Array.from({ length: bookInfo?.chapters || 28 }, (_, i) => i + 1).map(ch => (
                <option key={ch} value={ch}>{ch}장</option>
              ))}
            </select>
          </div>
          
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 p-2 text-stone-600 hover:bg-stone-100 rounded-lg"
            >
              <LogOut className="w-5 h-5" />
              로그아웃
            </button>
          ) : (
            <a
              href="/login"
              className="flex items-center gap-2 p-2 text-stone-600 hover:bg-stone-100 rounded-lg"
            >
              <LogIn className="w-5 h-5" />
              로그인
            </a>
          )}
        </div>
      )}
      
      {/* Main Content - Single Column Layout */}
      <main className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Bible Text */}
          <div>
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {/* Chapter Header */}
              <div className="px-4 py-3 bg-stone-50 border-b border-stone-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-serif font-bold text-stone-800">
                    {bookInfo?.name} {selectedChapter}장
                  </h2>
                  <span className="text-xs text-stone-400">
                    💡 절을 클릭하여 상세 보기
                  </span>
                </div>
              </div>
              
              {/* Mobile Hint */}
              <div className="sm:hidden px-4 py-2 bg-amber-50/50 border-b border-amber-100">
                <p className="text-xs text-amber-700">
                  👆 본문의 절을 클릭하면 묵상과 나눔을 볼 수 있습니다
                </p>
              </div>
              
              {/* Verses */}
              <div className="p-4 space-y-1">
                {loadingBible ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
                  </div>
                ) : verses.length === 0 ? (
                  <div className="text-center py-12">
                    {loadingBible ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
                        <span className="ml-2 text-stone-500">성경 데이터 로딩 중...</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-stone-500 font-medium">본문을 불러올 수 없습니다.</p>
                        <p className="text-xs text-stone-400">
                          책: {selectedBook}, 장: {selectedChapter}
                        </p>
                        <p className="text-xs text-stone-400">
                          데이터 상태: {Object.keys(rawBibleData).length > 0 ? '로드됨' : '미로드'}
                        </p>
                        {Object.keys(rawBibleData).length > 0 && (
                          <p className="text-xs text-stone-400">
                            원본 키 샘플: {Object.keys(rawBibleData).slice(0, 3).join(', ')}...
                          </p>
                        )}
                        <button
                          onClick={() => window.location.reload()}
                          className="mt-3 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm hover:bg-amber-200"
                        >
                          새로고침
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  (console.log('[DEBUG] RENDERING VERSES:', verses.length, 'verses'), verses.map((v) => {
                    const isExpanded = expandedVerses.has(v.verse);
                    // Get comments for this verse from posts table (translations/reflections)
                    const verseCommentsFromPosts = [...translations, ...reflections].filter(
                      (item: any) => item.verse === v.verse
                    ).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                    
                    return (
                      <div key={v.verse} className="border-b border-stone-100 last:border-b-0">
                        {/* Verse Row with Right-side Buttons */}
                        <div 
                          onClick={() => toggleVerseAccordion(v.verse)}
                          className="group flex gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-stone-50 hover:shadow-sm border border-transparent hover:border-stone-200"
                        >
                          <span className="text-sm font-bold min-w-[2rem] text-amber-600 group-hover:text-amber-700">
                            {v.verse}
                          </span>
                          <p className="text-lg text-stone-800 leading-relaxed flex-1">
                            <span className="font-bold text-amber-700 mr-2">{v.verse}</span>
                            {v.text}
                          </p>
                          
                          {/* Right-side Action Buttons */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Copy Link Button */}
                            <button
                              onClick={(e) => copyVerseLink(v.verse, e)}
                              className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="링크 복사"
                            >
                              <Link2 className="w-4 h-4" />
                            </button>
                            {/* Navigate to Page Button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); navigateToVerse(v.verse); }}
                              className="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="페이지로 이동"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          </div>
                          
                          {/* Expand Indicator */}
                          <span className={`text-xs text-stone-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            ▼
                          </span>
                        </div>
                        
                        {/* Accordion Content - Comments for this verse */}
                        {isExpanded && (
                          <div className="px-3 pb-3 pl-12">
                            <div className="space-y-2 border-l-2 border-stone-200 pl-3">
                              {/* Comments from comments table */}
                              {(verseComments[v.verse] || []).map((item: any) => (
                                <div 
                                  key={item.id}
                                  className="py-2 border-b border-stone-100 last:border-b-0"
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                      댓글
                                    </span>
                                    <span className="text-[11px] font-medium text-stone-700">
                                      {Array.isArray(item.profiles) ? item.profiles[0]?.nickname : item.profiles?.nickname || '성도'}
                                    </span>
                                    <span className="text-[10px] text-stone-400">
                                      {formatDateTime(item.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-stone-800 leading-relaxed">{item.content}</p>
                                </div>
                              ))}
                              
                              {/* Comments from translations/reflections (posts table) */}
                              {verseCommentsFromPosts.map((item: any) => (
                                <div 
                                  key={item.id}
                                  className="py-2 border-b border-stone-100 last:border-b-0"
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                      item.category === 'translation' && canWriteTranslation(item.profiles?.tier)
                                        ? 'bg-emerald-100 text-emerald-700' 
                                        : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      {item.category === 'translation' && canWriteTranslation(item.profiles?.tier) 
                                        ? '개인 번역(사역)' 
                                        : '묵상'}
                                    </span>
                                    <span className="text-[11px] font-medium text-stone-700">
                                      {item.profiles?.nickname || '성도'}
                                    </span>
                                    <span className="text-[10px] text-stone-400">
                                      {formatDateTime(item.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-stone-800 leading-relaxed">{item.content}</p>
                                  <div className="mt-1 flex items-center gap-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleToggleLike(item.id, item.liked || false); }}
                                      className={`text-[11px] flex items-center gap-0.5 transition-colors ${item.liked ? 'text-red-600' : 'text-stone-400 hover:text-stone-600'}`}
                                    >
                                      <Heart className="w-3 h-3" fill={item.liked ? 'currentColor' : 'none'} />
                                      {item.likes || 0}
                                    </button>
                                  </div>
                                </div>
                              ))}
                              
                              {/* Empty State */}
                              {verseCommentsFromPosts.length === 0 && (verseComments[v.verse] || []).length === 0 && (
                                <div className="py-2">
                                  <p className="text-xs text-stone-400">이 구절에 등록된 나눔이 없습니다.</p>
                                </div>
                              )}
                              
                              {/* Reply Input Form - Only for logged in users */}
                              {user && (
                                <div className="pt-2 border-t border-stone-100">
                                  <div className="flex gap-2">
                                    <textarea
                                      value={replyInputs[v.verse] || ''}
                                      onChange={(e) => setReplyInputs(prev => ({ ...prev, [v.verse]: e.target.value }))}
                                      placeholder="이 구절에 대한 댓글을 작성하세요..."
                                      className="flex-1 min-h-[60px] p-2 text-sm border border-stone-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                  <div className="flex justify-end mt-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addReply(v.verse);
                                      }}
                                      disabled={!replyInputs[v.verse]?.trim() || submittingReply[v.verse]}
                                      className="px-4 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                      {submittingReply[v.verse] ? '등록 중...' : '댓글 등록'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }))
                )}
              </div>
              
              {/* Chapter Navigation */}
              <div className="px-4 py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
                <button
                  onClick={() => selectedChapter > 1 && setSelectedChapter(selectedChapter - 1)}
                  disabled={selectedChapter <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-200 rounded-lg disabled:opacity-50"
                >
                  <ChevronDown className="w-4 h-4 rotate-90" />
                  이전 장
                </button>
                <span className="text-sm text-stone-500">
                  {selectedChapter} / {bookInfo?.chapters}장
                </span>
                <button
                  onClick={() => selectedChapter < (bookInfo?.chapters || 28) && setSelectedChapter(selectedChapter + 1)}
                  disabled={selectedChapter >= (bookInfo?.chapters || 28)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-200 rounded-lg disabled:opacity-50"
                >
                  다음 장
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Right: Community Feed - Single Column */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <h3 className="font-bold text-stone-800 mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                {bookInfo?.name} {selectedChapter}장 나눔
              </h3>
              
              {loadingCommunity ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Study Notes (Official Commentary) */}
                  {studyNotes.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wide">👑 공식 주석</h4>
                      {studyNotes.map((note: any) => (
                        <div
                          key={note.id}
                          onClick={() => navigateToVerse(note.verse || 1)}
                          className="p-3 rounded-lg bg-purple-50 border border-purple-100 cursor-pointer hover:bg-purple-100 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-purple-700">{note.verse}절</span>
                            <span className="text-xs text-stone-500">{note.profiles?.nickname || '관리자'}</span>
                          </div>
                          <p className="text-sm text-stone-800">{note.content}</p>
                          <div className="mt-2 flex items-center justify-end">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleLike(note.id, note.liked || false); }}
                              className={`text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors ${note.liked ? 'bg-red-100 text-red-600' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                            >
                              🙏 기도합니다 ({note.likes || 0})
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Inline Comments - Translations & Reflections merged as comments */}
                  {[...translations, ...reflections].sort((a: any, b: any) => (a.verse || 0) - (b.verse || 0)).length > 0 && (
                    <div className="space-y-0 border-t border-stone-200">
                      {[...translations, ...reflections].sort((a: any, b: any) => (a.verse || 0) - (b.verse || 0)).map((item: any, i: number, arr: any[]) => (
                        <div
                          key={item.id || i}
                          onClick={() => navigateToVerse(item.verse || 1)}
                          className="py-3 border-b border-stone-100 last:border-b-0 cursor-pointer hover:bg-stone-50 transition-colors"
                        >
                          {/* Comment Header - Small, inline style */}
                          <div className="flex items-center gap-2 mb-1.5">
                            {/* Label based on category and permission */}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              item.category === 'translation' && canWriteTranslation(item.profiles?.tier)
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {item.category === 'translation' && canWriteTranslation(item.profiles?.tier) 
                                ? '개인 번역(사역)' 
                                : '묵상'}
                            </span>
                            <span className="text-[11px] font-medium text-stone-700">
                              {item.profiles?.nickname || '성도'}
                            </span>
                            <span className="text-[10px] text-stone-400">
                              {formatDateTime(item.created_at)}
                            </span>
                          </div>
                          
                          {/* Comment Content */}
                          <p className="text-sm text-stone-800 leading-relaxed pl-0.5">{item.content}</p>
                          
                          {/* Comment Footer - Like button */}
                          <div className="mt-1.5 flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleLike(item.id, item.liked || false); }}
                              className={`text-[11px] flex items-center gap-0.5 transition-colors ${item.liked ? 'text-red-600' : 'text-stone-400 hover:text-stone-600'}`}
                            >
                              <Heart className="w-3 h-3" fill={item.liked ? 'currentColor' : 'none'} />
                              {item.likes || 0}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Empty State */}
                  {studyNotes.length === 0 && translations.length === 0 && reflections.length === 0 && !loadingCommunity && (
                    <div className="text-center py-8 text-stone-400">
                      <p className="text-sm">이 장에 등록된 나눔이 없습니다.</p>
                      <p className="text-xs mt-1">절을 클릭하여 첫 번째 묵상을 남겨보세요!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ReadPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-[#faf9f7]">
      <div className="flex items-center gap-3">
        <BookOpen className="w-6 h-6 text-stone-400" />
        <span className="text-stone-500">성경을 불러오는 중...</span>
      </div>
    </div>}>
      <ReadContent />
    </Suspense>
  );
}
