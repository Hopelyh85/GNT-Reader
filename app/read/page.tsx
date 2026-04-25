'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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

export default function ReadPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notice, setNotice] = useState<{ id: number; content: string; updated_at: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Bible reading state
  const [selectedBook, setSelectedBook] = useState('Matt');
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [krvData, setKrvData] = useState<KRVBibleData>({});
  const [loadingBible, setLoadingBible] = useState(true);
  
  // Community panel state
  const [selectedVerseNum, setSelectedVerseNum] = useState<number | null>(null);
  const [showCommunity, setShowCommunity] = useState(false);
  const [reflections, setReflections] = useState<any[]>([]);
  const [studyNotes, setStudyNotes] = useState<any[]>([]);
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  const [newReflection, setNewReflection] = useState('');
  const [savingReflection, setSavingReflection] = useState(false);
  const [isGeneral, setIsGeneral] = useState(false);
  // View mode: 'verse' for current verse, 'chapter' for whole chapter
  const [viewMode, setViewMode] = useState<'verse' | 'chapter'>('verse');

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
        setIsGeneral(p?.tier === 'General' || !p?.tier);
      }).catch(console.error);
    }
    getNotice().then(setNotice).catch(console.error);
  }, [user]);

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
      
      let reflectionsQuery = supabase
        .from('reflections')
        .select('*, profiles(nickname, email, tier, church_name, job_position, show_church, show_job)')
        .eq('is_public', true);
      
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
      
      setReflections(reflectionsData || []);
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
  const userRole = profile?.tier || 'General';
  const isAdmin = userRole === '관리자' || userRole === 'Admin' || userRole?.includes('⭐⭐⭐⭐⭐');
  const verses = getVersesForChapter();

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
              한글 성경 나눔터
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
              <span className="text-xs text-stone-500">
                {isAdmin ? '👑 ' : ''}{profile?.nickname || user?.email?.split('@')[0]}
              </span>
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
              <div className="bg-white lg:rounded-xl border-t lg:border border-stone-200 overflow-hidden h-[70vh] lg:h-full lg:shadow-none shadow-2xl rounded-t-2xl">
                {/* Mobile Handle Bar */}
                <div className="lg:hidden w-full py-2 bg-stone-50 border-b border-stone-200">
                  <div className="w-12 h-1 bg-stone-300 rounded-full mx-auto" />
                </div>
                
                {/* Header */}
                <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-600" />
                    <div>
                      <h3 className="font-bold text-stone-800 text-sm">
                        {bookInfo?.name} {selectedChapter}:{selectedVerseNum}
                      </h3>
                      <p className="text-xs text-stone-500">묵상과 나눔</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCommunity(false)}
                    className="lg:hidden p-2 hover:bg-stone-200 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {/* View Mode Toggle */}
                <div className="px-4 py-2 bg-white border-b border-stone-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-500">보기:</span>
                    <div className="flex rounded-lg bg-stone-100 p-0.5">
                      <button
                        onClick={() => handleViewModeChange('verse')}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${
                          viewMode === 'verse'
                            ? 'bg-white text-stone-800 shadow-sm'
                            : 'text-stone-500 hover:text-stone-700'
                        }`}
                      >
                        {selectedVerseNum}절
                      </button>
                      <button
                        onClick={() => handleViewModeChange('chapter')}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${
                          viewMode === 'chapter'
                            ? 'bg-white text-stone-800 shadow-sm'
                            : 'text-stone-500 hover:text-stone-700'
                        }`}
                      >
                        {selectedChapter}장 전체
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 space-y-4 max-h-[calc(70vh-180px)] lg:max-h-[calc(100vh-340px)] overflow-y-auto">
                  {/* Admin Notes (Purple) */}
                  {studyNotes.filter((n: any) => 
                    n.profiles?.tier === '관리자' || n.profiles?.tier === 'Admin' || n.profiles?.tier?.includes('⭐⭐⭐⭐⭐')
                  ).map((note: any) => (
                    <div key={note.id} className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="w-4 h-4 text-purple-600" />
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
                  ))}
                  
                  {/* Study Notes (Blue) */}
                  {studyNotes.filter((n: any) => {
                    const isAdminNote = n.profiles?.tier === '관리자' || n.profiles?.tier === 'Admin' || n.profiles?.tier?.includes('⭐⭐⭐⭐⭐');
                    return !isAdminNote;
                  }).map((note: any) => (
                    <div key={note.id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Pin className="w-3 h-3 text-blue-600" />
                        <span className="text-xs font-bold text-blue-700">동역자 사역</span>
                        <span className="text-xs text-stone-500">{getDisplayName(note.profiles)}</span>
                        {viewMode === 'chapter' && note.verse > 0 && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                            {note.verse}절
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-stone-800">{note.content}</p>
                    </div>
                  ))}
                  
                  {/* Reflections (Beige) */}
                  {reflections.map((ref: any) => (
                    <div key={ref.id} className="p-3 bg-stone-50 border border-stone-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-3 h-3 text-stone-500" />
                        <span className="text-xs font-medium text-stone-700">{getDisplayName(ref.profiles)}</span>
                        <span className="text-xs text-stone-400">
                          {new Date(ref.created_at).toLocaleDateString('ko-KR')}
                        </span>
                        {viewMode === 'chapter' && ref.verse > 0 && (
                          <span className="text-xs bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded">
                            {ref.verse}절
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-stone-800">{ref.content}</p>
                    </div>
                  ))}
                  
                  {loadingCommunity && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
                    </div>
                  )}
                  
                  {!loadingCommunity && reflections.length === 0 && studyNotes.length === 0 && (
                    <div className="text-center py-8 text-stone-400">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        {viewMode === 'chapter' 
                          ? `아직 ${selectedChapter}장에 나눔이 없습니다.` 
                          : '아직 이 절에 나눔이 없습니다.'}
                      </p>
                      {!isGeneral && <p className="text-xs mt-1">첫 번째 묵상을 남겨보세요!</p>}
                    </div>
                  )}
                </div>
                
                {/* Write Reflection */}
                {isLoggedIn && !isGeneral && (
                  <div className="p-4 border-t border-stone-200 bg-stone-50">
                    <textarea
                      value={newReflection}
                      onChange={(e) => setNewReflection(e.target.value)}
                      placeholder="이 구절에 대한 묵상을 남겨보세요..."
                      className="w-full h-20 p-3 text-sm bg-white border border-stone-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-stone-200"
                    />
                    <button
                      onClick={handleSaveReflection}
                      disabled={!newReflection.trim() || savingReflection}
                      className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 bg-stone-800 text-white rounded-lg text-sm hover:bg-stone-700 disabled:opacity-50 transition-colors"
                    >
                      {savingReflection ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      묵상 나누기
                    </button>
                  </div>
                )}
                
                {isLoggedIn && isGeneral && (
                  <div className="p-4 border-t border-stone-200 bg-amber-50">
                    <p className="text-sm text-amber-800 text-center">
                      ⭐ 등급은 읽기만 가능합니다.<br />
                      <a href="/login?tab=profile" className="underline">등업 신청</a> 후 글쓰기가 가능합니다.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden lg:flex bg-stone-50 rounded-xl border border-stone-200 p-8 text-center flex-col items-center justify-center h-64">
                <BookOpen className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <p className="text-stone-600">왼쪽에서 절을 클릭하면</p>
                <p className="text-stone-600">이 곳에 묵상과 나눔이 표시됩니다</p>
                <p className="text-xs text-stone-400 mt-4">💡 본문의 절 번호를 클릭해보세요</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
