'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMyProfile, getAllProfiles, updateUserTier, Profile, signOut } from '@/app/lib/supabase';
import { Crown, CheckCircle, XCircle, Loader2, LogOut, Users, Shield } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Check if user is admin
      const myProfile = await getMyProfile();
      if (!myProfile || myProfile.tier !== 'Admin') {
        router.push('/');
        return;
      }
      
      setProfile(myProfile);
      
      // Load all profiles
      const allProfiles = await getAllProfiles();
      setProfiles(allProfiles);
    } catch (err) {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTierUpdate = async (userId: string, newTier: Profile['tier'], isApproved: boolean) => {
    try {
      setUpdating(userId);
      await updateUserTier(userId, newTier, isApproved);
      
      // Refresh profiles list
      const allProfiles = await getAllProfiles();
      setProfiles(allProfiles);
    } catch (err) {
      setError('등급 변경 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setUpdating(null);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
      </div>
    );
  }

  const pendingProfiles = profiles.filter(p => !p.is_approved);
  const approvedProfiles = profiles.filter(p => p.is_approved);

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
                <p className="text-xs text-stone-500">K-GNT 위키 스튜디오</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-stone-600">
                {profile?.email}
              </span>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl border border-stone-200">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-stone-800">{profiles.length}</p>
                <p className="text-sm text-stone-500">전체 회원</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold text-stone-800">{pendingProfiles.length}</p>
                <p className="text-sm text-stone-500">승인 대기</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Approvals */}
        {pendingProfiles.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-stone-800 mb-4 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-amber-500" />
              승인 대기 회원 ({pendingProfiles.length}명)
            </h2>
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              <div className="divide-y divide-stone-100">
                {pendingProfiles.map((p) => (
                  <div key={p.id} className="p-4 flex items-center justify-between hover:bg-stone-50">
                    <div>
                      <p className="font-medium text-stone-800">{p.email}</p>
                      <p className="text-sm text-stone-500">
                        가입일: {new Date(p.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={p.tier}
                        onChange={(e) => handleTierUpdate(p.id, e.target.value as Profile['tier'], false)}
                        disabled={updating === p.id}
                        className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      >
                        <option value="General">General</option>
                        <option value="Regular">Regular</option>
                        <option value="Hardworking">Hardworking</option>
                        <option value="Admin">Admin</option>
                      </select>
                      <button
                        onClick={() => handleTierUpdate(p.id, p.tier, true)}
                        disabled={updating === p.id}
                        className="px-4 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                      >
                        {updating === p.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          '승인'
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Approved Members */}
        <div>
          <h2 className="text-lg font-semibold text-stone-800 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            승인 완료 회원 ({approvedProfiles.length}명)
          </h2>
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="divide-y divide-stone-100">
              {approvedProfiles.map((p) => (
                <div key={p.id} className="p-4 flex items-center justify-between hover:bg-stone-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      p.tier === 'Admin' ? 'bg-purple-500' :
                      p.tier === 'Hardworking' ? 'bg-blue-500' :
                      p.tier === 'Regular' ? 'bg-green-500' :
                      'bg-stone-400'
                    }`} />
                    <div>
                      <p className="font-medium text-stone-800">{p.nickname || p.email}</p>
                      <p className="text-sm text-stone-500">{p.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      p.tier === 'Admin' ? 'bg-purple-100 text-purple-700' :
                      p.tier === 'Hardworking' ? 'bg-blue-100 text-blue-700' :
                      p.tier === 'Regular' ? 'bg-green-100 text-green-700' :
                      'bg-stone-100 text-stone-600'
                    }`}>
                      {p.tier}
                    </span>
                    <select
                      value={p.tier}
                      onChange={(e) => handleTierUpdate(p.id, e.target.value as Profile['tier'], true)}
                      disabled={updating === p.id}
                      className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      <option value="General">General</option>
                      <option value="Regular">Regular</option>
                      <option value="Hardworking">Hardworking</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
