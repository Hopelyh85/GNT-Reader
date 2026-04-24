'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  checkIsAdmin, 
  getAdminUserStats, 
  AdminUserStats, 
  updateUserTier,
  getPublicReflections,
  getMyStudyNotes,
  StudioReflection,
  signOut 
} from '@/app/lib/supabase';
import { Crown, Loader2, LogOut, Users, BookOpen, ChevronDown, ArrowRightLeft } from 'lucide-react';
import { useSBLGNT } from '@/app/hooks/useSBLGNT';

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

type Tab = 'users' | 'archive';

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  
  // User Management
  const [userStats, setUserStats] = useState<AdminUserStats[]>([]);
  const [updatingTier, setUpdatingTier] = useState<string | null>(null);
  
  // Archive
  const [selectedBook, setSelectedBook] = useState('Matt');
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [reflections, setReflections] = useState<StudioReflection[]>([]);
  const [studyNotes, setStudyNotes] = useState<any[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(false);

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

  // Load archive data
  useEffect(() => {
    if (isAdmin && activeTab === 'archive') {
      loadArchiveData();
    }
  }, [isAdmin, activeTab, selectedBook, selectedChapter]);

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

  const loadArchiveData = async () => {
    setLoadingArchive(true);
    try {
      // Load reflections for this book/chapter
      const verseRef = `${selectedBook} ${selectedChapter}`;
      const result = await getPublicReflections(verseRef, 1, 100);
      setReflections(result.data);
      
      // Load study notes
      const notes = await getMyStudyNotes(verseRef, 100);
      setStudyNotes(notes);
    } catch (err) {
      console.error('Error loading archive:', err);
    } finally {
      setLoadingArchive(false);
    }
  };

  const handleTierToggle = async (userId: string, currentTier: string) => {
    const newTier = currentTier === 'Admin' ? 'General' : 'Admin';
    setUpdatingTier(userId);
    try {
      await updateUserTier(userId, newTier as any, true);
      await loadUserStats();
    } catch (err) {
      console.error('Error updating tier:', err);
      alert('권한 변경 중 오류가 발생했습니다.');
    } finally {
      setUpdatingTier(null);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  const selectedBookData = books.find(b => b.id === selectedBook);
  const chapters = selectedBookData ? Array.from({ length: selectedBookData.chapters }, (_, i) => i + 1) : [];

  if (checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Crown className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h1 className="text-xl font-serif font-bold text-stone-800">관리자 대시보드</h1>
                <p className="text-xs text-stone-500">GNT 성경 원어 연구소</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-stone-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'users'
                  ? 'border-amber-500 text-amber-700'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              <Users className="w-4 h-4" />
              가입자 관리
            </button>
            <button
              onClick={() => setActiveTab('archive')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'archive'
                  ? 'border-amber-500 text-amber-700'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              통합 연구 노트
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <h2 className="text-lg font-semibold text-stone-800 mb-4">가입자 목록</h2>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">이메일</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">닉네임</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">등급</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-stone-500 uppercase">묵상 수</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-stone-500 uppercase">사역/주석 수</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">가입일</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-stone-500 uppercase">권한 변경</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {userStats.map((user) => (
                      <tr key={user.id} className="hover:bg-stone-50">
                        <td className="px-4 py-3 text-sm text-stone-800">{user.email}</td>
                        <td className="px-4 py-3 text-sm text-stone-600">{user.nickname || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            user.tier === 'Admin' ? 'bg-purple-100 text-purple-700' :
                            user.tier === 'Hardworking' ? 'bg-blue-100 text-blue-700' :
                            user.tier === 'Regular' ? 'bg-green-100 text-green-700' :
                            'bg-stone-100 text-stone-600'
                          }`}>
                            {user.tier}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-stone-600">{user.total_reflections}</td>
                        <td className="px-4 py-3 text-sm text-center text-stone-600">{user.total_notes}</td>
                        <td className="px-4 py-3 text-sm text-stone-500">
                          {new Date(user.created_at).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleTierToggle(user.id, user.tier)}
                            disabled={updatingTier === user.id}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                              user.tier === 'Admin'
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                            }`}
                          >
                            {updatingTier === user.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <ArrowRightLeft className="w-3 h-3" />
                            )}
                            {user.tier === 'Admin' ? '일반으로' : '관리자로'}
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

        {/* Archive Tab */}
        {activeTab === 'archive' && (
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-stone-700">성경:</label>
                <select
                  value={selectedBook}
                  onChange={(e) => {
                    setSelectedBook(e.target.value);
                    setSelectedChapter(1);
                  }}
                  className="px-3 py-2 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  {books.map(book => (
                    <option key={book.id} value={book.id}>{book.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-stone-700">장:</label>
                <select
                  value={selectedChapter}
                  onChange={(e) => setSelectedChapter(Number(e.target.value))}
                  className="px-3 py-2 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  {chapters.map(ch => (
                    <option key={ch} value={ch}>{ch}장</option>
                  ))}
                </select>
              </div>
            </div>

            {loadingArchive ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Generate verses 1-30 (or actual chapter verse count) */}
                {Array.from({ length: 30 }, (_, i) => i + 1).map(verseNum => {
                  const verseReflections = reflections.filter(r => r.verse === verseNum);
                  const verseNotes = studyNotes.filter((n: any) => n.verse === verseNum);
                  
                  if (verseReflections.length === 0 && verseNotes.length === 0) return null;
                  
                  return (
                    <div key={verseNum} className="bg-white rounded-lg border border-stone-200 p-4">
                      <h3 className="text-sm font-semibold text-stone-800 mb-3">
                        {selectedBookData?.name} {selectedChapter}:{verseNum}
                      </h3>
                      
                      {/* Reflections */}
                      {verseReflections.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-xs font-medium text-amber-600 mb-2">동역자 묵상</h4>
                          <div className="space-y-2">
                            {verseReflections.map(reflection => (
                              <div key={reflection.id} className="p-3 bg-amber-50 rounded text-sm">
                                <p className="text-stone-700 whitespace-pre-wrap">{reflection.content}</p>
                                <p className="text-xs text-stone-500 mt-1">
                                  {reflection.profiles?.nickname || reflection.profiles?.email?.split('@')[0] || '익명'} · {new Date(reflection.created_at).toLocaleDateString('ko-KR')}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Study Notes */}
                      {verseNotes.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium text-blue-600 mb-2">사역/주석</h4>
                          <div className="space-y-2">
                            {verseNotes.map((note: any) => (
                              <div key={note.id} className="p-3 bg-blue-50 rounded text-sm">
                                <p className="text-stone-700 whitespace-pre-wrap">{note.content}</p>
                                <p className="text-xs text-stone-500 mt-1">
                                  {new Date(note.created_at).toLocaleDateString('ko-KR')}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {reflections.length === 0 && studyNotes.length === 0 && (
                  <div className="text-center py-12 text-stone-500">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>이 장에 작성된 내용이 없습니다.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
