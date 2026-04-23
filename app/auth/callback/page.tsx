'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/app/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const supabase = getSupabase();
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          router.push('/login?error=auth_failed');
          return;
        }

        if (session) {
          // Successfully authenticated, redirect to home
          router.push('/');
        } else {
          // No session found
          router.push('/login');
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        router.push('/login?error=unknown');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 mx-auto mb-4 text-amber-600 animate-spin" />
        <h1 className="text-xl font-serif font-semibold text-stone-800 mb-2">
          로그인 처리 중...
        </h1>
        <p className="text-stone-500">
          잠시만 기다려주세요
        </p>
      </div>
    </div>
  );
}
