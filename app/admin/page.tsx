'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  checkIsAdmin, 
  getAdminUserStats, 
  AdminUserStats, 
  getPublicReflections,
  getMyStudyNotes,
  getAllStudyNotesForBook,
  StudioReflection,
  signOut,
  getSupabase
} from '@/app/lib/supabase';
import { Crown, Loader2, LogOut, Users, BookOpen, User, ArrowLeft, Calendar, BookMarked } from 'lucide-react';

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

type Tab = 'users' | 'book-archive' | 'user-archive' | 'upgrade-requests' | 'delete-requests';

interface UserActivity {
  reflections: StudioReflection[];
  notes: any[];
  bookStats: { [book: string]: number };
  monthlyStats: { [month: string]: number };
  totalReflections: number;
  totalNotes: number;
  favoriteBook: string;
  mostActiveMonth: string;
}

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  
  // Approval states
  const [upgradeRequests, setUpgradeRequests] = useState<any[]>([]);
  const [deleteRequests, setDeleteRequests] = useState<any[]>([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  
  // User Management
  const [userStats, setUserStats] = useState<AdminUserStats[]>([]);
  const [updatingTier, setUpdatingTier] = useState<string | null>(null);
  
  // Book Archive
  const [selectedBook, setSelectedBook] = useState('Matt');
  const [bookData, setBookData] = useState<{ [chapter: number]: { reflections: StudioReflection[]; notes: any[] } }>({});
  const [loadingBook, setLoadingBook] = useState(false);
  
  // User Archive
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUserStats | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivity | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  // Check admin access
  useEffect(() => {
    const checkAccess = async () => {
      setCheckingAdmin(true);
      const admin = await checkIsAdmin();
      setIsAdmin(admin);
      setCheckingAdmin(false);
      
      if (!admin) {
        alert('관리자 권한이 필요합니다.');
        router.push('/');
      }
    };
    checkAccess();
  }, [router]);

  // Load user stats
  useEffect(() => {
    if (isAdmin && activeTab === 'users') {
      loadUserStats();
    }
  }, [isAdmin, activeTab]);

  // Load book archive
  useEffect(() => {
    if (isAdmin && activeTab === 'book-archive') {
      loadBookArchive();
    }
  }, [isAdmin, activeTab, selectedBook]);
  
  // Load upgrade requests
  useEffect(() => {
    if (isAdmin && activeTab === 'upgrade-requests') {
      loadUpgradeRequests();
    }
  }, [isAdmin, activeTab]);
  
  // Load delete requests
  useEffect(() => {
    if (isAdmin && activeTab === 'delete-requests') {
      loadDeleteRequests();
    }
  }, [isAdmin, activeTab]);

  // Load user archive from URL param
  useEffect(() => {
    const userId = searchParams.get('user');
    if (userId && isAdmin) {
      setSelectedUserId(userId);
      setActiveTab('user-archive');
      loadUserArchive(userId);
    }
  }, [searchParams, isAdmin]);

  const loadUserStats = async () => {
    setLoading(true);
    try {
      const stats = await getAdminUserStats();
      setUserStats(stats);
    } catch (err) {
      console.error('Error loading user stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBookArchive = async () => {
    setLoadingBook(true);
    const bookInfo = books.find(b => b.id === selectedBook);
    if (!bookInfo) {
      console.error('[loadBookArchive] Book not found:', selectedBook);
      setLoadingBook(false);
      return;
    }

    console.log('[loadBookArchive] Loading book:', bookInfo.name, 'chapters:', bookInfo.chapters);

    try {
      const allData: { [chapter: number]: { reflections: StudioReflection[]; notes: any[] } } = {};
      
      // Load all study notes for this book at once (using Korean book name)
      console.log('[loadBookArchive] Fetching study notes for book:', bookInfo.name);
      const allNotes = await getAllStudyNotesForBook(bookInfo.name);
      console.log('[loadBookArchive] Retrieved', allNotes.length, 'study notes');
      
      // Load reflections per chapter (still need verse_ref pattern)
      const chapterPromises = Array.from({ length: bookInfo.chapters }, (_, i) => i + 1).map(async (chapter) => {
        const verseRef = `${selectedBook} ${chapter}`;
        const reflectionsResult = await getPublicReflections(verseRef, 1, 100);
        
        // Filter notes for this chapter
        const chapterNotes = allNotes.filter(note => note.chapter === chapter);
        
        allData[chapter] = {
          reflections: reflectionsResult.data,
          notes: chapterNotes
        };
      });
      
      await Promise.all(chapterPromises);
      console.log('[loadBookArchive] Loaded data for', Object.keys(allData).length, 'chapters');
      setBookData(allData);
    } catch (err) {
      console.error('[loadBookArchive] Error loading book archive:', err);
    } finally {
      setLoadingBook(false);
    }
  };

  // Load upgrade requests
  const loadUpgradeRequests = async () => {
    setLoadingApprovals(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, nickname, username, tier, upgrade_requested, created_at')
        .eq('upgrade_requested', true);
      
      if (error) {
        console.error('Error loading upgrade requests:', error);
        return;
      }
      setUpgradeRequests(data || []);
    } catch (err) {
      console.error('Error loading upgrade requests:', err);
    } finally {
      setLoadingApprovals(false);
    }
  };

  // Load delete requests
  const loadDeleteRequests = async () => {
    setLoadingApprovals(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('reflections')
        .select('*, profiles(nickname, email)')
        .eq('delete_requested', true);
      
      if (error) {
        console.error('Error loading delete requests:', error);
        return;
      }
      setDeleteRequests(data || []);
    } catch (err) {
      console.error('Error loading delete requests:', err);
    } finally {
      setLoadingApprovals(false);
    }
  };

  // Approve upgrade request
  const handleApproveUpgrade = async (userId: string) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.rpc('admin_update_tier', {
        target_id: userId,
        new_tier: '⭐⭐'
      });
      
      if (error) {
        console.error('Error approving upgrade:', error);
        alert('등업 승인 중 오류가 발생했습니다.');
        return;
      }
      
      // Also reset upgrade_requested flag
      await supabase.from('profiles').update({ upgrade_requested: false }).eq('id', userId);
      
      alert('등업이 승인되었습니다. 사용자 등급이 ⭐⭐(Regular)로 변경되었습니다.');
      await loadUpgradeRequests();
    } catch (err) {
      console.error('Error approving upgrade:', err);
      alert('등업 승인 중 오류가 발생했습니다.');
    }
  };

  // Approve delete request
  const handleApproveDelete = async (postId: string) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('reflections').delete().eq('id', postId);
      
      if (error) {
        console.error('Error deleting post:', error);
        alert('삭제 승인 중 오류가 발생했습니다.');
        return;
      }
      
      alert('글이 삭제되었습니다.');
      await loadDeleteRequests();
    } catch (err) {
      console.error('Error approving delete:', err);
      alert('삭제 승인 중 오류가 발생했습니다.');
    }
  };

  // Reject delete request
  const handleRejectDelete = async (postId: string) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('reflections')
        .update({ delete_requested: false })
        .eq('id', postId);
      
      if (error) {
        console.error('Error rejecting delete:', error);
        alert('반려 처리 중 오류가 발생했습니다.');
        return;
      }
      
      alert('삭제 요청이 반려되었습니다.');
      await loadDeleteRequests();
    } catch (err) {
      console.error('Error rejecting delete:', err);
      alert('반려 처리 중 오류가 발생했습니다.');
    }
  };

  const loadUserArchive = async (userId: string) => {
    setLoadingUser(true);
    try {
      // Find user info
      const user = userStats.find(u => u.id === userId) || await fetchUserInfo(userId);
      setSelectedUser(user || null);
      
      // Fetch all reflections by this user
      const supabase = getSupabase();
      const { data: reflections, error: refError } = await supabase
        .from('reflections')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (refError) throw refError;
      
      // Fetch all study notes by this user
      const { data: notes, error: noteError } = await supabase
        .from('study_notes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (noteError) throw noteError;
      
      // Calculate stats
      const bookStats: { [book: string]: number } = {};
      const monthlyStats: { [month: string]: number } = {};
      
      [...(reflections || []), ...(notes || [])].forEach(item => {
        const book = item.book || item.verse_ref?.split(' ')[0] || 'Unknown';
        bookStats[book] = (bookStats[book] || 0) + 1;
        
        const month = item.created_at?.substring(0, 7) || 'Unknown';
        monthlyStats[month] = (monthlyStats[month] || 0) + 1;
      });
      
      const favoriteBook = Object.entries(bookStats).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
      const mostActiveMonth = Object.entries(monthlyStats).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
      
      setUserActivity({
        reflections: reflections || [],
        notes: notes || [],
        bookStats,
        monthlyStats,
        totalReflections: reflections?.length || 0,
        totalNotes: notes?.length || 0,
        favoriteBook,
        mostActiveMonth
      });
    } catch (err) {
      console.error('Error loading user archive:', err);
    } finally {
      setLoadingUser(false);
    }
  };

  const fetchUserInfo = async (userId: string): Promise<AdminUserStats | null> => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, nickname, tier, created_at')
      .eq('id', userId)
      .single();
    
    if (error || !data) return null;
    
    return {
      ...data,
      total_reflections: 0,
      total_notes: 0
    } as AdminUserStats;
  };

  const handleTierChange = async (userId: string, newTier: string) => {
    setUpdatingTier(userId);
    try {
      const supabase = getSupabase();
      const { error } = await supabase.rpc('admin_update_tier', {
        target_id: userId,
        new_tier: newTier
      });
      
      if (error) {
        console.error('RPC error:', error);
        alert('등급 변경 실패: ' + error.message);
        return;
      }
      
      await loadUserStats();
    } catch (err) {
      console.error('Error updating tier:', err);
      alert('등급 변경 중 오류가 발생했습니다.');
    } finally {
      setUpdatingTier(null);
    }
  };

const getTierLabel = (tier: string) => {
    switch (tier) {
      case '⭐⭐⭐⭐⭐': return '⭐⭐⭐⭐⭐(Admin - 모든 권한)';
      case '⭐⭐⭐⭐': return '⭐⭐⭐⭐(Staff - 타인 글 삭제, 번역 가능)';
      case '⭐⭐⭐': return '⭐⭐⭐(Hardworking - 번역 가능)';
      case '⭐⭐': return '⭐⭐(Regular - 묵상/댓글 가능)';
      default: return '⭐(General - 읽기 전용)';
    }
  };

const getTierColor = (tier: string) => {
    switch (tier) {
      case '⭐⭐⭐⭐⭐': return 'text-purple-600 font-medium';
      case '⭐⭐⭐⭐': return 'text-blue-600 font-medium';
      case '⭐⭐⭐': return 'text-amber-600 font-medium';
      case '⭐⭐': return 'text-green-600';
      default: return 'text-stone-500';
    }
  };

  const handleUserClick = (userId: string) => {
    router.push(`/admin?user=${userId}`);
  };

  const handleBackToUsers = () => {
    setActiveTab('users');
    setSelectedUserId(null);
    setSelectedUser(null);
    setUserActivity(null);
    router.push('/admin');
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  const selectedBookData = books.find(b => b.id === selectedBook);

  if (checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-stone-400 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-stone-200 sticky top-0 z-10 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-600" />
              <h1 className="text-lg font-semibold text-stone-800">관리자 대시보드</h1>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-stone-500 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-stone-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex">
            <button
              onClick={() => { setActiveTab('users'); handleBackToUsers(); }}
              className={`px-4 py-3 text-sm border-b-2 transition-colors ${
                activeTab === 'users'
                  ? 'border-stone-800 text-stone-800 font-medium'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                가입자 관리
              </span>
            </button>
            <button
              onClick={() => setActiveTab('book-archive')}
              className={`px-4 py-3 text-sm border-b-2 transition-colors ${
                activeTab === 'book-archive'
                  ? 'border-stone-800 text-stone-800 font-medium'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                책별 통합 노트
              </span>
            </button>
            <button
              onClick={() => setActiveTab('user-archive')}
              className={`px-4 py-3 text-sm border-b-2 transition-colors ${
                activeTab === 'user-archive'
                  ? 'border-stone-800 text-stone-800 font-medium'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" />
                가입자별 아카이브
              </span>
            </button>
            <button
              onClick={() => setActiveTab('upgrade-requests')}
              className={`px-4 py-3 text-sm border-b-2 transition-colors ${
                activeTab === 'upgrade-requests'
                  ? 'border-amber-600 text-amber-600 font-medium'
                  : 'border-transparent text-stone-500 hover:text-amber-600'
              }`}
            >
              <span className="flex items-center gap-2">
                <Crown className="w-4 h-4" />
                등업 신청 관리
                {upgradeRequests.length > 0 && (
                  <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">
                    {upgradeRequests.length}
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('delete-requests')}
              className={`px-4 py-3 text-sm border-b-2 transition-colors ${
                activeTab === 'delete-requests'
                  ? 'border-red-600 text-red-600 font-medium'
                  : 'border-transparent text-stone-500 hover:text-red-600'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                삭제 요청 관리
                {deleteRequests.length > 0 && (
                  <span className="bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full">
                    {deleteRequests.length}
                  </span>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-stone-300 animate-spin" />
              </div>
            ) : (
              <div className="border border-stone-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-stone-500">이메일</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-stone-500">닉네임</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-stone-500">등급</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-stone-500">묵상</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-stone-500">노트</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-stone-500">가입일</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-stone-500">권한</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {userStats.map((user) => (
                      <tr 
                        key={user.id} 
                        className="hover:bg-stone-50 cursor-pointer"
                        onClick={() => handleUserClick(user.id)}
                      >
                        <td className="px-4 py-2 text-stone-800">{user.email}</td>
                        <td className="px-4 py-2 text-stone-600">{user.nickname || '-'}</td>
                        <td className="px-4 py-2">
                          <span className={`text-xs ${
                            getTierColor(user.tier)
                          }`}>
                            {getTierLabel(user.tier)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center text-stone-600">{user.total_reflections}</td>
                        <td className="px-4 py-2 text-center text-stone-600">{user.total_notes}</td>
                        <td className="px-4 py-2 text-stone-400 text-xs">
                          {new Date(user.created_at).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={user.tier}
                            onChange={(e) => handleTierChange(user.id, e.target.value)}
                            disabled={updatingTier === user.id}
                            className="text-xs px-2 py-1 border border-stone-200 rounded focus:outline-none focus:border-stone-400"
                          >
                            <option value="⭐⭐⭐⭐⭐">⭐⭐⭐⭐⭐(Admin)</option>
                            <option value="⭐⭐⭐⭐">⭐⭐⭐⭐(Staff)</option>
                            <option value="⭐⭐⭐">⭐⭐⭐(Hardworking)</option>
                            <option value="⭐⭐">⭐⭐(Regular)</option>
                            <option value="⭐">⭐(General)</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Book Archive Tab */}
        {activeTab === 'book-archive' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <select
                value={selectedBook}
                onChange={(e) => setSelectedBook(e.target.value)}
                className="px-3 py-1.5 text-sm border border-stone-200 rounded focus:outline-none focus:border-stone-400"
              >
                {books.map(book => (
                  <option key={book.id} value={book.id}>{book.name}</option>
                ))}
              </select>
              <span className="text-sm text-stone-500">{selectedBookData?.chapters}장</span>
            </div>

            {loadingBook ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-stone-300 animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(bookData).map(([chapter, data]) => {
                  const hasContent = data.reflections.length > 0 || data.notes.length > 0;
                  if (!hasContent) return null;

                  return (
                    <div key={chapter} className="border-l-2 border-stone-200 pl-4">
                      <h3 className="text-lg font-semibold text-stone-800 mb-3">
                        {selectedBookData?.name} {chapter}장
                      </h3>
                      
                      {Array.from({ length: 30 }, (_, i) => i + 1).map(verseNum => {
                        const verseReflections = data.reflections.filter((r: any) => r.verse === verseNum);
                        const verseNotes = data.notes.filter((n: any) => n.verse === verseNum);
                        
                        if (verseReflections.length === 0 && verseNotes.length === 0) return null;

                        return (
                          <div key={verseNum} className="mb-4">
                            <h4 className="text-sm font-medium text-stone-500 mb-2">
                              {chapter}:{verseNum}
                            </h4>
                            
                            {verseReflections.map((r: any) => (
                              <div key={r.id} className="mb-2 pl-3 border-l border-amber-300">
                                <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{r.content}</p>
                                <p className="text-xs text-stone-400 mt-1">
                                  묵상 · {new Date(r.created_at).toLocaleDateString('ko-KR')}
                                </p>
                              </div>
                            ))}
                            
                            {verseNotes.map((n: any) => (
                              <div key={n.id} className="mb-2 pl-3 border-l border-blue-300">
                                <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{n.content}</p>
                                <p className="text-xs text-stone-400 mt-1">
                                  노트 · {new Date(n.created_at).toLocaleDateString('ko-KR')}
                                </p>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                
                {Object.keys(bookData).length === 0 && (
                  <div className="text-center py-12 text-stone-400">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">이 책에 작성된 내용이 없습니다.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* User Archive Tab */}
        {activeTab === 'user-archive' && (
          <div>
            {selectedUserId ? (
              <div>
                {/* Back button */}
                <button
                  onClick={handleBackToUsers}
                  className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800 mb-4"
                >
                  <ArrowLeft className="w-4 h-4" />
                  가입자 목록으로 돌아가기
                </button>

                {loadingUser ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-stone-300 animate-spin" />
                  </div>
                ) : selectedUser && userActivity ? (
                  <div>
                    {/* User Info */}
                    <div className="border-b border-stone-200 pb-4 mb-6">
                      <h2 className="text-xl font-semibold text-stone-800 mb-1">{selectedUser.nickname || selectedUser.email}</h2>
                      <p className="text-sm text-stone-500">{selectedUser.email}</p>
                    </div>

                    {/* Activity Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="border border-stone-200 rounded p-3">
                        <p className="text-xs text-stone-500">총 묵상</p>
                        <p className="text-2xl font-semibold text-stone-800">{userActivity.totalReflections}</p>
                      </div>
                      <div className="border border-stone-200 rounded p-3">
                        <p className="text-xs text-stone-500">총 노트</p>
                        <p className="text-2xl font-semibold text-stone-800">{userActivity.totalNotes}</p>
                      </div>
                      <div className="border border-stone-200 rounded p-3">
                        <p className="text-xs text-stone-500 flex items-center gap-1">
                          <BookMarked className="w-3 h-3" />
                          주요 성경
                        </p>
                        <p className="text-lg font-medium text-stone-800">{userActivity.favoriteBook}</p>
                      </div>
                      <div className="border border-stone-200 rounded p-3">
                        <p className="text-xs text-stone-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          활동 최고월
                        </p>
                        <p className="text-lg font-medium text-stone-800">{userActivity.mostActiveMonth}</p>
                      </div>
                    </div>

                    {/* All Content */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-stone-500 border-b border-stone-200 pb-2">
                        전체 작성 내역
                      </h3>
                      
                      {[...userActivity.reflections, ...userActivity.notes]
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((item: any) => {
                          const isReflection = 'content' in item && !item.ministry_note && !item.commentary;
                          const verseRef = item.verse_ref || `${item.book} ${item.chapter}:${item.verse}`;
                          
                          return (
                            <div key={item.id} className="pl-3 border-l-2 ${isReflection ? 'border-amber-300' : 'border-blue-300'}">
                              <p className="text-xs text-stone-400 mb-1">{verseRef}</p>
                              <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{item.content || item.ministry_note || item.commentary}</p>
                              <p className="text-xs text-stone-400 mt-1">
                                {isReflection ? '묵상' : '노트'} · {new Date(item.created_at).toLocaleDateString('ko-KR')}
                              </p>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-stone-400">
                    <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>사용자 정보를 불러올 수 없습니다.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-stone-400">
                <p className="text-sm">가입자 관리 탭에서 사용자를 선택해주세요.</p>
              </div>
            )}
          </div>
        )}

        {/* Upgrade Requests Tab */}
        {activeTab === 'upgrade-requests' && (
          <div>
            <h2 className="text-lg font-semibold text-stone-800 mb-4">등업 신청 관리</h2>
            {loadingApprovals ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-stone-300 animate-spin" />
              </div>
            ) : upgradeRequests.length === 0 ? (
              <div className="text-center py-12 text-stone-400">
                <Crown className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">현재 등업 신청이 없습니다.</p>
              </div>
            ) : (
              <div className="border border-stone-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500">이메일</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500">닉네임</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500">현재 등급</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500">가입일</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-stone-500">승인</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {upgradeRequests.map((user) => (
                      <tr key={user.id} className="hover:bg-stone-50">
                        <td className="px-4 py-3 text-stone-700">{user.email}</td>
                        <td className="px-4 py-3 text-stone-700">{user.nickname || user.username || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded">
                            {user.tier || '⭐'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-stone-500 text-xs">
                          {new Date(user.created_at).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleApproveUpgrade(user.id)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors mx-auto"
                          >
                            <Crown className="w-3 h-3" />
                            등업 승인
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Delete Requests Tab */}
        {activeTab === 'delete-requests' && (
          <div>
            <h2 className="text-lg font-semibold text-stone-800 mb-4">삭제 요청 관리</h2>
            {loadingApprovals ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-stone-300 animate-spin" />
              </div>
            ) : deleteRequests.length === 0 ? (
              <div className="text-center py-12 text-stone-400">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <p className="text-sm">현재 삭제 요청이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {deleteRequests.map((post) => (
                  <div key={post.id} className="border border-stone-200 rounded-lg p-4 bg-white">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium text-stone-800">
                          {post.profiles?.nickname || post.profiles?.email?.split('@')[0] || '익명'}
                        </p>
                        <p className="text-xs text-stone-500">
                          {post.verse_ref} · {new Date(post.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRejectDelete(post.id)}
                          className="px-3 py-1.5 text-xs bg-stone-100 text-stone-600 rounded hover:bg-stone-200 transition-colors"
                        >
                          반려
                        </button>
                        <button
                          onClick={() => handleApproveDelete(post.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          삭제 승인
                        </button>
                      </div>
                    </div>
                    <div className="bg-stone-50 rounded p-3">
                      <p className="text-sm text-stone-700 whitespace-pre-wrap line-clamp-3">{post.content}</p>
                    </div>
                    {post.title && (
                      <p className="text-xs text-stone-500 mt-2">제목: {post.title}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-stone-400">로딩중...</div>
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}
