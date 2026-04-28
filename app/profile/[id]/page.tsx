'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, Crown, Church, Briefcase, BookOpen, Heart,
  Loader2, User, Edit, Save, X
} from 'lucide-react';
import { useAuth } from '@/app/components/AuthProvider';
import { 
  getProfile, Profile, getUserActivity, getSupabase
} from '@/app/lib/supabase';

const TIER_MAP: Record<string, string> = { 
  general: '일반', 
  staff: '스태프', 
  manager: '매니저', 
  sub_director: '부소장', 
  director: '소장' 
};

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<{reflections: any[]; studyNotes: any[]} | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  
  // Bio editing states
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const [savingBio, setSavingBio] = useState(false);

  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const p = await getProfile(userId);
      setProfile(p);
      
      // Check if this is the current user's profile
      const currentUser = await getSupabase().auth.getUser();
      setIsCurrentUser(currentUser.data.user?.id === userId);
      
      // Load activity
      if (p) {
        setLoadingActivity(true);
        try {
          const act = await getUserActivity(userId);
          setActivity(act);
        } catch (err) {
          console.error('Error loading activity:', err);
        } finally {
          setLoadingActivity(false);
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString('ko-KR', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Check if user has staff level or above
  const isStaffOrAbove = (tier?: string | null): boolean => {
    const staffTiers = ['스태프', '매니저', '부소장', '소장', 'Staff', 'Manager', 'ViceDirector', 'Director', 'Admin'];
    if (!tier) return false;
    return staffTiers.includes(tier) || tier.includes('⭐');
  };

  // Activity category mapping
  const getKoreanCategory = (category?: string | null): string => {
    const categoryMap: Record<string, string> = {
      'general': '자유글',
      'reflection': '묵상',
      'translation': '사역',
      'prayer': '기도',
      'notice': '공지',
    };
    return category ? (categoryMap[category] || category) : '';
  };

  // Handle bio save
  const handleSaveBio = async () => {
    if (!user || !isCurrentUser) return;
    
    setSavingBio(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('profiles')
        .update({ bio: bioText, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setProfile(prev => prev ? { ...prev, bio: bioText } : null);
      setIsEditingBio(false);
    } catch (err) {
      console.error('Error saving bio:', err);
      alert('자기소개 저장에 실패했습니다.');
    } finally {
      setSavingBio(false);
    }
  };

  // Korean to English book name mapping
  const koreanToEnglishBook: Record<string, string> = {
    '창세기': 'Gen', '출애굽기': 'Exo', '레위기': 'Lev', '민수기': 'Num', '신명기': 'Deu',
    '여호수아': 'Jos', '사사기': 'Jdg', '룻기': 'Rut', '사무엘상': '1Sa', '사무엘하': '2Sa',
    '열왕기상': '1Ki', '열왕기하': '2Ki', '역대상': '1Ch', '역대하': '2Ch', '에스라': 'Ezr',
    '느헤미야': 'Neh', '에스더': 'Est', '욥기': 'Job', '시편': 'Psa', '잠언': 'Pro',
    '전도서': 'Ecc', '아가': 'Sol', '이사야': 'Isa', '예레미야': 'Jer', '예레미야애가': 'Lam',
    '에스겔': 'Eze', '다니엘': 'Dan', '호세아': 'Hos', '요엘': 'Joe', '아모스': 'Amo',
    '오바댜': 'Oba', '요나': 'Jon', '미가': 'Mic', '나훔': 'Nah', '하박국': 'Hab',
    '스바냐': 'Zep', '학개': 'Hag', '스가랴': 'Zec', '말라기': 'Mal',
    '마태복음': 'Mat', '마가복음': 'Mar', '누가복음': 'Luk', '요한복음': 'Joh',
    '사도행전': 'Act', '로마서': 'Rom', '고린도전서': '1Co', '고린도후서': '2Co',
    '갈라디아서': 'Gal', '에베소서': 'Eph', '빌립보서': 'Phi', '골로새서': 'Col',
    '데살로니가전서': '1Th', '데살로니가후서': '2Th', '디모데전서': '1Ti', '디모데후서': '2Ti',
    '디도서': 'Tit', '빌레몬서': 'Phm', '히브리서': 'Heb', '야고보서': 'Jam',
    '베드로전서': '1Pe', '베드로후서': '2Pe', '요한일서': '1Jo', '요한이서': '2Jo',
    '요한삼서': '3Jo', '유다서': 'Jud', '요한계시록': 'Rev'
  };

  // Handle activity item click with conditional routing
  const handleActivityClick = (ref: any) => {
    const category = ref.category;
    
    // Prayer category (prayer_*)
    if (category?.startsWith('prayer')) {
      router.push(`/community/prayer/${ref.id}`);
      return;
    }
    
    // General posts - go to community board
    if (category === 'general') {
      router.push('/community');
      return;
    }
    
    // Reflection or Translation - navigate to verse
    if (category === 'reflection' || category === 'translation') {
      // Try to get book, chapter, verse from various sources
      let book = ref.book;
      let chapter = ref.chapter;
      let verse = ref.verse;
      
      // If verse_ref exists, try to parse it
      if (ref.verse_ref && !book) {
        const match = ref.verse_ref.match(/^([A-Za-z0-9]+)_(\d+)_(\d+)$/);
        if (match) {
          book = match[1];
          chapter = match[2];
          verse = match[3];
        }
      }
      
      // Convert Korean book name to English if needed
      if (book && koreanToEnglishBook[book]) {
        book = koreanToEnglishBook[book];
      }
      
      // Navigate if we have all required info
      if (book && chapter && verse) {
        router.push(`/read/${book}/${chapter}/${verse}`);
        return;
      }
      
      // Fallback to scripture board
      router.push('/scripture-board');
      return;
    }
    
    // Default fallback
    router.push('/community');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="max-w-4xl mx-auto p-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-stone-600 hover:text-stone-800 mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            돌아가기
          </button>
          <div className="bg-white rounded-xl p-8 text-center">
            <User className="w-16 h-16 text-stone-300 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-stone-800 mb-2">프로필을 찾을 수 없습니다</h1>
            <p className="text-stone-500">해당 사용자의 프로필 정보가 없거나 접근할 수 없습니다.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-stone-600 hover:text-stone-800"
          >
            <ArrowLeft className="w-5 h-5" />
            돌아가기
          </button>
          {isCurrentUser && (
            <button
              onClick={() => router.push('/profile')}
              className="text-sm text-amber-600 hover:text-amber-700"
            >
              프로필 설정
            </button>
          )}
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-10 h-10 text-stone-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl font-bold text-stone-800">
                    {profile.nickname || '익명'}
                  </h1>
                  {(profile.tier?.includes('관리자') || profile.tier?.includes('Admin')) && (
                    <Crown className="w-5 h-5 text-amber-600" />
                  )}
                </div>
                
                {/* Email */}
                <p className="text-sm text-stone-500 mb-2">{profile.email || ''}</p>
                
                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {profile.show_church && profile.church_name && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                      <Church className="w-4 h-4" />
                      {profile.church_name}
                    </span>
                  )}
                  {profile.show_job && profile.job_position && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 text-sm rounded-full">
                      <Briefcase className="w-4 h-4" />
                      {profile.job_position}
                    </span>
                  )}
                  <span className="inline-flex items-center px-3 py-1 bg-stone-100 text-stone-600 text-sm rounded-full">
                    {TIER_MAP[profile.tier || ''] || profile.tier || '일반'}
                  </span>
                </div>
                
                {/* Bio Section */}
                <div className="mb-4">
                  {isEditingBio ? (
                    <div className="space-y-2">
                      <textarea
                        value={bioText}
                        onChange={(e) => setBioText(e.target.value)}
                        placeholder="자기소개를 작성하세요..."
                        className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveBio}
                          disabled={savingBio}
                          className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50"
                        >
                          {savingBio ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          저장
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingBio(false);
                            setBioText(profile.bio || '');
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-stone-200 text-stone-700 text-sm rounded-lg hover:bg-stone-300"
                        >
                          <X className="w-4 h-4" />
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <p className={`text-sm flex-1 ${profile.bio ? 'text-stone-700' : 'text-stone-400 italic'}`}>
                        {profile.bio || '아직 자기소개가 없습니다.'}
                      </p>
                      {isCurrentUser && (
                        <button
                          onClick={() => {
                            setBioText(profile.bio || '');
                            setIsEditingBio(true);
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-stone-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                        >
                          <Edit className="w-3 h-3" />
                          수정
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-stone-400 mt-3">
                  가입일: {formatDateTime(profile.created_at)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            활동 내역
          </h2>
          
          {loadingActivity ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
            </div>
          ) : activity?.reflections.length === 0 && activity?.studyNotes.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-stone-400">
              <p>아직 활동 내역이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Reflections */}
              {activity?.reflections && activity.reflections.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
                  <h3 className="font-medium text-stone-700 mb-3 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    묵상 및 번역 ({activity.reflections.length}개)
                  </h3>
                  <div className="space-y-2">
                    {activity.reflections.slice(0, 5).map((ref) => (
                      <div 
                        key={ref.id} 
                        className="p-2 bg-stone-50 rounded text-sm cursor-pointer hover:bg-stone-100 transition-colors"
                        onClick={() => handleActivityClick(ref)}
                      >
                        <div className="text-xs text-stone-500 mb-1 flex justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                              ref.category === 'translation' ? 'bg-emerald-100 text-emerald-700' : 
                              ref.category === 'prayer' ? 'bg-blue-100 text-blue-700' :
                              ref.category === 'general' ? 'bg-stone-100 text-stone-600' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {getKoreanCategory(ref.category)}
                            </span>
                            <span>{ref.verse_ref || '글로벌'}</span>
                          </div>
                          <span>{formatDateTime(ref.created_at)}</span>
                        </div>
                        <p className="text-stone-700 line-clamp-2">{ref.content}</p>
                      </div>
                    ))}
                    {activity.reflections.length > 5 && (
                      <p className="text-xs text-stone-400 text-center">
                        외 {activity.reflections.length - 5}개 더 보기...
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
