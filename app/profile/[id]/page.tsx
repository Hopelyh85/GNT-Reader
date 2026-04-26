'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, Crown, Church, Briefcase, BookOpen, Heart,
  Loader2, User
} from 'lucide-react';
import { useAuth } from '@/app/components/AuthProvider';
import { 
  getProfile, Profile, getUserActivity, getSupabase
} from '@/app/lib/supabase';

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
                    {profile.tier || '준회원'}
                  </span>
                </div>
                
                {/* Bio */}
                {profile.bio && (
                  <p className="text-stone-600 leading-relaxed">{profile.bio}</p>
                )}
                
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
                      <div key={ref.id} className="p-2 bg-stone-50 rounded text-sm">
                        <div className="text-xs text-stone-500 mb-1 flex justify-between">
                          <span>{ref.verse_ref || '글로벌'}</span>
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
