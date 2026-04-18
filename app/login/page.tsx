'use client';

import { signIn } from 'next-auth/react';
import { BookOpen, Code } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg border border-stone-200">
        <div className="text-center mb-8">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-amber-600" />
          <h1 className="text-2xl font-serif font-bold text-stone-800 mb-2">
            성경 원어 연구소
          </h1>
          <p className="text-stone-500 text-sm">
            헬라어 원문 연구를 시작하세요
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => signIn('github', { callbackUrl: '/' })}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-colors"
          >
            <Code className="w-5 h-5" />
            <span className="font-medium">
              GitHub로 계속하기
            </span>
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-stone-400">
            로그인하지 않아도 헬라어 본문은 자유롭게 열람하실 수 있습니다.
          </p>
        </div>

        <div className="mt-4 text-center">
          <a
            href="/"
            className="text-sm text-stone-500 hover:text-stone-700 underline"
          >
            게스트로 둘러보기
          </a>
        </div>
      </div>
    </div>
  );
}
