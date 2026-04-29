'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/AuthProvider';

// 강력한 성경 코드 정규화 함수
function normalizeBookCode(book: string): string {
  if (!book) return "";
  let cleanBook = book.trim().toUpperCase().replace(/\s+/g, '');

    const bookMap: Record<string, string> = {
      // 1. 숫자 포함 영문 풀네임 & 약어 완벽 대응
      '1CORINTHIANS': '1CO', '1COR': '1CO', '2CORINTHIANS': '2CO', '2COR': '2CO',
      '1THESSALONIANS': '1TH', '1THESS': '1TH', '2THESSALONIANS': '2TH', '2THESS': '2TH',
      '1SAMUEL': '1SA', '1SAM': '1SA', '2SAMUEL': '2SA', '2SAM': '2SA',
      '1KINGS': '1KI', '1KIN': '1KI', '2KINGS': '2KI', '2KIN': '2KI',
      '1CHRONICLES': '1CH', '1CHRON': '1CH', '2CHRONICLES': '2CH', '2CHRON': '2CH',
      '1PETER': '1PE', '1PET': '1PE', '2PETER': '2PE', '2PET': '2PE',
      '1JOHN': '1JN', '2JOHN': '2JN', '3JOHN': '3JN',
      'PHILEMON': 'PHM', 'PHILE': 'PHM',

      // 2. 한글 풀네임 완벽 대응
      '고린도전서': '1CO', '고린도후서': '2CO',
      '데살로니가전서': '1TH', '데살로니가후서': '2TH',
      '디모데전서': '1TI', '디모데후서': '2TI',
      '베드로전서': '1PE', '베드로후서': '2PE',
      '요한1서': '1JN', '요한일서': '1JN', '요한2서': '2JN', '요한이서': '2JN', '요한3서': '3JN', '요한삼서': '3JN',
      '사무엘상': '1SA', '사무엘하': '2SA',
      '열왕기상': '1KI', '열왕기하': '2KI',
      '역대기상': '1CH', '역대기하': '2CH', '역대상': '1CH', '역대하': '2CH'
    };

  return bookMap[cleanBook] || bookMap[book] || cleanBook;
}

import { 
  getMyProfile, signOut, Profile, getGlobalNotice, 
  getSupabase, getLikesCount, hasUserLiked, addLike, removeLike, addReply, getReplies 
} from '@/app/lib/supabase';
import { 
  BookOpen, LogOut, LogIn, Menu, X, ArrowLeft, Search, BookMarked, 
  ChevronDown, XCircle, Info, BookmarkPlus, ExternalLink,
  Heart, MessageSquare, Send, Crown
} from 'lucide-react';

// Bible book lists
const OT_BOOKS = [
  'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA',
  '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO',
  'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO',
  'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL'
];

const NT_BOOKS = [
  'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH',
  'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS',
  '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV'
];

// 5-tier like highlight colors
const getLikeHighlightClass = (likes: number): string => {
  if (likes >= 500) return 'bg-pink-50';    // ❤️ 500+
  if (likes >= 100) return 'bg-orange-50'; // ❤️ 100+
  if (likes >= 50) return 'bg-blue-50';     // ❤️ 50+
  if (likes >= 30) return 'bg-green-50';    // ❤️ 30+
  if (likes >= 10) return 'bg-yellow-50';   // ❤️ 10+
  return 'bg-white';
};

// 24-hour time format
const formatTime24h = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
};

// Reflection Card Component
const ReflectionCard = ({ reflection, onLike, onComment, activeReflectionId, reflectionComment, setReflectionComment, user, setActiveReflectionId, handleReflectionComment, handleReflectionLike }: { reflection: any, onLike?: (id: string, liked: boolean) => void, onComment?: (id: string) => void, activeReflectionId?: string | null, reflectionComment?: string, setReflectionComment?: (v: string) => void, user?: any, setActiveReflectionId?: (id: string | null) => void, handleReflectionComment?: (id: string) => void, handleReflectionLike?: (id: string, liked: boolean) => void }) => (
  <div className={`rounded-xl p-4 border ${getLikeHighlightClass(reflection.likes || 0)}`}>
    {/* Author Info */}
    <div className="flex items-center gap-2 mb-2">
      <div className="w-6 h-6 bg-stone-200 rounded-full flex items-center justify-center">
        <span className="text-xs text-stone-600">
          {(reflection.profiles?.nickname || reflection.profiles?.email?.split('@')[0] || '익명')[0]}
        </span>
      </div>
      <span className="text-sm font-medium text-stone-700">
        {reflection.profiles?.nickname || reflection.profiles?.email?.split('@')[0] || '익명'}
      </span>
      <span className="text-xs text-stone-400">
        {new Date(reflection.created_at).toLocaleDateString('ko-KR')} {formatTime24h(reflection.created_at)}
      </span>
    </div>
    
    {/* Content */}
    <p className="text-stone-800 text-sm leading-relaxed mb-3">
      {reflection.content}
    </p>
    
    {/* Actions */}
    <div className="flex items-center gap-3">
      <button
        onClick={() => handleReflectionLike?.(reflection.id, reflection.liked)}
        className={`flex items-center gap-1 text-sm ${reflection.liked ? 'text-red-600' : 'text-stone-500 hover:text-red-600'}`}
      >
        <Heart className="w-4 h-4" fill={reflection.liked ? 'currentColor' : 'none'} />
        {reflection.likes || 0}
      </button>
      
      <button
        onClick={() => setActiveReflectionId?.(activeReflectionId === reflection.id ? null : reflection.id)}
        className="flex items-center gap-1 text-sm text-stone-500 hover:text-blue-600"
      >
        <MessageSquare className="w-4 h-4" />
        댓글
      </button>
    </div>
    
    {/* Replies */}
    {reflection.replies && reflection.replies.length > 0 && (
      <div className="mt-3 pt-3 border-t border-stone-200 space-y-2">
        {reflection.replies.map((reply: any) => (
          <div key={reply.id} className="pl-4 border-l-2 border-stone-200">
            <div className="flex items-center gap-1 text-xs text-stone-500">
              <span>{reply.profiles?.nickname || reply.profiles?.email?.split('@')[0] || '익명'}</span>
              <span>{formatTime24h(reply.created_at)}</span>
            </div>
            <p className="text-sm text-stone-700">{reply.content}</p>
          </div>
        ))}
      </div>
    )}
    
    {/* Reply Input */}
    {activeReflectionId === reflection.id && (
      <div className="mt-3 pt-3 border-t border-stone-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={reflectionComment}
            onChange={(e) => setReflectionComment?.(e.target.value)}
            className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="대댓글을 입력하세요..."
          />
          <button
            onClick={() => handleReflectionComment?.(reflection.id)}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    )}
  </div>
);

const BOOK_NAMES_KR: Record<string, string> = {
  GEN: '창세기', EXO: '출애굽기', LEV: '레위기', NUM: '민수기', DEU: '신명기',
  JOS: '여호수아', JDG: '사사기', RUT: '룻기', '1SA': '사무엘상', '2SA': '사무엘하',
  '1KI': '열왕기상', '2KI': '열왕기하', '1CH': '역대상', '2CH': '역대하', EZR: '에스라',
  NEH: '느헤미야', EST: '에스더', JOB: '욥기', PSA: '시편', PRO: '잠언',
  ECC: '전도서', SNG: '아가', ISA: '이사야', JER: '예레미야', LAM: '예레미야애가',
  EZK: '에스겔', DAN: '다니엘', HOS: '호세아', JOL: '요엘', AMO: '아모스',
  OBA: '오바댜', JON: '요나', MIC: '미가', NAM: '나훔', HAB: '하박국',
  ZEP: '스바냐', HAG: '학개', ZEC: '스가랴', MAL: '말라기',
  MAT: '마태복음', MRK: '마가복음', LUK: '누가복음', JHN: '요한복음', ACT: '사도행전',
  ROM: '로마서', '1CO': '고린도전서', '2CO': '고린도후서', GAL: '갈라디아서',
  EPH: '에베소서', PHP: '빌립보서', COL: '골로새서', '1TH': '데살로니가전서',
  '2TH': '데살로니가후서', '1TI': '디모데전서', '2TI': '디모데후서', TIT: '디도서',
  PHM: '빌레몬서', HEB: '히브리서', JAS: '야고보서', '1PE': '베드로전서',
  '2PE': '베드로후서', '1JN': '요한일서', '2JN': '요한이서', '3JN': '요한삼서',
  JUD: '유다서', REV: '요한계시록'
};

export default function StudyPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  // Bible data states
  const [bibleData, setBibleData] = useState<Record<string, any[]>>({});
  const [koreanBibleData, setKoreanBibleData] = useState<Record<string, string>>({});
  const [kjvBibleData, setKjvBibleData] = useState<Record<string, string>>({});
  const [netBibleData, setNetBibleData] = useState<Record<string, string>>({});
  const [lexiconData, setLexiconData] = useState<{ lexicon: Record<string, any>, morphology: Record<string, string> }>({ lexicon: {}, morphology: {} });
  const [koreanDict, setKoreanDict] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI states
  const [testament, setTestament] = useState<'OT' | 'NT'>('NT');
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [expandedBooks, setExpandedBooks] = useState<Set<string>>(new Set());
  const [selectedWord, setSelectedWord] = useState<any>(null);
  
  // Verse detail modal states
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [verseDetailOpen, setVerseDetailOpen] = useState(false);
  const [myTranslation, setMyTranslation] = useState('');
  const [myCommentary, setMyCommentary] = useState('');
  const [savingStudy, setSavingStudy] = useState(false);
  
  // Accordion states for reading view
  const [expandedStudyVerses, setExpandedStudyVerses] = useState<Set<number>>(new Set());
  
  // Reflections states
  const [verseReflections, setVerseReflections] = useState<any[]>([]);
  const [reflectionComment, setReflectionComment] = useState('');
  const [activeReflectionId, setActiveReflectionId] = useState<string | null>(null);

  // Chapter-level states (장 단위 연구 노트)
  const [chapterCommentary, setChapterCommentary] = useState<string>('');
  const [chapterReflections, setChapterReflections] = useState<any[]>([]);
  const [newChapterReflection, setNewChapterReflection] = useState('');
  const [showChapterCommentaryEdit, setShowChapterCommentaryEdit] = useState(false);
  const [editingChapterCommentary, setEditingChapterCommentary] = useState('');

  // User profile
  const [profile, setProfile] = useState<Profile | null>(null);
  const [globalNotice, setGlobalNotice] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Load bible, lexicon, and korean dictionary data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [bibleRes, koreanRes, kjvRes, netRes, lexiconRes, koreanDictRes] = await Promise.all([
          fetch('/data/parsed_original_bible.json'),
          fetch('/data/krv_bible.json'),
          fetch('/data/kjv_bible.json'),
          fetch('/data/net_bible.json'),
          fetch('/data/step_lexicon.json'),
          fetch('/data/korean_strongs_dict.json')
        ]);
        
        if (!bibleRes.ok || !lexiconRes.ok) {
          throw new Error('Failed to load bible or lexicon data');
        }
        
        const bibleJson = await bibleRes.json();
        const lexiconJson = await lexiconRes.json();
        
        setBibleData(bibleJson);
        setLexiconData(lexiconJson);
        
        // Load Korean Bible (KRV)
        if (koreanRes.ok) {
          const koreanJson = await koreanRes.json();
          setKoreanBibleData(koreanJson);
          console.log('✅ KRV loaded:', Object.keys(koreanJson).length, 'verses');
        }
        
        // Load KJV Bible
        if (kjvRes.ok) {
          const kjvJson = await kjvRes.json();
          setKjvBibleData(kjvJson);
          console.log('✅ KJV loaded:', Object.keys(kjvJson).length, 'verses');
        }
        
        // Load NET Bible
        if (netRes.ok) {
          const netJson = await netRes.json();
          setNetBibleData(netJson);
          console.log('✅ NET loaded:', Object.keys(netJson).length, 'verses');
        }
        
        // Load Korean Strongs dictionary
        if (koreanDictRes.ok) {
          const koreanDictJson = await koreanDictRes.json();
          setKoreanDict(koreanDictJson);
          console.log('✅ Korean Strongs dictionary loaded:', Object.keys(koreanDictJson).length, 'entries');
        }
        
        // Default to first NT book
        if (NT_BOOKS.length > 0) {
          setSelectedBook(NT_BOOKS[0]);
        }
      } catch (err: any) {
        console.error('Error loading data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Get chapters for selected book (hierarchical structure)
  const getChapters = () => {
    const bookKey = normalizeBookCode(selectedBook);
    const bookData = bibleData[bookKey] as Record<string, any>;
    if (!bookData) return [];
    const chapters = Object.keys(bookData).map(ch => parseInt(ch));
    return Array.from(new Set(chapters)).sort((a, b) => a - b);
  };

  // Get verses for selected book and chapter (hierarchical structure: bibleData[book][chapter][verse])
  const getVerses = () => {
    const verses: Record<number, any[]> = {};
    const bookKey = normalizeBookCode(selectedBook);
    const bookData = bibleData[bookKey] as Record<string, any>;
    const chapterData = bookData ? bookData[selectedChapter.toString()] : null;
    if (chapterData) {
      Object.entries(chapterData).forEach(([verseNum, words]) => {
        verses[parseInt(verseNum)] = words as any[];
      });
    }
    return verses;
  };

  // Handle word click - show in right panel
  const handleWordClick = (word: any) => {
    setSelectedWord(word);
  };

  // Normalize strong code for matching (G2384 -> G2384, handle G0001 format)
  const normalizeStrongCode = (strong: string): string => {
    if (!strong) return '';
    // Extract prefix (G/H) and number
    const match = strong.match(/^([GH])(\d+)$/i);
    if (!match) return strong;
    const [, prefix, num] = match;
    const paddedNum = num.padStart(4, '0');
    return `${prefix.toUpperCase()}${paddedNum}`;
  };

  // Get lexicon entry for a word (with normalized strong code matching)
  const getLexiconEntry = (strong: string) => {
    const normalized = normalizeStrongCode(strong);
    return lexiconData.lexicon[normalized] || lexiconData.lexicon[strong] || null;
  };

  // Get Korean meaning from dictionary with fallback
  const getKoreanMeaning = (strong: string): string => {
    const normalized = normalizeStrongCode(strong);
    // Try normalized key first, then original
    return koreanDict[normalized] || koreanDict[strong] || '';
  };

  // Decode morphology - returns bilingual [RAW + Korean]
  const decodeMorphology = (grammar: string): { raw: string; korean: string } => {
    if (!grammar) return { raw: '', korean: '정보 없음' };
    const decoded = lexiconData.morphology[grammar];
    return {
      raw: grammar,
      korean: decoded || '미등록 코드'
    };
  };

  // Handle verse click - open detail modal
  const handleVerseClick = async (verseNum: number) => {
    setSelectedVerse(verseNum);
    setVerseDetailOpen(true);
    
    // Load verse data
    await loadVerseData(verseNum);
  };

  // Load verse data (reflections, existing translation/commentary)
  const loadVerseData = async (verseNum: number) => {
    if (!selectedBook) return;
    
    const verseRef = `${normalizeBookCode(selectedBook)}_${selectedChapter}_${verseNum}`;
    
    try {
      // Load reflections for this verse
      const supabase = getSupabase();
      const { data: reflections, error } = await supabase
        .from('reflections')
        .select(`
          id, user_id, content, created_at, category, likes,
          profiles:profiles(nickname, email, tier)
        `)
        .eq('verse_ref', verseRef)
        .eq('is_public', true)
        .order('created_at', { ascending: false });
      
      if (!error && reflections) {
        // Load likes for each reflection
        const reflectionsWithLikes = await Promise.all(
          reflections.map(async (ref: any) => {
            const likeCount = await getLikesCount(ref.id);
            const hasLiked = user ? await hasUserLiked(ref.id) : false;
            return { ...ref, likes: likeCount, liked: hasLiked };
          })
        );
        setVerseReflections(reflectionsWithLikes);
      }
      
      // Load user's translation/commentary if exists
      if (user) {
        const { data: studyNotes } = await supabase
          .from('study_notes')
          .select('translation, commentary')
          .eq('user_id', user.id)
          .eq('verse_ref', verseRef)
          .single();
        
        if (studyNotes) {
          setMyTranslation(studyNotes.translation || '');
          setMyCommentary(studyNotes.commentary || '');
        }
      }
    } catch (err) {
      console.error('Error loading verse data:', err);
    }
  };

  // Save translation and commentary
  const handleSaveStudy = async () => {
    if (!user || !selectedVerse) return;
    
    setSavingStudy(true);
    try {
      const supabase = getSupabase();
      const verseRef = `${normalizeBookCode(selectedBook)}_${selectedChapter}_${selectedVerse}`;
      
      const { error } = await supabase
        .from('study_notes')
        .upsert({
          user_id: user.id,
          verse_ref: verseRef,
          book: normalizeBookCode(selectedBook),
          chapter: selectedChapter,
          verse: selectedVerse,
          translation: myTranslation,
          commentary: myCommentary,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,verse_ref' });
      
      if (error) throw error;
      alert('저장되었습니다!');
    } catch (err) {
      console.error('Error saving study:', err);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSavingStudy(false);
    }
  };

  // Handle reflection like
  const handleReflectionLike = async (reflectionId: string, liked: boolean) => {
    if (!user) return;
    
    try {
      if (liked) {
        await removeLike(reflectionId);
      } else {
        await addLike(reflectionId);
      }
      
      // Reload verse data
      if (selectedVerse) {
        await loadVerseData(selectedVerse);
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  // Handle reflection comment
  const handleReflectionComment = async (reflectionId: string) => {
    if (!user || !reflectionComment.trim()) return;
    
    try {
      await addReply(reflectionId, reflectionComment);
      setReflectionComment('');
      setActiveReflectionId(null);
      
      // Reload verse data
      if (selectedVerse) {
        await loadVerseData(selectedVerse);
      }
    } catch (err) {
      console.error('Error adding comment:', err);
      alert('댓글 작성 중 오류가 발생했습니다.');
    }
  };

  // Get highlight color based on likes
  const getHighlightColor = (likes: number) => {
    if (likes >= 100) return 'bg-pink-50 border-pink-200';
    if (likes >= 50) return 'bg-green-50 border-green-200';
    if (likes >= 10) return 'bg-amber-50 border-amber-200';
    return 'bg-white border-stone-200';
  };

  // Get Korean Bible text for verse
  const getKoreanVerseText = (verseNum: number): string => {
    const bookKey = normalizeBookCode(selectedBook);
    const chapterStr = String(selectedChapter);
    const verseStr = String(verseNum);
    const verseRef = `${bookKey}_${chapterStr}_${verseStr}`;
    const text = koreanBibleData[verseRef];
    if (!text) {
      console.log(`[KRV] Not found for key: ${verseRef}`);
    }
    return text || '';
  };

  // Get KJV Bible text for verse
  const getKjvVerseText = (verseNum: number): string => {
    const bookKey = normalizeBookCode(selectedBook);
    const chapterStr = String(selectedChapter);
    const verseStr = String(verseNum);
    const verseRef = `${bookKey}_${chapterStr}_${verseStr}`;
    const text = kjvBibleData[verseRef];
    if (!text) {
      console.log(`[KJV] Not found for key: ${verseRef}, loaded keys:`, Object.keys(kjvBibleData).slice(0, 5));
    }
    return text || '';
  };

  // Get NET Bible text for verse
  const getNetVerseText = (verseNum: number): string => {
    const bookKey = normalizeBookCode(selectedBook);
    const chapterStr = String(selectedChapter);
    const verseStr = String(verseNum);
    const verseRef = `${bookKey}_${chapterStr}_${verseStr}`;
    // NET 데이터가 비어있거나 없는 경우 안전하게 빈 문자열 반환
    if (!netBibleData || Object.keys(netBibleData).length === 0) {
      return '';
    }
    const text = netBibleData[verseRef];
    if (!text) {
      console.log(`[NET] Not found for key: ${verseRef}`);
    }
    return text || '';
  };

  // Load chapter-level commentary and reflections
  const loadChapterData = async () => {
    if (!selectedBook) return;
    const chapterRef = `${normalizeBookCode(selectedBook)}_${selectedChapter}`;

    try {
      const supabase = getSupabase();

      // Load admin chapter commentary
      const { data: commentaryData } = await supabase
        .from('chapter_commentaries')
        .select('content')
        .eq('chapter_ref', chapterRef)
        .eq('is_admin', true)
        .single();

      if (commentaryData) {
        setChapterCommentary(commentaryData.content);
      } else {
        setChapterCommentary('');
      }

      // Load community chapter reflections
      const { data: reflections, error } = await supabase
        .from('reflections')
        .select(`
          id, user_id, content, created_at, likes,
          profiles:profiles(nickname, email, tier)
        `)
        .eq('chapter_ref', chapterRef)
        .eq('is_public', true)
        .is('verse_ref', null)
        .order('created_at', { ascending: false });

      if (!error && reflections) {
        const reflectionsWithLikes = await Promise.all(
          reflections.map(async (ref: any) => {
            const likeCount = await getLikesCount(ref.id);
            const hasLiked = user ? await hasUserLiked(ref.id) : false;
            return { ...ref, likes: likeCount, liked: hasLiked };
          })
        );
        setChapterReflections(reflectionsWithLikes);
      }
    } catch (err) {
      console.error('Error loading chapter data:', err);
    }
  };

  // Load chapter data when book/chapter changes
  useEffect(() => {
    loadChapterData();
  }, [selectedBook, selectedChapter]);

  useEffect(() => {
    if (user) {
      getMyProfile().then(setProfile).catch(console.error);
    }
    getGlobalNotice().then(setGlobalNotice).catch(console.error);
  }, [user]);

  const isLoggedIn = !!user;
  const userRole = profile?.tier || '준회원';
  const userName = profile?.nickname || user?.email?.split('@')[0] || '게스트';
  // 권한 체크 (프로필 기반)
  const isAdmin = profile?.is_admin === true || userRole === '관리자';
  const isTranslator = profile?.is_translator === true || isAdmin; // 관리자는 자동으로 번역자 권한

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  // Save chapter commentary (admin only)
  const handleSaveChapterCommentary = async () => {
    if (!user || !isAdmin) return;
    const chapterRef = `${normalizeBookCode(selectedBook)}_${selectedChapter}`;

    try {
      const supabase = getSupabase();
      await supabase
        .from('chapter_commentaries')
        .upsert({
          chapter_ref: chapterRef,
          book: normalizeBookCode(selectedBook),
          chapter: selectedChapter,
          content: editingChapterCommentary,
          is_admin: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'chapter_ref' });

      setChapterCommentary(editingChapterCommentary);
      setShowChapterCommentaryEdit(false);
      alert('장 주석이 저장되었습니다.');
    } catch (err) {
      console.error('Error saving chapter commentary:', err);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  // Post chapter reflection (community)
  const handlePostChapterReflection = async () => {
    if (!user || !newChapterReflection.trim()) return;
    const chapterRef = `${normalizeBookCode(selectedBook)}_${selectedChapter}`;

    try {
      const supabase = getSupabase();
      await supabase.from('reflections').insert({
        user_id: user.id,
        chapter_ref: chapterRef,
        book: normalizeBookCode(selectedBook),
        chapter: selectedChapter,
        content: newChapterReflection,
        is_public: true
      });

      setNewChapterReflection('');
      await loadChapterData();
    } catch (err) {
      console.error('Error posting chapter reflection:', err);
      alert('묵상 작성 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#faf9f7]">
      {/* Global Notice Banner */}
      {globalNotice && (
        <div className="px-4 py-2 bg-amber-100 border-b border-amber-200 text-center">
          <p className="text-sm text-amber-800 font-medium">📢 {globalNotice}</p>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-stone-100 border-b border-stone-200">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <a href="/" className="p-2 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors">
            <ArrowLeft className="w-5 h-5 text-amber-700" />
          </a>
          <div>
            <h1 className="text-lg font-serif font-bold text-stone-800">
              성경 원어 연구소
            </h1>
            <p className="text-xs text-stone-500">
              헬라어 신약 성경 연구와 묵상
            </p>
          </div>
        </div>

        {/* Desktop External Links */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="https://naver.me/xXnPSav8"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-stone-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            기독교 커뮤니티
          </a>
          <a
            href="https://sermon-archive.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-stone-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            설교 아카이브
          </a>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-stone-600 hover:bg-stone-200 rounded-lg"
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
                {isAdmin ? '👑 ' : ''}{userName}
              </a>
              {isAdmin && (
                <a
                  href="/admin"
                  className="text-xs text-amber-600 hover:text-amber-700 underline mr-2"
                >
                  관리자
                </a>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>로그아웃</span>
              </button>
            </div>
          ) : (
            <a
              href="/login"
              className="flex items-center gap-2 px-3 py-1.5 bg-stone-700 text-white rounded-lg text-sm hover:bg-stone-600 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              로그인
            </a>
          )}
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-stone-100 border-b border-stone-200 px-4 py-3 space-y-2">
          <a
            href="https://naver.me/xXnPSav8"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-stone-600 hover:text-amber-700 py-2"
          >
            <ExternalLink className="w-4 h-4" />
            기독교 커뮤니티
          </a>
          <a
            href="https://sermon-archive.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-stone-600 hover:text-blue-700 py-2"
          >
            <ExternalLink className="w-4 h-4" />
            설교 아카이브
          </a>
          <a
            href="/"
            className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-800 py-2"
          >
            <ArrowLeft className="w-4 h-4" />
            홈으로
          </a>
          <div className="border-t border-stone-200 pt-2">
            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-stone-600 hover:text-red-600 py-2"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            ) : (
              <a
                href="/login"
                className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-800 py-2"
              >
                <LogIn className="w-4 h-4" />
                로그인
              </a>
            )}
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-center">
          <p className="text-sm text-red-600">
            성경 데이터를 불러오는 중 오류가 발생했습니다: {error}
          </p>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel - Bible Navigation & Text */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header with Testament Toggle */}
          <div className="p-4 border-b border-stone-200 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-lg font-serif font-bold text-stone-800">
                카시키아쿰 말씀 나눔터(원어)
              </h1>
              {/* Testament Toggle */}
              <div className="flex bg-stone-100 rounded-lg p-1">
                <button
                  onClick={() => {
                    setTestament('OT');
                    setSelectedBook(OT_BOOKS[0]);
                    setSelectedChapter(1);
                    setExpandedBooks(new Set());
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    testament === 'OT'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  구약 (히브리어)
                </button>
                <button
                  onClick={() => {
                    setTestament('NT');
                    setSelectedBook(NT_BOOKS[0]);
                    setSelectedChapter(1);
                    setExpandedBooks(new Set());
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    testament === 'NT'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  신약 (헬라어)
                </button>
              </div>
            </div>

            {/* Book & Chapter Selector */}
            <div className="flex items-center gap-2">
              <select
                value={selectedBook}
                onChange={(e) => {
                  setSelectedBook(e.target.value);
                  setSelectedChapter(1);
                }}
                className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {(testament === 'OT' ? OT_BOOKS : NT_BOOKS).map(book => (
                  <option key={book} value={book}>
                    {BOOK_NAMES_KR[book]}
                  </option>
                ))}
              </select>
              
              <select
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(parseInt(e.target.value))}
                className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {getChapters().map(ch => (
                  <option key={ch} value={ch}>
                    {ch}장
                  </option>
                ))}
              </select>
              
              <span className="text-stone-500 text-sm ml-2">
                {Object.keys(getVerses()).length}절
              </span>
            </div>
          </div>

          {/* Bible Text Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-stone-50">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full" />
              </div>
            ) : error ? (
              <div className="text-red-500 text-center p-8">{error}</div>
            ) : !bibleData ? (
              <div className="flex items-center justify-center h-full text-stone-500">
                <div className="text-center">
                  <p className="text-lg mb-2">데이터를 불러오는 중이거나</p>
                  <p className="text-lg">해당 장의 데이터가 없습니다.</p>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-8">
                {/* ========== 장 단위 헤더 (최상단) ========== */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-200">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-amber-100">
                    <BookOpen className="w-5 h-5 text-amber-600" />
                    <h2 className="text-lg font-bold text-stone-800">
                      {BOOK_NAMES_KR[selectedBook]} {selectedChapter}장
                    </h2>
                  </div>

                  {/* A. 장 강해/주석 - 관리자 전용 작성/수정 */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-amber-700 flex items-center gap-1">
                        <BookMarked className="w-4 h-4" />
                        장 강해 / 주석 (Admin)
                      </h3>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setEditingChapterCommentary(chapterCommentary);
                            setShowChapterCommentaryEdit(!showChapterCommentaryEdit);
                          }}
                          className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors"
                        >
                          {showChapterCommentaryEdit ? '취소' : (chapterCommentary ? '수정' : '작성')}
                        </button>
                      )}
                    </div>

                    {showChapterCommentaryEdit && isAdmin ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingChapterCommentary}
                          onChange={(e) => setEditingChapterCommentary(e.target.value)}
                          className="w-full p-3 text-sm border border-amber-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
                          rows={6}
                          placeholder="이 장에 대한 강해와 주석을 작성하세요..."
                        />
                        <button
                          onClick={handleSaveChapterCommentary}
                          className="w-full py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors"
                        >
                          저장하기
                        </button>
                      </div>
                    ) : (
                      <div className="bg-amber-50/50 rounded-lg p-4">
                        {chapterCommentary ? (
                          <div className="text-stone-800 text-sm leading-relaxed whitespace-pre-wrap">
                            {chapterCommentary}
                          </div>
                        ) : (
                          <p className="text-stone-400 text-sm italic">
                            {isAdmin ? '관리자만 작성할 수 있는 장 주석 영역입니다.' : '아직 등록된 장 주석이 없습니다.'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* B. 장 묵상 나눔 - 동역자 피드 */}
                  <div>
                    <h3 className="text-sm font-bold text-blue-700 flex items-center gap-1 mb-3">
                      <MessageSquare className="w-4 h-4" />
                      장 묵상 나눔 ({chapterReflections.length}개)
                    </h3>

                    {/* New reflection input */}
                    {isLoggedIn && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <textarea
                          value={newChapterReflection}
                          onChange={(e) => setNewChapterReflection(e.target.value)}
                          className="w-full p-2 text-sm border border-blue-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={2}
                          placeholder="이 장에 대한 묵상을 나눠보세요..."
                        />
                        <button
                          onClick={handlePostChapterReflection}
                          disabled={!newChapterReflection.trim()}
                          className="mt-2 w-full py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          <Send className="w-3 h-3 inline mr-1" />
                          묵상 남기기
                        </button>
                      </div>
                    )}

                    {/* Reflections list */}
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {chapterReflections.length === 0 ? (
                        <p className="text-stone-400 text-sm text-center py-4">
                          아직 이 장에 대한 묵상이 없습니다. 첫 번째 묵상을 남겨보세요!
                        </p>
                      ) : (
                        chapterReflections.map((reflection: any) => (
                          <div key={reflection.id} className="p-3 bg-stone-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-stone-600">
                                {reflection.profiles?.nickname || reflection.profiles?.email?.split('@')[0] || '익명'}
                              </span>
                              <span className="text-xs text-stone-400">
                                {new Date(reflection.created_at).toLocaleDateString('ko-KR')}
                              </span>
                            </div>
                            <p className="text-sm text-stone-800">{reflection.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* ========== 구절(Verse) 렌더링 시작 ========== */}
                {Object.entries(getVerses()).map(([verseNum, words]) => {
                  const isHebrew = testament === 'OT';
                  const verseNumber = parseInt(verseNum);
                  const isExpanded = expandedStudyVerses.has(verseNumber);
                  const krvText = getKoreanVerseText(verseNumber);
                  const kjvText = getKjvVerseText(verseNumber);
                  const netText = getNetVerseText(verseNumber);

                  return (
                    <div key={verseNum} className="bg-white rounded-xl p-6 shadow-sm border border-stone-100">
                      {/* 절 번호 */}
                      <div className="mb-3">
                        <span className="text-stone-400 text-sm font-medium">{verseNum}절</span>
                      </div>

                      {/* [영역 A] 원어 단어들만 표시 - 클릭 시 handleWordClick */}
                      <div
                        dir={isHebrew ? 'rtl' : 'ltr'}
                        className={`leading-relaxed ${isHebrew ? 'text-right' : 'text-left'} ${isHebrew ? 'text-2xl' : 'text-xl'} font-serif text-stone-800 mb-4`}
                      >
                        {words.map((word: any, idx: number) => (
                          <span
                            key={idx}
                            onClick={() => handleWordClick(word)}
                            className="inline-block cursor-pointer hover:bg-blue-50 px-1 py-0.5 rounded transition-colors mx-0.5"
                          >
                            <span>{word.word}</span>
                          </span>
                        ))}
                      </div>

                      {/* [영역 B] 번역문 영역 - mt-4 p-4 bg-stone-50 */}
                      <div className="mt-4 p-4 bg-stone-50 rounded-lg space-y-3">
                        {/* KRV (개역한글) */}
                        <div>
                          <p className="text-xs text-stone-500 mb-1">개역한글 (KRV)</p>
                          {krvText ? (
                            <p className="text-stone-800 leading-relaxed">{krvText}</p>
                          ) : (
                            <p className="text-amber-600 text-sm italic">
                              {loading ? '로딩 중...' : '번역 데이터를 찾을 수 없음 (KRV)'}
                            </p>
                          )}
                        </div>
                        {/* KJV */}
                        <div>
                          <p className="text-xs text-stone-500 mb-1">King James Version (KJV)</p>
                          {kjvText ? (
                            <p className="text-stone-700 text-sm leading-relaxed">{kjvText}</p>
                          ) : (
                            <p className="text-amber-600 text-sm italic">
                              {loading ? '로딩 중...' : Object.keys(kjvBibleData).length === 0 ? 'KJV 데이터 로드되지 않음' : `번역 데이터를 찾을 수 없음 (KJV: ${selectedBook}_${selectedChapter}_${verseNum})`}
                            </p>
                          )}
                        </div>
                        {/* NET */}
                        <div>
                          <p className="text-xs text-stone-500 mb-1">NET Bible</p>
                          {netText ? (
                            <p className="text-stone-700 text-sm leading-relaxed">{netText}</p>
                          ) : (
                            <p className="text-amber-600 text-sm italic">
                              {loading ? '로딩 중...' : Object.keys(netBibleData).length === 0 ? 'NET 데이터 로드되지 않음' : `번역 데이터를 찾을 수 없음 (NET: ${selectedBook}_${selectedChapter}_${verseNum})`}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* [영역 C] 묵상 나눔 - 3단 레이아웃 */}
                      <div className="mt-4">
                        <button
                          onClick={() => {
                            const newExpanded = new Set(expandedStudyVerses);
                            if (isExpanded) {
                              newExpanded.delete(verseNumber);
                            } else {
                              newExpanded.add(verseNumber);
                            }
                            setExpandedStudyVerses(newExpanded);
                          }}
                          className="w-full flex items-center justify-between py-2 px-3 bg-purple-50 hover:bg-purple-100 border border-purple-100 rounded-lg transition-colors"
                        >
                          <span className="text-sm font-medium text-purple-700 flex items-center gap-1">
                            <BookMarked className="w-4 h-4" />
                            묵상 나눔
                          </span>
                          <ChevronDown
                            className={`w-5 h-5 text-purple-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>

                        {isExpanded && (
                          <div className="mt-3 space-y-4">
                            {/* === A. 동역자 사역(개인 번역) === */}
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-bold text-blue-700 flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3" />
                                  A. 동역자 사역 (개인 번역)
                                </h4>
                                {!isTranslator && (
                                  <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded">번역자 전용</span>
                                )}
                              </div>

                              {/* 번역자가 아닌 경우 안내 문구 */}
                              {!isTranslator && (
                                <div className="p-3 bg-amber-50/50 rounded border border-amber-100 mb-3">
                                  <p className="text-xs text-amber-700">
                                    승인된 동역자만 번역에 참여할 수 있습니다.
                                  </p>
                                </div>
                              )}

                              {/* Translation list - Read-only for all users */}
                              <div className="space-y-2">
                                {/* TODO: Load verse translations from Supabase */}
                                <div className="flex gap-3 p-2 bg-white rounded border border-blue-100">
                                  <div className="w-16 flex-shrink-0">
                                    <span className="text-xs font-medium text-blue-600">@translator1</span>
                                  </div>
                                  <p className="text-sm text-stone-800 flex-1">이 구절의 개인적 번역 예시입니다...</p>
                                </div>
                              </div>

                              {/* 번역 입력창 - 번역자 권한 필요 */}
                              {isTranslator ? (
                                <div className="mt-3 pt-3 border-t border-blue-200">
                                  <textarea
                                    className="w-full p-2 text-sm border border-blue-200 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows={2}
                                    placeholder={`${verseNum}절 개인 번역을 입력하세요...`}
                                  />
                                  <button className="mt-2 w-full py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
                                    번역 제출
                                  </button>
                                </div>
                              ) : (
                                <p className="text-xs text-blue-600/70 text-center mt-3 italic">
                                  {chapterReflections.filter((r: any) => r.category === 'translation').length === 0
                                    ? '첫 번역을 남겨주세요 (번역자 권한 필요)'
                                    : '동역자 번역 리스트 (Read-only)'}
                                </p>
                              )}
                            </div>

                            {/* === B. 관리자 주석 (Admin Commentary) === */}
                            <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-bold text-amber-700 flex items-center gap-1">
                                  <BookMarked className="w-3 h-3" />
                                  B. 관리자 주석 (Admin Commentary)
                                </h4>
                                {isAdmin && (
                                  <button className="text-xs px-2 py-1 bg-amber-200 text-amber-800 rounded hover:bg-amber-300">
                                    작성/수정
                                  </button>
                                )}
                              </div>

                              {/* 관리자 주석 내용 - 모든 유저에게 Read-only로 표시 */}
                              <div className="p-3 bg-white rounded border border-amber-100 min-h-[80px]">
                                {/* TODO: Load verse-specific admin commentary */}
                                <p className="text-sm text-stone-600 italic">
                                  아직 관리자 주석이 등록되지 않았습니다.
                                </p>
                              </div>

                              {/* 관리자용 입력창 - 관리자 권한 필요 */}
                              {isAdmin && (
                                <div className="mt-3 pt-3 border-t border-amber-200">
                                  <textarea
                                    className="w-full p-2 text-sm border border-amber-200 rounded resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    rows={3}
                                    placeholder={`${verseNum}절 관리자 주석을 입력하세요...`}
                                  />
                                  <button className="mt-2 w-full py-1.5 bg-amber-600 text-white text-xs rounded hover:bg-amber-700">
                                    주석 저장
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* === C. 동역자 묵상 나눔 === */}
                            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                              <h4 className="text-xs font-bold text-emerald-700 mb-3 flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                C. 동역자 묵상 나눔
                              </h4>
                              {/* Reflection input */}
                              {isLoggedIn && (
                                <div className="mb-3">
                                  <textarea
                                    className="w-full p-2 text-sm border border-emerald-200 rounded resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    rows={2}
                                    placeholder={`${verseNum}절에 대한 묵상을 나눠보세요...`}
                                  />
                                  <button className="mt-2 w-full py-1.5 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700">
                                    <Send className="w-3 h-3 inline mr-1" />
                                    묵상 공유하기
                                  </button>
                                </div>
                              )}
                              {/* Community reflections */}
                              <div className="space-y-2">
                                {/* TODO: Load verse reflections from Supabase */}
                                <div className="p-2 bg-white rounded border border-emerald-100">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-emerald-600">@disciple1</span>
                                    <span className="text-xs text-stone-400">2026.04.28</span>
                                  </div>
                                  <p className="text-sm text-stone-700">이 구절을 묵상하며 느낀 점을 나눕니다...</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Study Notes */}
        <div className="hidden lg:block w-96 border-l border-stone-200 bg-white overflow-y-auto">
          <div className="p-4">
            <h2 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
              <BookMarked className="w-5 h-5" />
              단어 연구 노트
            </h2>
            
            {!selectedWord ? (
              <div className="text-stone-500 text-center py-8">
                <Info className="w-12 h-12 mx-auto mb-3 text-stone-300" />
                <p>왼쪽 본문의 단어를 클릭하면<br />상세한 사전 정보가 여기에 표시됩니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Word Card - Professional Layout */}
                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
                  {/* Card Header: [원어/발음] */}
                  <div className="p-4 bg-stone-50 border-b border-stone-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-baseline gap-2">
                        <span className="font-greek text-2xl font-bold text-stone-800">
                          {selectedWord.word}
                        </span>
                        {selectedWord.translit && (
                          <span className="text-sm text-stone-500">
                            /{selectedWord.translit}/
                          </span>
                        )}
                      </div>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
                        {normalizeStrongCode(selectedWord.strong)}
                      </span>
                    </div>
                    {selectedWord.lemma && selectedWord.lemma !== selectedWord.word && (
                      <div className="text-xs text-stone-400">
                        원형: <span className="font-greek">{selectedWord.lemma}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Body - Reordered Layout */}
                  <div className="p-4 space-y-4">
                    {/* [한글 뜻] - 상단 파란색 강조 */}
                    <div className="pb-3 border-b border-stone-100">
                      <p className="text-xs text-stone-400 mb-1">한글 의미</p>
                      <p className="text-lg font-medium text-blue-600 leading-relaxed">
                        {getKoreanMeaning(selectedWord.strong) || '사전 데이터 없음'}
                      </p>
                    </div>

                    {/* [영어 뜻] - 중단 회색 박스 */}
                    {(selectedWord.translation || selectedWord.meaning || getLexiconEntry(selectedWord.strong)?.brief_def) && (
                      <div className="pb-3 border-b border-stone-100">
                        <p className="text-xs text-stone-400 mb-1">영어 의미</p>
                        <div className="bg-stone-100 rounded-lg p-3">
                          <p className="text-sm text-stone-600 leading-relaxed">
                            {selectedWord.translation || selectedWord.meaning || getLexiconEntry(selectedWord.strong)?.brief_def || getLexiconEntry(selectedWord.strong)?.full_def}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* [문법(한/영병기)] */}
                    {selectedWord.grammar && (
                      <div className="pb-3 border-b border-stone-100">
                        <p className="text-xs text-stone-400 mb-1">문법 정보</p>
                        <p className="text-sm text-stone-800 font-mono">
                          [{decodeMorphology(selectedWord.grammar).raw}
                          <span className="text-stone-500">
                            {' '}({decodeMorphology(selectedWord.grammar).korean})
                          </span>
                          ]
                        </p>
                      </div>
                    )}

                    {/* [원형(Lemma)] - 하단 */}
                    {selectedWord.lemma && (
                      <div>
                        <p className="text-xs text-stone-400 mb-1">어원 (Lemma)</p>
                        <p className="text-sm">
                          <span className="font-greek text-stone-800">{selectedWord.lemma}</span>
                          {selectedWord.lemma_translit && (
                            <span className="text-stone-500 ml-2">/{selectedWord.lemma_translit}/</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Save to Vocabulary Button */}
                {user && (
                  <button
                    className="w-full py-2 px-4 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors flex items-center justify-center gap-2"
                    onClick={() => {
                      alert('단어장 저장 기능은 곧 추가됩니다!');
                    }}
                  >
                    <BookmarkPlus className="w-4 h-4" />
                    단어장에 저장
                  </button>
                )}

                {/* Word Study Notes Form */}
                <div className="border-t border-stone-200 pt-4">
                  <h4 className="font-medium text-stone-700 mb-2">나의 묵상</h4>
                  <textarea
                    className="w-full h-32 p-3 border border-stone-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="이 단어에 대한 나의 묵상을 적어보세요..."
                  />
                  <button className="mt-2 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    저장
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>


      {/* Verse Detail Modal */}
      {verseDetailOpen && selectedVerse && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div>
                <h2 className="text-xl font-bold text-stone-800">
                  {BOOK_NAMES_KR[selectedBook]} {selectedChapter}장 {selectedVerse}절
                </h2>
                <p className="text-sm text-stone-500">상세 연구 뷰</p>
              </div>
              <button
                onClick={() => setVerseDetailOpen(false)}
                className="p-2 hover:bg-stone-200 rounded-full transition-colors"
              >
                <XCircle className="w-6 h-6 text-stone-500" />
              </button>
            </div>

            {/* Modal Content - Single Column Vertical Layout */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 1. Korean Bible (KRV) */}
              <div className="bg-stone-50 rounded-xl p-5 border border-stone-200">
                <h3 className="text-sm font-bold text-stone-700 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  개역한글
                </h3>
                <p className="text-stone-800 leading-relaxed text-lg">
                  {getKoreanVerseText(selectedVerse) || '개역한글 성경 데이터가 없습니다.'}
                </p>
              </div>

              {/* 2. Personal Translation */}
              {user && (
                <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                  <h3 className="text-sm font-bold text-blue-800 mb-4 flex items-center gap-2">
                    <BookmarkPlus className="w-4 h-4" />
                    나의 번역 (Personal Translation)
                  </h3>
                  <textarea
                    value={myTranslation}
                    onChange={(e) => setMyTranslation(e.target.value)}
                    className="w-full mt-1 p-3 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    placeholder="이 구절에 대한 나만의 번역을 적어보세요..."
                  />
                  <button
                    onClick={handleSaveStudy}
                    disabled={savingStudy}
                    className="mt-3 w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {savingStudy ? '저장 중...' : '💾 저장하기'}
                  </button>
                </div>
              )}

              {/* 3. Commentary */}
              {user && (
                <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-200">
                  <h3 className="text-sm font-bold text-emerald-800 mb-4 flex items-center gap-2">
                    <BookMarked className="w-4 h-4" />
                    공식 주석 (Commentary)
                  </h3>
                  <textarea
                    value={myCommentary}
                    onChange={(e) => setMyCommentary(e.target.value)}
                    className="w-full mt-1 p-3 border border-emerald-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    rows={3}
                    placeholder="이 구절에 대한 주석을 적어보세요..."
                  />
                  <button
                    onClick={handleSaveStudy}
                    disabled={savingStudy}
                    className="mt-3 w-full py-2 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {savingStudy ? '저장 중...' : '💾 저장하기'}
                  </button>
                </div>
              )}

              {/* 4. Admin PIN Reflections */}
              <div>
                <h3 className="text-sm font-bold text-stone-700 mb-4 flex items-center gap-2">
                  <Crown className="w-4 h-4" />
                  관리자 PIN 묵상
                </h3>
                {verseReflections.filter((r: any) => r.is_pinned).length === 0 ? (
                  <p className="text-stone-400 text-center py-4 text-sm">관리자가 고정한 묵상이 없습니다.</p>
                ) : (
                  <div className="space-y-3">
                    {verseReflections.filter((r: any) => r.is_pinned).map((reflection: any) => (
                      <ReflectionCard key={reflection.id} reflection={reflection} />
                    ))}
                  </div>
                )}
              </div>

              {/* 5. Community Reflections */}
              <div>
                <h3 className="text-sm font-bold text-stone-700 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  동역자들의 묵상 ({verseReflections.filter((r: any) => !r.is_pinned).length}개)
                </h3>
                {verseReflections.filter((r: any) => !r.is_pinned).length === 0 ? (
                  <p className="text-stone-400 text-center py-8 text-sm">
                    아직 이 구절에 대한 묵상이 없습니다.<br/>
                    첫 번째 묵상을 남겨보세요!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {verseReflections.filter((r: any) => !r.is_pinned).map((reflection: any) => (
                      <ReflectionCard key={reflection.id} reflection={reflection} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-200 bg-stone-50">
              <button
                onClick={() => setVerseDetailOpen(false)}
                className="w-full py-2 px-4 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
