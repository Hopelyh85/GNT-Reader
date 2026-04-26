'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  BookOpen, LogOut, LogIn, Menu, X, ArrowLeft, ChevronDown, ChevronRight,
  MessageSquare, Send, Loader2, Heart, Crown, Pin
} from 'lucide-react';
import { useAuth } from '@/app/components/AuthProvider';
import { 
  getMyProfile, signOut, Profile, getNotice, 
  getSupabase, bookNameMap, bookNameMapReverse 
} from '@/app/lib/supabase';

// Books array with chapter counts
const books = [
  { id: 'Matt', abbrev: 'MAT', name: '마태복음', chapters: 28 },
  { id: 'Mark', abbrev: 'MRK', name: '마가복음', chapters: 16 },
  { id: 'Luke', abbrev: 'LUK', name: '누가복음', chapters: 24 },
  { id: 'John', abbrev: 'JHN', name: '요한복음', chapters: 21 },
  { id: 'Acts', abbrev: 'ACT', name: '사도행전', chapters: 28 },
  { id: 'Rom', abbrev: 'ROM', name: '로마서', chapters: 16 },
  { id: '1Cor', abbrev: '1CO', name: '고린도전서', chapters: 16 },
  { id: '2Cor', abbrev: '2CO', name: '고린도후서', chapters: 13 },
  { id: 'Gal', abbrev: 'GAL', name: '갈라디아서', chapters: 6 },
  { id: 'Eph', abbrev: 'EPH', name: '에베소서', chapters: 6 },
  { id: 'Phil', abbrev: 'PHP', name: '빌립보서', chapters: 4 },
  { id: 'Col', abbrev: 'COL', name: '골로새서', chapters: 4 },
  { id: '1Thess', abbrev: '1TH', name: '데살로니가전서', chapters: 5 },
  { id: '2Thess', abbrev: '2TH', name: '데살로니가후서', chapters: 3 },
  { id: '1Tim', abbrev: '1TI', name: '디모데전서', chapters: 6 },
  { id: '2Tim', abbrev: '2TI', name: '디모데후서', chapters: 4 },
  { id: 'Titus', abbrev: 'TIT', name: '디도서', chapters: 3 },
  { id: 'Phlm', abbrev: 'PHM', name: '빌레몬서', chapters: 1 },
  { id: 'Heb', abbrev: 'HEB', name: '히브리서', chapters: 13 },
  { id: 'Jas', abbrev: 'JAS', name: '야고보서', chapters: 5 },
  { id: '1Pet', abbrev: '1PE', name: '베드로전서', chapters: 5 },
  { id: '2Pet', abbrev: '2PE', name: '베드로후서', chapters: 3 },
  { id: '1John', abbrev: '1JN', name: '요한일서', chapters: 5 },
  { id: '2John', abbrev: '2JN', name: '요한이서', chapters: 1 },
  { id: '3John', abbrev: '3JN', name: '요한삼서', chapters: 1 },
  { id: 'Jude', abbrev: 'JUD', name: '유다서', chapters: 1 },
  { id: 'Rev', abbrev: 'REV', name: '요한계시록', chapters: 22 },
];

// KRV Bible data type
interface KRVBibleData {
  [key: string]: string;
}

// Book name mapping from Korean to English ID
const koreanToEnglishMap: Record<string, string> = {
  '마태복음': 'Matt', '마가복음': 'Mark', '누가복음': 'Luke', '요한복음': 'John',
  '사도행전': 'Acts', '로마서': 'Rom', '고린도전서': '1Cor', '고린도후서': '2Cor',
  '갈라디아서': 'Gal', '에베소서': 'Eph', '빌립보서': 'Phil', '골로새서': 'Col',
  '데살로니가전서': '1Thess', '데살로니가후서': '2Thess', '디모데전서': '1Tim', '디모데후서': '2Tim',
  '디도서': 'Titus', '빌레몬서': 'Phlm', '히브리서': 'Heb', '야고보서': 'Jas',
  '베드로전서': '1Pet', '베드로후서': '2Pet', '요한일서': '1John', '요한이서': '2John',
  '요한삼서': '3John', '유다서': 'Jude', '요한계시록': 'Rev',
};

function ReadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notice, setNotice] = useState<{ id: number; content: string; updated_at: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Deep link post ID
  const postId = searchParams.get('post');
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(postId);
  
  // Bible reading state
  const [selectedBook, setSelectedBook] = useState('Matt');
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [krvData, setKrvData] = useState<KRVBibleData>({});
  const [loadingBible, setLoadingBible] = useState(true);
  
  // Community panel state
  const [selectedVerseNum, setSelectedVerseNum] = useState<number | null>(null);
  const [showCommunity, setShowCommunity] = useState(false);
  // Unified verse content from reflections table
  const [verseTranslations, setVerseTranslations] = useState<any[]>([]);
  const [verseReflections, setVerseReflections] = useState<any[]>([]);
  // Commentary from study_notes (admin commentary only)
  const [studyNotes, setStudyNotes] = useState<any[]>([]);
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  const [newReflection, setNewReflection] = useState('');
  const [savingReflection, setSavingReflection] = useState(false);
  const [isGeneral, setIsGeneral] = useState(false);
  // View mode: 'verse' for current verse, 'chapter' for whole chapter
  const [viewMode, setViewMode] = useState<'verse' | 'chapter'>('verse');
  
  // Detail view state for translations and commentary
  const [selectedDetailPost, setSelectedDetailPost] = useState<any | null>(null);

  const bookInfo = books.find(b => b.id === selectedBook);

  // Load KRV Bible data
  useEffect(() => {
    const loadKRV = async () => {
      try {
        const response = await fetch('/data/krv_bible.json');
        const data = await response.json();
        setKrvData(data);
      } catch (err) {
        console.error('Error loading KRV:', err);
      } finally {
        setLoadingBible(false);
      }
    };
    loadKRV();
  }, []);

  // Load user profile
  useEffect(() => {
    if (user) {
      getMyProfile().then((p) => {
        setProfile(p);
        setIsGeneral(p?.tier === '준회원' || !p?.tier);
      }).catch(console.error);
    }
    getNotice().then(setNotice).catch(console.error);
  }, [user]);

  // Handle deep link post ID - navigate to post's verse and show community panel
  useEffect(() => {
    const loadPostAndNavigate = async () => {
      if (!postId) return;
      
      try {
        const supabase = getSupabase();
        
        // Try to find post in reflections
        let { data: post, error } = await supabase
          .from('reflections')
          .select('*')
          .eq('id', postId)
          .single();
        
        // If not found, try study_notes
        if (!post) {
          const { data: notePost, error: noteError } = await supabase
            .from('study_notes')
            .select('*')
            .eq('id', postId)
            .single();
          
          if (notePost) {
            post = notePost;
          }
        }
        
        if (post && post.book && post.chapter && post.verse) {
          // Convert Korean book name to English ID
          const englishBookId = koreanToEnglishMap[post.book] || 'Matt';
          
          // Navigate to the verse
          setSelectedBook(englishBookId);
          setSelectedChapter(post.chapter);
          setSelectedVerseNum(post.verse);
          
          // Show community panel
          setShowCommunity(true);
          
          // Load community data for this verse
          loadCommunityData(post.verse, 'verse');
        }
      } catch (err) {
        console.error('Error loading deep-linked post:', err);
      }
    };
    
    loadPostAndNavigate();
  }, [postId]);

  // Get verses for current chapter
  const getVersesForChapter = useCallback(() => {
    const abbrev = bookInfo?.abbrev || 'MAT';
    const verses: { verse: number; text: string }[] = [];
    
    for (let v = 1; v <= 200; v++) {
      const key = `${abbrev}_${selectedChapter}_${v}`;
      if (krvData[key]) {
        verses.push({ verse: v, text: krvData[key] });
      } else {
        break;
      }
    }
    return verses;
  }, [krvData, bookInfo, selectedChapter]);

  // Load community data for selected verse or chapter
  const loadCommunityData = async (verseNum: number, mode: 'verse' | 'chapter' = viewMode) => {
    setLoadingCommunity(true);
    try {
      const supabase = getSupabase();
      // Use Korean book name for verseRef consistency with DB
      const bookInfo = books.find(b => b.id === selectedBook);
      const koreanBookName = bookInfo?.name || bookNameMapReverse[selectedBook] || selectedBook;
      
      // Load reflections from reflections table (translations + reflections)
      let reflectionsQuery = supabase
        .from('reflections')
        .select('*, profiles(nickname, email, tier, church_name, job_position, show_church, show_job)')
        .eq('is_public', true);
      
      // Load commentary from study_notes (admin commentary only)
      let notesQuery = supabase
        .from('study_notes')
        .select('*, profiles(nickname, email, tier, church_name, job_position, show_church, show_job)');
      
      if (mode === 'verse') {
        // Filter by specific verse
        const verseRef = `${koreanBookName} ${selectedChapter}:${verseNum}`;
        reflectionsQuery = reflectionsQuery.eq('verse_ref', verseRef);
        notesQuery = notesQuery.eq('verse_ref', verseRef);
      } else {
        // Filter by chapter (book + chapter)
        reflectionsQuery = reflectionsQuery
          .eq('book', koreanBookName)
          .eq('chapter', selectedChapter);
        notesQuery = notesQuery
          .eq('book', koreanBookName)
          .eq('chapter', selectedChapter);
      }
      
      // Execute queries
      const { data: reflectionsData, error: refError } = await reflectionsQuery
        .order('verse', { ascending: true })
        .order('created_at', { ascending: false });
      
      if (refError) console.error('Reflections error:', refError);
      
      const { data: notesData, error: notesError } = await notesQuery
        .order('verse', { ascending: true })
        .order('created_at', { ascending: false });
      
      if (notesError) console.error('Notes error:', notesError);
      
      // Separate translations and reflections
      const allReflections = reflectionsData || [];
      const translations = allReflections.filter((r: any) => r.category === 'translation');
      const reflections = allReflections.filter((r: any) => r.category !== 'translation');
      
      setVerseTranslations(translations);
      setVerseReflections(reflections);
      setStudyNotes(notesData || []);
    } catch (err) {
      console.error('Error loading community:', err);
    } finally {
      setLoadingCommunity(false);
    }
  };

  // Handle verse click
  const handleVerseClick = (verseNum: number) => {
    setSelectedVerseNum(verseNum);
    setViewMode('verse'); // Reset to verse view when clicking a verse
    setShowCommunity(true);
    loadCommunityData(verseNum, 'verse');
  };
  
  // Handle view mode change
  const handleViewModeChange = (mode: 'verse' | 'chapter') => {
    setViewMode(mode);
    if (selectedVerseNum) {
      loadCommunityData(selectedVerseNum, mode);
    }
  };

  // Save reflection
  const handleSaveReflection = async () => {
    if (!newReflection.trim() || !user || isGeneral) return;
    
    setSavingReflection(true);
    try {
      const supabase = getSupabase();
      
      // Convert book abbreviation to Korean name for DB consistency
      const bookInfo = books.find(b => b.id === selectedBook);
      const koreanBookName = bookInfo?.name || bookNameMapReverse[selectedBook] || selectedBook;
      const verseRef = `${koreanBookName} ${selectedChapter}:${selectedVerseNum}`;
      
      const { error } = await supabase.from('reflections').insert({
        user_id: user.id,
        verse_ref: verseRef,
        book: koreanBookName,
        chapter: selectedChapter,
        verse: selectedVerseNum,
        content: newReflection,
        is_public: true,
        title: null,
        category: 'general'
      });
      
      if (error) throw error;
      
      setNewReflection('');
      await loadCommunityData(selectedVerseNum!, viewMode);
    } catch (err) {
      console.error('Error saving reflection:', err);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSavingReflection(false);
    }
  };

  // Format display name with church/job
  const getDisplayName = (profile: any) => {
    if (!profile) return '익명';
    
    const parts: string[] = [];
    
    // Add church if shown
    if (profile.show_church && profile.church_name) {
      parts.push(`[${profile.church_name}]`);
    }
    
    // Add job if shown
    if (profile.show_job && profile.job_position) {
      parts.push(`[${profile.job_position}]`);
    }
    
    // Add nickname
    parts.push(profile.nickname || profile.email?.split('@')[0] || '익명');
    
    return parts.join(' ');
  };

  const isLoggedIn = !!user;
  const userRole = profile?.tier || '준회원';
  const isAdmin = userRole === '관리자' || userRole === 'Admin';
  const verses = getVersesForChapter();

  const handleNavigateToStudy = () => {
    if (selectedDetailPost?.book && selectedDetailPost?.chapter && selectedDetailPost?.verse) {
      const bookId = koreanToEnglishMap[selectedDetailPost.book] || 'Matt';
      router.push(`/study?book=${bookId}&chapter=${selectedDetailPost.chapter}&verse=${selectedDetailPost.verse}`);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/');
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
              말씀 나눔터(한글)
            </h1>
            <p className="text-xs text-stone-500">
              개역한글(KRV) 성경 읽기와 묵상
            </p>
          </div>
        </div>

        {/* Book/Chapter Selector */}
        <div className="hidden sm:flex items-center gap-2">
          <select
            value={selectedBook}
            onChange={(e) => {
              setSelectedBook(e.target.value);
              setSelectedChapter(1);
              setShowCommunity(false);
            }}
            className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg bg-white"
          >
            {books.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select
            value={selectedChapter}
            onChange={(e) => {
              setSelectedChapter(parseInt(e.target.value));
              setShowCommunity(false);
            }}
            className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg bg-white"
          >
            {Array.from({ length: bookInfo?.chapters || 28 }, (_, i) => i + 1).map(ch => (
              <option key={ch} value={ch}>{ch}장</option>
            ))}
          </select>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-lg"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        
        {/* Desktop Auth */}
        <div className="hidden md:flex items-center gap-2">
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <a
                href="/profile"
                className="text-xs text-stone-500 hover:text-amber-600 hover:underline cursor-pointer transition-colors"
              >
                {isAdmin ? '👑 ' : ''}{profile?.nickname || user?.email?.split('@')[0]}
              </a>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 rounded-lg text-sm text-stone-600 hover:bg-stone-200 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            </div>
          ) : (
            <a
              href="/login"
              className="flex items-center gap-2 px-3 py-1.5 bg-stone-800 text-white rounded-lg text-sm hover:bg-stone-700 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              로그인
            </a>
          )}
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-stone-200 px-4 py-3 space-y-3">
          {/* Mobile Book/Chapter Selector */}
          <div className="flex gap-2">
            <select
              value={selectedBook}
              onChange={(e) => {
                setSelectedBook(e.target.value);
                setSelectedChapter(1);
                setShowCommunity(false);
              }}
              className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-lg"
            >
              {books.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <select
              value={selectedChapter}
              onChange={(e) => {
                setSelectedChapter(parseInt(e.target.value));
                setShowCommunity(false);
              }}
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

      {/* Notice Banner */}
      {notice && (
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
          <div className="max-w-6xl mx-auto flex items-start gap-2">
            <BookOpen className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-xs font-bold text-blue-700">📢 연구소 공지사항</span>
              <p className="text-sm text-stone-700 mt-1">{notice.content}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Bible Text */}
          <div className={`${showCommunity ? 'hidden lg:block' : ''}`}>
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {/* Chapter Header */}
              <div className="px-4 py-3 bg-stone-50 border-b border-stone-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-serif font-bold text-stone-800">
                    {bookInfo?.name} {selectedChapter}장
                  </h2>
                  <span className="text-xs text-stone-400 hidden sm:block">
                    💡 절을 클릭하여 묵상 보기
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
              <div className="p-4 space-y-3">
                {loadingBible ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
                  </div>
                ) : verses.length === 0 ? (
                  <div className="text-center py-12 text-stone-500">
                    <p>본문을 불러올 수 없습니다.</p>
                  </div>
                ) : (
                  verses.map((v) => (
                    <div 
                      key={v.verse}
                      onClick={() => handleVerseClick(v.verse)}
                      className={`group flex gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                        selectedVerseNum === v.verse 
                          ? 'bg-amber-50 border border-amber-300 shadow-sm' 
                          : 'hover:bg-stone-50 hover:shadow-sm border border-transparent'
                      }`}
                    >
                      <span className={`text-sm font-bold min-w-[2rem] transition-colors ${
                        selectedVerseNum === v.verse 
                          ? 'text-amber-700' 
                          : 'text-amber-600 group-hover:text-amber-700'
                      }`}>
                        {v.verse}
                      </span>
                      <p className={`leading-relaxed flex-1 transition-colors ${
                        selectedVerseNum === v.verse 
                          ? 'text-stone-900' 
                          : 'text-stone-800'
                      }`}>
                        {v.text}
                      </p>
                      {/* Hover indicator */}
                      <span className={`text-xs text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity ${
                        selectedVerseNum === v.verse ? 'hidden' : ''
                      }`}>
                        클릭하여 보기 →
                      </span>
                    </div>
                  ))}
                )}
              </div>
            </div>
          </div>

          {/* Right Side Panel */}
          <div className="w-70">
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 rounded-lg text-sm text-stone-600 hover:bg-stone-200 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    로그아웃
                  </button>
                </div>
              ) : (
                <a
                  href="/login"
                  className="flex items-center gap-2 px-3 py-1.5 bg-stone-800 text-white rounded-lg text-sm hover:bg-stone-700 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  로그인
                </a>
              )}
            </div>
          </header>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-white border-b border-stone-200 px-4 py-3 space-y-3">
              {/* Mobile Book/Chapter Selector */}
              <div className="flex gap-2">
                <select
                  value={selectedBook}
                  onChange={(e) => {
                    setSelectedBook(e.target.value);
                    setSelectedChapter(1);
                    setShowCommunity(false);
                  }}
                  className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-lg"
                >
                  {books.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <select
                  value={selectedChapter}
                  onChange={(e) => {
                    setSelectedChapter(parseInt(e.target.value));
                    setShowCommunity(false);
                  }}
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

          {/* Notice Banner */}
          {notice && (
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
              <div className="max-w-6xl mx-auto flex items-start gap-2">
                <BookOpen className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-xs font-bold text-blue-700">📢 연구소 공지사항</span>
                  <p className="text-sm text-stone-700 mt-1">{notice.content}</p>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <main className="max-w-6xl mx-auto p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Bible Text */}
              <div className={`${showCommunity ? 'hidden lg:block' : ''}`}>
                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                  {/* Chapter Header */}
                  <div className="px-4 py-3 bg-stone-50 border-b border-stone-200">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-serif font-bold text-stone-800">
                        {bookInfo?.name} {selectedChapter}장
                      </h2>
                      <span className="text-xs text-stone-400 hidden sm:block">
                        💡 절을 클릭하여 묵상 보기
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
                  <div className="p-4 space-y-3">
                    {loadingBible ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
                      </div>
                    ) : verses.length === 0 ? (
                      <div className="text-center py-12 text-stone-500">
                        <p>본문을 불러올 수 없습니다.</p>
                      </div>
                    ) : (
                      verses.map((v) => (
                        <div 
                          key={v.verse}
                          onClick={() => handleVerseClick(v.verse)}
                          className={`group flex gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                            selectedVerseNum === v.verse 
                              ? 'bg-amber-50 border border-amber-300 shadow-sm' 
                              : 'hover:bg-stone-50 hover:shadow-sm border border-transparent'
                          }`}
                        >
                          <span className={`text-sm font-bold min-w-[2rem] transition-colors ${
                            selectedVerseNum === v.verse 
                              ? 'text-amber-700' 
                              : 'text-amber-600 group-hover:text-amber-700'
                          }`}>
                            {v.verse}
                          </span>
                          <p className={`leading-relaxed flex-1 transition-colors ${
                            selectedVerseNum === v.verse 
                              ? 'text-stone-900' 
                              : 'text-stone-800'
                          }`}>
                            {v.text}
                          </p>
                          {/* Hover indicator */}
                          <span className={`text-xs text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity ${
                            selectedVerseNum === v.verse ? 'hidden' : ''
                          }`}>
                            클릭하여 보기 →
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Chapter Navigation */}
                  <div className="px-4 py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
                    <button
                      onClick={() => {
                        if (selectedChapter > 1) {
                          setSelectedChapter(selectedChapter - 1);
                          setShowCommunity(false);
                        }
                      }}
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
                      onClick={() => {
                        if (selectedChapter < (bookInfo?.chapters || 28)) {
                          setSelectedChapter(selectedChapter + 1);
                          setShowCommunity(false);
                        }
                      }}
                      disabled={selectedChapter >= (bookInfo?.chapters || 28)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-200 rounded-lg disabled:opacity-50"
                    >
                      다음 장
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile Backdrop */}
              {showCommunity && (
                <div 
                  className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden transition-opacity"
                  onClick={() => setShowCommunity(false)}
                />
              )}

              {/* Right: Community Panel */}
              <div className={`
                ${showCommunity ? '' : 'hidden lg:block'}
                lg:static lg:z-auto
                fixed inset-x-0 bottom-0 z-50 lg:inset-auto
                transition-transform duration-300 ease-out
                ${showCommunity ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
              `}>
                {selectedVerseNum ? (
                  studyNotes.filter((n: any) => n.profiles?.tier === '관리자').map((note: any) => (
                    <div 
                      key={note.id} 
                      className="p-3 rounded-lg bg-stone-50 border border-stone-200 cursor-pointer hover:bg-stone-100 transition-colors"
                      onClick={() => router.push(`/read/${selectedBook.id}/${selectedChapterNum}/${selectedVerseNum || 1}`)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-purple-700">👑 공식 주석</span>
                        <span className="text-xs text-stone-500">{getDisplayName(note.profiles)}</span>
                        {viewMode === 'chapter' && note.verse > 0 && (
                          <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">
                            {note.verse}절
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-stone-800">{note.content}</p>
                      {note.commentary && (
                        <p className="text-xs text-purple-700 mt-2 bg-purple-100 p-2 rounded">
                          {note.commentary}
                        </p>
                      )}
                    </div>
                  ))
                ) : null}
              </div>
            </div>
          </main>
        </div>
      </div>
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
