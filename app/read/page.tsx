'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  BookOpen, LogOut, LogIn, Menu, X, ArrowLeft, ChevronDown, ChevronRight,
  Loader2, Heart
} from 'lucide-react';
import { useAuth } from '@/app/components/AuthProvider';
import { 
  bookNameMap, bookNameMapReverse, getSupabase, getMyProfile, signOut,
  getPublicReflections, getVerseContent, addLike, removeLike, hasUserLiked, getLikesCount
} from '@/app/lib/supabase';

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

type KRVBibleData = Record<string, Record<string, Array<{ verse: number; text: string }>>>;

function ReadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  
  // State
  const [selectedBook, setSelectedBook] = useState('Matt');
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [krvData, setKrvData] = useState<KRVBibleData>({});
  const [loadingBible, setLoadingBible] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Community content
  const [translations, setTranslations] = useState<any[]>([]);
  const [reflections, setReflections] = useState<any[]>([]);
  const [studyNotes, setStudyNotes] = useState<any[]>([]);
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  
  // Derived data
  const bookInfo = books.find(b => b.id === selectedBook);
  const verses = krvData[selectedBook]?.[selectedChapter.toString()] || [];
  
  // Check auth
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    };
    checkAuth();
  }, [user]);
  
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
              말씀 나눔터(한글)
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
                      onClick={() => navigateToVerse(v.verse)}
                      className="group flex gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-stone-50 hover:shadow-sm border border-transparent hover:border-stone-200"
                    >
                      <span className="text-sm font-bold min-w-[2rem] text-amber-600 group-hover:text-amber-700">
                        {v.verse}
                      </span>
                      <p className="leading-relaxed flex-1 text-stone-800">
                        {v.text}
                      </p>
                      <span className="text-xs text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        클릭하여 보기 →
                      </span>
                    </div>
                  ))
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
                  
                  {/* Personal Translations */}
                  {translations.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wide">개인 번역</h4>
                      {translations.map((t: any, i: number) => (
                        <div
                          key={i}
                          onClick={() => navigateToVerse(t.verse || 1)}
                          className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 cursor-pointer hover:bg-emerald-100 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-emerald-700">{t.verse}절</span>
                            <span className="text-xs text-stone-500">{t.profiles?.nickname || '성도'}</span>
                          </div>
                          <p className="text-sm text-stone-800">{t.content}</p>
                          <div className="mt-2 flex items-center justify-end">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleLike(t.id, t.liked || false); }}
                              className={`text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors ${t.liked ? 'bg-red-100 text-red-600' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                            >
                              🙏 기도합니다 ({t.likes || 0})
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Reflections (Meditations) */}
                  {reflections.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wide">묵상</h4>
                      {reflections.map((r: any, i: number) => (
                        <div
                          key={i}
                          onClick={() => navigateToVerse(r.verse || 1)}
                          className="p-3 rounded-lg bg-blue-50 border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-blue-700">{r.verse}절</span>
                            <span className="text-xs text-stone-500">{r.profiles?.nickname || '성도'}</span>
                          </div>
                          <p className="text-sm text-stone-800">{r.content}</p>
                          <div className="mt-2 flex items-center justify-end">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleLike(r.id, r.liked || false); }}
                              className={`text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors ${r.liked ? 'bg-red-100 text-red-600' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                            >
                              🙏 기도합니다 ({r.likes || 0})
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
