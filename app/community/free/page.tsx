'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, MessageSquare, Heart, Loader2, User
} from 'lucide-react';
import { useAuth } from '@/app/components/AuthProvider';
import { getPublicReflections, getSupabase, addLike, removeLike, hasUserLiked, getLikesCount } from '@/app/lib/supabase';

interface Post {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  verse_ref: string;
  category: string;
  likes: number;
  liked?: boolean;
  profiles?: {
    nickname: string;
    email: string;
    tier: string;
  };
}

export default function FreeBoardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const result = await getPublicReflections(undefined, 1, 100);
      const allPosts = result.data || [];
      
      // Filter only free/general posts (not prayer, not translation)
      const freePosts = allPosts.filter((p: any) => 
        p.category !== 'prayer_general' && 
        p.category !== 'prayer_world' && 
        p.category !== 'translation'
      );
      
      // Load likes for each post
      const postsWithLikes = await Promise.all(
        freePosts.map(async (post: any) => {
          const likes = await getLikesCount(post.id);
          const liked = user ? await hasUserLiked(post.id) : false;
          return { ...post, likes, liked } as Post;
        })
      );
      
      setPosts(postsWithLikes);
    } catch (err) {
      console.error('Error loading posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLike = async (postId: string, currentlyLiked: boolean) => {
    if (!user) {
      router.push('/login');
      return;
    }
    try {
      if (currentlyLiked) {
        await removeLike(postId);
      } else {
        await addLike(postId);
      }
      setPosts(posts.map(p => 
        p.id === postId 
          ? { ...p, liked: !currentlyLiked, likes: p.likes + (currentlyLiked ? -1 : 1) }
          : p
      ));
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push('/community')}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-stone-600" />
          </button>
          <h1 className="text-lg font-bold text-stone-800">자유 게시판</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-3" />
            <p>아직 게시글이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-xl border border-stone-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/community?postId=${post.id}`)}
              >
                {/* Author */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-stone-400" />
                  </div>
                  <div className="flex-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/profile/${post.user_id}`);
                      }}
                      className="text-sm font-medium text-stone-700 hover:text-blue-600 hover:underline"
                    >
                      {post.profiles?.nickname || post.profiles?.email?.split('@')[0] || '익명'}
                    </button>
                    <p className="text-xs text-stone-400">{formatTime(post.created_at)}</p>
                  </div>
                </div>

                {/* Content */}
                <p className="text-stone-800 leading-relaxed mb-3">{post.content}</p>

                {/* Actions */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleLike(post.id, post.liked || false);
                    }}
                    className={`flex items-center gap-1 text-sm ${post.liked ? 'text-red-600' : 'text-stone-500'}`}
                  >
                    <Heart className="w-4 h-4" fill={post.liked ? 'currentColor' : 'none'} />
                    {post.likes || 0}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
