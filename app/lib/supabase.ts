import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StudyNote, Reflection } from '@/app/types';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase() {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not found. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
    }
    
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return supabaseInstance;
}

// Study Notes API
export async function getStudyNote(
  userNickname: string,
  verseRef: string
): Promise<StudyNote | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('study_notes')
    .select('*')
    .eq('user_nickname', userNickname)
    .eq('verse_ref', verseRef)
    .maybeSingle();

  if (error) {
    console.error('Error fetching study note:', error.message, error.details);
    return null; // Return null instead of throwing error
  }

  return data;
}

export async function saveStudyNote(
  userNickname: string,
  verseRef: string,
  book: string,
  chapter: number,
  verse: number,
  ministryNote: string,
  commentary: string
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('study_notes').upsert(
    {
      user_nickname: userNickname,
      verse_ref: verseRef,
      book,
      chapter,
      verse,
      ministry_note: ministryNote,
      commentary,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_nickname,verse_ref' }
  );

  if (error) {
    console.error('Error saving study note:', error);
    throw error;
  }
}

// Reflections API
export async function getReflections(
  verseRef: string,
  limit: number = 50
): Promise<Reflection[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('reflections')
    .select('*')
    .eq('verse_ref', verseRef)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching reflections:', error);
    return [];
  }

  return data || [];
}

export async function addReflection(
  userNickname: string,
  verseRef: string,
  book: string,
  chapter: number,
  verse: number,
  content: string
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('reflections').insert({
    user_nickname: userNickname,
    verse_ref: verseRef,
    book,
    chapter,
    verse,
    content,
  });

  if (error) {
    console.error('Error adding reflection:', error);
    throw error;
  }
}

// Realtime subscriptions
export function subscribeToReflections(
  verseRef: string,
  callback: (reflection: Reflection) => void
) {
  const supabase = getSupabase();
  return supabase
    .channel(`reflections:${verseRef}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'reflections',
        filter: `verse_ref=eq.${verseRef}`,
      },
      (payload: { new: Reflection }) => {
        callback(payload.new);
      }
    )
    .subscribe();
}

// ============================================
// STUDIO API - Authentication & Profiles
// ============================================

export interface Profile {
  id: string;
  email: string;
  nickname: string | null;
  tier: 'Admin' | 'Staff' | 'Hardworking' | 'Regular' | 'General';
  avatar_url: string | null;
  bio: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

// Authentication
export async function signInWithGoogle() {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const supabase = getSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) return null;
  return user;
}

export async function getCurrentSession() {
  const supabase = getSupabase();
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) return null;
  return session;
}

// Profile API
export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching profile:', error.message, error.details);
    return null;
  }
  return data;
}

export async function getMyProfile(): Promise<Profile | null> {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!user) return null;
  return getProfile(user.id);
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'nickname' | 'avatar_url' | 'bio'>>
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);
  
  if (error) throw error;
}

// Admin API
export async function getAllProfiles(): Promise<Profile[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching all profiles:', error);
    return [];
  }
  return data || [];
}

export async function updateUserTier(
  userId: string,
  tier: Profile['tier'],
  isApproved: boolean
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('profiles')
    .update({ tier, is_approved: isApproved, updated_at: new Date().toISOString() })
    .eq('id', userId);
  
  if (error) throw error;
}

// ============================================
// STUDIO API - New Study Notes (with user_id)
// ============================================

export async function getMyStudyNotes(
  verseRef?: string,
  limit: number = 50
): Promise<any[]> {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!user) return [];
  
  let query = supabase
    .from('study_notes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (verseRef) {
    query = query.eq('verse_ref', verseRef);
  }
  
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching study notes:', error);
    return [];
  }
  return data || [];
}

// Admin: Get all study notes for a specific book (all users)
export async function getAllStudyNotesForBook(
  bookName: string,
  chapter?: number
): Promise<any[]> {
  const supabase = getSupabase();
  
  let query = supabase
    .from('study_notes')
    .select('*, profiles(nickname, email)')
    .eq('book', bookName)
    .order('chapter', { ascending: true })
    .order('verse', { ascending: true });
  
  if (chapter) {
    query = query.eq('chapter', chapter);
  }
  
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching all study notes:', error);
    return [];
  }
  return data || [];
}

export async function saveMyStudyNote(
  verseRef: string,
  book: string,
  chapter: number,
  verse: number,
  content: string,
  isPrivate: boolean = true
): Promise<void> {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  
  const { error } = await supabase.from('study_notes').upsert(
    {
      user_id: user.id,
      verse_ref: verseRef,
      book,
      chapter,
      verse,
      content,
      is_private: isPrivate,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,verse_ref' }
  );
  
  if (error) throw error;
}

// ============================================
// STUDIO API - New Reflections (with is_best)
// ============================================

export interface StudioReflection {
  id: string;
  user_id: string;
  verse_ref: string;
  book: string;
  chapter: number;
  verse: number;
  title?: string | null;
  content: string;
  is_public: boolean;
  is_best: boolean;
  is_pinned: boolean;
  post_number?: number;
  likes_count: number;
  category?: 'ministry' | 'commentary' | 'reflection' | 'general';
  parent_id?: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    nickname: string | null;
    username: string | null;
    email: string | null;
    tier: string;
    avatar_url: string | null;
  };
  replies?: StudioReflection[];
}

export async function getPublicReflections(
  verseRef?: string,
  page: number = 1,
  limit: number = 20
): Promise<{ data: StudioReflection[]; count: number }> {
  const supabase = getSupabase();
  
  let query = supabase
    .from('reflections')
    .select('*, profiles(*)', { count: 'exact' })
    .eq('is_public', true)
    .order('is_best', { ascending: false })
    .order('created_at', { ascending: false });
  
  if (verseRef) {
    query = query.eq('verse_ref', verseRef);
  }
  
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  const { data, error, count } = await query.range(from, to);
  
  if (error) {
    console.error('Error fetching reflections:', error);
    return { data: [], count: 0 };
  }
  return { data: data || [], count: count || 0 };
}

export async function getBestReflections(
  verseRef?: string,
  limit: number = 5
): Promise<StudioReflection[]> {
  const supabase = getSupabase();
  
  let query = supabase
    .from('reflections')
    .select('*, profiles(*)')
    .eq('is_public', true)
    .eq('is_best', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (verseRef) {
    query = query.eq('verse_ref', verseRef);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching best reflections:', error);
    return [];
  }
  return data || [];
}

export async function addPublicReflection(
  verseRef: string,
  book: string,
  chapter: number,
  verse: number,
  content: string,
  isPublic: boolean = true,
  category: 'ministry' | 'commentary' | 'reflection' | 'general' = 'reflection',
  parentId: string | null = null,
  title?: string | null
): Promise<void> {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  
  const { error } = await supabase.from('reflections').insert({
    user_id: user.id,
    verse_ref: verseRef,
    book,
    chapter,
    verse,
    title,
    content,
    is_public: isPublic,
    category,
    parent_id: parentId,
  });
  
  if (error) throw error;
}

// Add reply to a post
export async function addReply(
  parentId: string,
  content: string
): Promise<void> {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  
  // Get parent post details
  const { data: parent, error: parentError } = await supabase
    .from('reflections')
    .select('verse_ref, book, chapter, verse')
    .eq('id', parentId)
    .maybeSingle();
    
  if (parentError || !parent) throw new Error('Parent post not found');
  
  const { error } = await supabase.from('reflections').insert({
    user_id: user.id,
    verse_ref: parent.verse_ref,
    book: parent.book,
    chapter: parent.chapter,
    verse: parent.verse,
    content,
    is_public: true,
    category: 'general',
    parent_id: parentId,
  });
  
  if (error) throw error;
}

// Get replies for a post
export async function getReplies(parentId: string): Promise<StudioReflection[]> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('reflections')
    .select('*, profiles(*)')
    .eq('parent_id', parentId)
    .eq('is_public', true)
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error('Error fetching replies:', error.message);
    return [];
  }
  
  return data || [];
}

// Toggle pin status (Admin only)
export async function togglePinPost(reflectionId: string, isPinned: boolean): Promise<void> {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  
  // Check admin status
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .maybeSingle();
    
  if (profileError || !profile?.tier?.toLowerCase().includes('admin')) {
    throw new Error('Admin access required');
  }
  
  const { error } = await supabase
    .from('reflections')
    .update({ is_pinned: isPinned, updated_at: new Date().toISOString() })
    .eq('id', reflectionId);
    
  if (error) throw error;
}

// Get pinned posts
export async function getPinnedPosts(): Promise<StudioReflection[]> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('reflections')
    .select('*, profiles(*)')
    .eq('is_public', true)
    .eq('is_pinned', true)
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (error) {
    console.error('Error fetching pinned posts:', error.message);
    return [];
  }
  
  return data || [];
}

export async function deleteReflection(reflectionId: string): Promise<void> {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  
  // Check if user owns the reflection or has admin/staff role
  const { data: reflection, error: reflectionError } = await supabase
    .from('reflections')
    .select('user_id')
    .eq('id', reflectionId)
    .maybeSingle();
    
  if (reflectionError || !reflection) throw new Error('Reflection not found');
  
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .maybeSingle();
    
  if (profileError) console.error('Error fetching profile:', profileError.message);
    
  const canDelete = reflection.user_id === user.id || 
    ['Admin', 'Staff'].includes(profile?.tier);
    
  if (!canDelete) throw new Error('Not authorized to delete');
  
  const { error } = await supabase
    .from('reflections')
    .delete()
    .eq('id', reflectionId);
  
  if (error) throw error;
}

export async function markReflectionAsBest(
  reflectionId: string,
  isBest: boolean
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('reflections')
    .update({ is_best: isBest, updated_at: new Date().toISOString() })
    .eq('id', reflectionId);
  
  if (error) throw error;
}

// Alias for toggle functionality
export const toggleBestReflection = markReflectionAsBest;

// ============================================
// STUDIO API - Likes
// ============================================

export async function addLike(reflectionId: string): Promise<void> {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  
  const { error } = await supabase.from('likes').insert({
    user_id: user.id,
    reflection_id: reflectionId,
  });
  
  if (error && !error.message.includes('unique constraint')) {
    throw error;
  }
}

export async function removeLike(reflectionId: string): Promise<void> {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  
  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('user_id', user.id)
    .eq('reflection_id', reflectionId);
  
  if (error) throw error;
}

export async function hasUserLiked(reflectionId: string): Promise<boolean> {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!user) return false;
  
  const { data, error } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', user.id)
    .eq('reflection_id', reflectionId)
    .maybeSingle();
  
  if (error) return false;
  return !!data;
}

export async function getLikesCount(reflectionId: string): Promise<number> {
  const supabase = getSupabase();
  
  const { count, error } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('reflection_id', reflectionId);
  
  if (error) {
    console.error('Error getting likes count:', error.message);
    return 0;
  }
  
  return count || 0;
}

// ============================================
// STUDIO API - Data Export
// ============================================

export async function exportMyStudyNotes(): Promise<any[]> {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('study_notes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error exporting study notes:', error);
    return [];
  }
  return data || [];
}

// ============================================
// ADMIN API - Admin Dashboard
// ============================================

export interface AdminUserStats {
  id: string;
  email: string;
  nickname: string | null;
  tier: string;
  total_reflections: number;
  total_notes: number;
  created_at: string;
}

export async function getAdminUserStats(): Promise<AdminUserStats[]> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('admin_user_stats')
    .select('*')
    .order('total_reflections', { ascending: false });
  
  if (error) {
    console.error('Error fetching admin user stats:', error);
    return [];
  }
  return data || [];
}

export async function checkIsAdmin(): Promise<boolean> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase.rpc('is_admin');
  
  if (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
  return data || false;
}

// ============================================
// STUDIO API - Global Notice
// ============================================

export async function getGlobalNotice(): Promise<string | null> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'global_notice')
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching global notice:', error);
    return null;
  }
  return data?.value || null;
}
