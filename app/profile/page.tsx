'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Save, Loader2, Crown, Church, Briefcase, Eye, EyeOff,
  User, BookOpen, Heart, LogOut
} from 'lucide-react';
import { useAuth } from '@/app/components/AuthProvider';
import { 
  getMyProfile, signOut, updateProfile, requestUpgrade, Profile,
  getUserActivity
} from '@/app/lib/supabase';

const TIER_MAP: Record<string, string> = { 
  general: '일반', 
  staff: '스태프', 
  manager: '매니저', 
  sub_director: '부소장', 
  director: '소장' 
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // Profile form state
  const [nickname, setNickname] = useState('');
  const [churchName, setChurchName] = useState('');
  const [jobPosition, setJobPosition] = useState('');
  const [showChurch, setShowChurch] = useState(true);
  const [showJob, setShowJob] = useState(true);
  const [bio, setBio] = useState('');
  
  // Activity state
  const [activity, setActivity] = useState<{reflections: any[]; studyNotes: any[]} | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    
    if (user) {
      loadProfile();
    }
  }, [user, authLoading, router]);

  const loadProfile = async () => {
    try {
      const p = await getMyProfile();
      setProfile(p);
      if (p) {
        setNickname(p.nickname || '');
        setChurchName(p.church_name || '');
        setJobPosition(p.job_position || '');
        setShowChurch(p.show_church !== false);
        setShowJob(p.show_job !== false);
        setBio(p.bio || '');
      }
      
      // Load activity
      setLoadingActivity(true);
      const act = await getUserActivity(user!.id);
      setActivity(act);
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
      setLoadingActivity(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    setMessage(null);
    try {
      await updateProfile(user.id, {
        nickname: nickname || null,
        church_name: churchName || null,
        job_position: jobPosition || null,
        show_church: showChurch,
        show_job: showJob,
        bio: bio || null
      });
      setMessage({ type: 'success', text: '프로필이 저장되었습니다.' });
      await loadProfile();
    } catch (err) {
      console.error('Error saving profile:', err);
      setMessage({ type: 'error', text: '저장 중 오류가 발생했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpgradeRequest = async () => {
    if (!user) return;
    
    setSaving(true);
    setMessage(null);
    try {
      await requestUpgrade(
        user.id,
        nickname || user.email?.split('@')[0] || '익명',
        churchName || '',
        jobPosition || '',
        showChurch,
        showJob
      );
      setMessage({ type: 'success', text: '등업 신청이 완료되었습니다. 관리자 승인 후 등급이 상승됩니다.' });
      await loadProfile();
    } catch (err) {
      console.error('Error requesting upgrade:', err);
      setMessage({ type: 'error', text: '등업 신청 중 오류가 발생했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  const userRole = TIER_MAP[(profile?.tier as string) || ''] || profile?.tier || '일반';
  const isGeneral = (profile?.tier as string) === 'general' || !profile?.tier;
  const isAdmin = userRole === '소장' || (profile?.tier as string)?.toLowerCase().includes('admin');

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf9f7]">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

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
              내 프로필
            </h1>
            <p className="text-xs text-stone-500">
              프로필 관리 및 활동 내역
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          로그아웃
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-4 py-8">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Form */}
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="px-4 py-3 bg-stone-50 border-b border-stone-200">
              <h2 className="font-bold text-stone-800 flex items-center gap-2">
                <User className="w-4 h-4" />
                프로필 정보
              </h2>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Tier Badge */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-stone-500">현재 등급:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  isAdmin ? 'bg-purple-100 text-purple-700' :
                  userRole === '스태프' ? 'bg-blue-100 text-blue-700' :
                  userRole === '열심회원' ? 'bg-green-100 text-green-700' :
                  userRole === '정회원' ? 'bg-stone-100 text-stone-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {isAdmin ? '👑 관리자' : userRole}
                </span>
                {profile?.upgrade_requested && (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                    등업 신청 중...
                  </span>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  이메일 (구글)
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3 py-2 bg-stone-100 border border-stone-200 rounded-lg text-stone-500"
                />
              </div>

              {/* Nickname */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  닉네임 *
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="닉네임을 입력하세요"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-200"
                />
              </div>

              {/* Church Name with visibility toggle */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-stone-700 flex items-center gap-1">
                    <Church className="w-3 h-3" />
                    교회 이름
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowChurch(!showChurch)}
                    className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700"
                  >
                    {showChurch ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {showChurch ? '공개' : '비공개'}
                  </button>
                </div>
                <input
                  type="text"
                  value={churchName}
                  onChange={(e) => setChurchName(e.target.value)}
                  placeholder="소속 교회를 입력하세요"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-200"
                />
                <p className="text-xs text-stone-400 mt-1">
                  다른 사용자에게 {showChurch ? '표시됩니다' : '표시되지 않습니다'}
                </p>
              </div>

              {/* Job Position with visibility toggle */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-stone-700 flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    직분
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowJob(!showJob)}
                    className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700"
                  >
                    {showJob ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {showJob ? '공개' : '비공개'}
                  </button>
                </div>
                <input
                  type="text"
                  value={jobPosition}
                  onChange={(e) => setJobPosition(e.target.value)}
                  placeholder="예: 목사, 장로, 권사, 집사, 성도"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-200"
                />
                <p className="text-xs text-stone-400 mt-1">
                  다른 사용자에게 {showJob ? '표시됩니다' : '표시되지 않습니다'}
                </p>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  소개 (선택)
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="간단한 자기소개를 입력하세요"
                  rows={3}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-stone-200"
                />
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-800 text-white rounded-lg hover:bg-stone-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                프로필 저장
              </button>

              {/* Upgrade Request Button (for General tier) */}
              {isGeneral && !profile?.upgrade_requested && (
                <div className="pt-4 border-t border-stone-200">
                  <p className="text-sm text-stone-600 mb-3">
                    현재 준회원 등급은 읽기만 가능합니다. 글쓰기를 하시려면 등업 신청이 필요합니다.
                  </p>
                  <button
                    onClick={handleUpgradeRequest}
                    disabled={saving || !nickname.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 disabled:opacity-50 transition-colors"
                  >
                    <Crown className="w-4 h-4" />
                    등업 신청하기
                  </button>
                  {!nickname.trim() && (
                    <p className="text-xs text-red-500 mt-2">
                      등업 신청하려면 닉네임을 먼저 설정해주세요.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Activity Summary */}
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="px-4 py-3 bg-stone-50 border-b border-stone-200">
              <h2 className="font-bold text-stone-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                내 활동 내역
              </h2>
            </div>
            
            <div className="p-4">
              {loadingActivity ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
                </div>
              ) : activity ? (
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-stone-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-stone-800">
                        {activity.reflections.length}
                      </div>
                      <div className="text-xs text-stone-500">묵상 글</div>
                    </div>
                    <div className="p-3 bg-stone-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-stone-800">
                        {activity.studyNotes.length}
                      </div>
                      <div className="text-xs text-stone-500">사역/주석</div>
                    </div>
                  </div>

                  {/* Recent Reflections */}
                  {activity.reflections.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-stone-700 mb-2 flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        최근 묵상 ({activity.reflections.length}개)
                      </h3>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {activity.reflections.slice(0, 5).map((ref) => (
                          <div key={ref.id} className="p-2 bg-stone-50 rounded text-sm">
                            <div className="text-xs text-stone-500 mb-1">
                              {ref.verse_ref || '글로벌'} · {new Date(ref.created_at).toLocaleDateString('ko-KR')}
                            </div>
                            <p className="text-stone-800 line-clamp-2">{ref.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Study Notes */}
                  {activity.studyNotes.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-stone-700 mb-2 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        최근 사역 ({activity.studyNotes.length}개)
                      </h3>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {activity.studyNotes.slice(0, 5).map((note) => (
                          <div key={note.id} className="p-2 bg-blue-50 rounded text-sm">
                            <div className="text-xs text-stone-500 mb-1">
                              {note.verse_ref || '전체'} · {new Date(note.created_at).toLocaleDateString('ko-KR')}
                            </div>
                            <p className="text-stone-800 line-clamp-2">{note.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activity.reflections.length === 0 && activity.studyNotes.length === 0 && (
                    <div className="text-center py-8 text-stone-400">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">아직 작성한 글이 없습니다.</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
