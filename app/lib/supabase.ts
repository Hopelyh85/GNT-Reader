import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StudyNote, Reflection } from '@/app/types';

// Book name mapping: Korean -> English abbreviation (for DB queries)
export const bookNameMap: Record<string, string> = {
  '마태복음': 'Matt',
  '마가복음': 'Mark',
  '누가복음': 'Luke',
  '요한복음': 'John',
  '사도행전': 'Acts',
  '로마서': 'Rom',
  '고린도전서': '1Cor',
  '고린도후서': '2Cor',
  '갈라디아서': 'Gal',
  '에베소서': 'Eph',
  '빌립보서': 'Phil',
  '골로새서': 'Col',
  '데살로니가전서': '1Thess',
  '데살로니가후서': '2Thess',
  '디모데전서': '1Tim',
  '디모데후서': '2Tim',
  '디도서': 'Titus',
  '빌레몬서': 'Phlm',
  '히브리서': 'Heb',
  '야고보서': 'Jas',
  '베드로전서': '1Pet',
  '베드로후서': '2Pet',
  '요한일서': '1John',
  '요한이서': '2John',
  '요한삼서': '3John',
  '유다서': 'Jude',
  '요한계시록': 'Rev',
};

// Reverse mapping: English -> Korean (for display)
export const bookNameMapReverse: Record<string, string> = Object.fromEntries(
  Object.entries(bookNameMap).map(([k, v]) => [v, k])
);

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
  tier: 'Admin' | 'Staff' | 'Hardworking' | 'Regular' | 'General' | '관리자' | '스태프' | '열심회원' | '정회원' | '준회원';
  avatar_url: string | null;
  bio: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  // New fields for enhanced profile
  church_name: string | null;
  job_position: string | null;
  show_church: boolean;
  show_job: boolean;
  upgrade_requested: boolean;
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
  updates: Partial<Pick<Profile, 'nickname' | 'avatar_url' | 'bio' | 'church_name' | 'job_position' | 'show_church' | 'show_job' | 'upgrade_requested'>>
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);
  
  if (error) throw error;
}

// Request upgrade with profile info
export async function requestUpgrade(
  userId: string,
  nickname: string,
  churchName: string,
  jobPosition: string,
  showChurch: boolean,
  showJob: boolean
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('profiles')
    .update({
      nickname,
      church_name: churchName,
      job_position: jobPosition,
      show_church: showChurch,
      show_job: showJob,
      upgrade_requested: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
  
  if (error) throw error;
}

// Get user activity (reflections + study notes)
export async function getUserActivity(userId: string): Promise<{
  reflections: any[];
  studyNotes: any[];
}> {
  const supabase = getSupabase();
  
  // Get user's reflections
  const { data: reflections, error: refError } = await supabase
    .from('reflections')
    .select('*')
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false });
  
  if (refError) console.error('Error fetching reflections:', refError);
  
  // Get user's study notes
  const { data: studyNotes, error: notesError } = await supabase
    .from('study_notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (notesError) console.error('Error fetching study notes:', notesError);
  
  return {
    reflections: reflections || [],
    studyNotes: studyNotes || []
  };
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

// Get users with upgrade requests
export async function getUpgradeRequests(): Promise<Profile[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('upgrade_requested', true)
    .order('updated_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching upgrade requests:', error);
    return [];
  }
  return data || [];
}

// Approve upgrade request
export async function approveUpgrade(
  userId: string,
  newTier: Profile['tier'] = 'Regular'
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('profiles')
    .update({
      tier: newTier,
      is_approved: true,
      upgrade_requested: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
  
  if (error) throw error;
}

// Reject upgrade request
export async function rejectUpgrade(userId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('profiles')
    .update({
      upgrade_requested: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
  
  if (error) throw error;
}

// Get posts with delete requests
export async function getDeleteRequests(): Promise<any[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('reflections')
    .select('*, profiles(nickname, email, tier)')
    .eq('delete_requested', true)
    .order('updated_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching delete requests:', error);
    return [];
  }
  return data || [];
}

// Approve delete request (actually delete the post)
export async function approveDelete(reflectionId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('reflections')
    .delete()
    .eq('id', reflectionId);
  
  if (error) throw error;
}

// Reject delete request (remove delete_requested flag)
export async function rejectDelete(reflectionId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('reflections')
    .update({
      delete_requested: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', reflectionId);
  
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
  
  // Convert Korean book name to English abbreviation for DB query
  const bookAbbrev = bookNameMap[bookName] || bookName;
  
  console.log('[getAllStudyNotesForBook] Querying book:', bookName, '->', bookAbbrev, 'chapter:', chapter);
  
  let query = supabase
    .from('study_notes')
    .select('*, profiles(nickname, email, tier)')
    .eq('book', bookAbbrev)
    .order('chapter', { ascending: true })
    .order('verse', { ascending: true });
  
  if (chapter) {
    query = query.eq('chapter', chapter);
  }
  
  const { data, error } = await query;
  if (error) {
    console.error('[getAllStudyNotesForBook] Error fetching study notes:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      bookName,
      bookAbbrev,
      chapter
    });
    return [];
  }
  
  console.log('[getAllStudyNotesForBook] Success:', data?.length || 0, 'notes found');
  return data || [];
}

// Get study notes for a specific verse (for ministry pin feature)
export async function getStudyNotesForVerse(verseRef: string): Promise<any[]> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('study_notes')
    .select('*, profiles(nickname, email, tier)')
    .eq('verse_ref', verseRef)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching study notes for verse:', error);
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
  isPrivate: boolean = true,
  commentary?: string
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
      commentary: commentary || null,
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

// Get urgent prayers (for home page summary)
export async function getUrgentPrayers(limit: number = 3): Promise<StudioReflection[]> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('reflections')
    .select('*, profiles(nickname, email)')
    .eq('is_public', true)
    .eq('is_urgent', true)
    .in('category', ['prayer_general', 'prayer_world'])
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching urgent prayers:', error);
    return [];
  }
  return data || [];
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
  category: 'ministry' | 'commentary' | 'reflection' | 'general' | 'prayer_general' | 'prayer_world' = 'reflection',
  parentId: string | null = null,
  title?: string | null,
  isUrgent: boolean = false,
  isWorldPrayer: boolean = false,
  tags?: string[],
  prayerType?: string,
  linkedPrayerId?: string | null,
  prayerStatus?: string
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
    is_urgent: isUrgent,
    is_world_prayer: isWorldPrayer,
    is_admin_approved: isWorldPrayer ? false : true, // World prayers need approval
    tags: tags || [],
    prayer_type: prayerType || '개인 기도',
    linked_prayer_id: linkedPrayerId || null,
    prayer_status: prayerStatus || 'wait',
  });
  
  if (error) throw error;
}

// Save translation to reflections table (migrated from study_notes)
export async function saveTranslation(
  verseRef: string,
  book: string,
  chapter: number,
  verse: number,
  content: string
): Promise<void> {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  
  // Check if translation already exists for this user and verse
  const { data: existing } = await supabase
    .from('reflections')
    .select('id')
    .eq('user_id', user.id)
    .eq('verse_ref', verseRef)
    .eq('category', 'translation')
    .maybeSingle();
  
  if (existing) {
    // Update existing translation
    const { error } = await supabase
      .from('reflections')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    // Insert new translation
    const { error } = await supabase.from('reflections').insert({
      user_id: user.id,
      verse_ref: verseRef,
      book,
      chapter,
      verse,
      content,
      is_public: true,
      category: 'translation',
      is_admin_approved: true,
    });
    if (error) throw error;
  }
}

// Get user's translation for a specific verse
export async function getUserTranslation(verseRef: string): Promise<string | null> {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!user) return null;
  
  const { data, error } = await supabase
    .from('reflections')
    .select('content')
    .eq('user_id', user.id)
    .eq('verse_ref', verseRef)
    .eq('category', 'translation')
    .maybeSingle();
  
  if (error) {
    console.error('Error loading translation:', error);
    return null;
  }
  
  return data?.content || null;
}

// Get all verse content (translations + reflections) from reflections table only
export async function getVerseContent(
  verseRef: string,
  includeTranslations: boolean = true,
  includeReflections: boolean = true
): Promise<{ translations: any[]; reflections: any[] }> {
  const supabase = getSupabase();
  
  let query = supabase
    .from('reflections')
    .select('*, profiles(nickname, email, tier, avatar_url)')
    .eq('verse_ref', verseRef)
    .order('created_at', { ascending: false });
  
  // Filter by categories
  const categories: string[] = [];
  if (includeTranslations) categories.push('translation');
  if (includeReflections) categories.push('reflection', 'ministry');
  
  if (categories.length > 0) {
    query = query.in('category', categories);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error loading verse content:', error);
    return { translations: [], reflections: [] };
  }
  
  // Separate translations and reflections
  const translations = (data || []).filter((item: any) => item.category === 'translation');
  const reflections = (data || []).filter((item: any) => item.category === 'reflection' || item.category === 'ministry');
  
  return { translations, reflections };
}

// Check if user has written a prayer in last 24 hours
export async function hasPrayerInLast24Hours(userId: string): Promise<boolean> {
  const supabase = getSupabase();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('reflections')
    .select('id')
    .eq('user_id', userId)
    .in('category', ['prayer_general', 'prayer_world'])
    .gte('created_at', twentyFourHoursAgo)
    .limit(1);
  
  if (error) {
    console.error('Error checking last prayer:', error);
    return false;
  }
  
  return (data?.length || 0) > 0;
}

// Toggle urgent prayer status (admin only)
export async function toggleUrgentPrayer(reflectionId: string, isUrgent: boolean): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('reflections')
    .update({ is_urgent: isUrgent })
    .eq('id', reflectionId);
  
  if (error) throw error;
}

// Approve world prayer (admin only)
export async function approveWorldPrayer(reflectionId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('reflections')
    .update({ is_admin_approved: true })
    .eq('id', reflectionId);
  
  if (error) throw error;
}

// Get pending world prayers for admin approval
export async function getPendingWorldPrayers(): Promise<StudioReflection[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('reflections')
    .select('*, profiles(nickname, email, tier, church_name, job_position, show_church, show_job)')
    .eq('is_world_prayer', true)
    .eq('is_admin_approved', false)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
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
    
  const isAdmin = profile?.tier?.includes('관리자') || 
                  profile?.tier?.includes('Admin') || 
                  profile?.tier?.includes('⭐⭐⭐⭐⭐');
  if (profileError || !isAdmin) {
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
    
  const isAdminOrStaff = profile?.tier?.includes('관리자') || profile?.tier?.includes('Admin') ||
                         profile?.tier?.includes('스태프') || profile?.tier?.includes('Staff') ||
                         profile?.tier?.includes('⭐⭐⭐⭐⭐');
  const canDelete = reflection.user_id === user.id || isAdminOrStaff;
    
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
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  
  // Check admin status
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .maybeSingle();
    
  const isAdmin = profile?.tier?.includes('관리자') || 
                  profile?.tier?.includes('Admin') || 
                  profile?.tier?.includes('⭐⭐⭐⭐⭐');
  if (profileError || !isAdmin) {
    throw new Error('Admin access required');
  }
  
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

// NOTICES API - Real-time Announcements
// ============================================

export async function getNotice(): Promise<{ id: number; content: string; updated_at: string } | null> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('notices')
    .select('id, content, updated_at')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching notice:', error);
    return null;
  }
  return data;
}

export async function updateNotice(content: string): Promise<boolean> {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  
  // Check admin status
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .maybeSingle();
    
  const isAdmin = profile?.tier?.includes('관리자') || 
                  profile?.tier?.includes('Admin') || 
                  profile?.tier?.includes('⭐⭐⭐⭐⭐');
  if (profileError || !isAdmin) {
    throw new Error('Admin access required');
  }
  
  // Check if notice exists
  const { data: existing } = await supabase
    .from('notices')
    .select('id')
    .limit(1)
    .maybeSingle();
  
  if (existing) {
    // Update existing notice
    const { error } = await supabase
      .from('notices')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    
    if (error) {
      console.error('Error updating notice:', error);
      return false;
    }
  } else {
    // Create new notice
    const { error } = await supabase
      .from('notices')
      .insert({ content, updated_at: new Date().toISOString() });
    
    if (error) {
      console.error('Error creating notice:', error);
      return false;
    }
  }
  
  return true;
}

// ============================================
// PRAYER STATUS & HISTORY API
// ============================================

// Prayer status types
export type PrayerStatus = 'wait' | 'yes' | 'no';

// Update prayer status with testimony note
export async function updatePrayerStatus(
  prayerId: string,
  status: PrayerStatus,
  testimonyNote?: string
): Promise<void> {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  // Check if user owns the prayer
  const { data: prayer, error: prayerError } = await supabase
    .from('reflections')
    .select('user_id')
    .eq('id', prayerId)
    .maybeSingle();

  if (prayerError || !prayer) throw new Error('Prayer not found');
  if (prayer.user_id !== user.id) throw new Error('Only the author can update prayer status');

  const { error } = await supabase
    .from('reflections')
    .update({
      prayer_status: status,
      testimony_note: testimonyNote || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', prayerId);

  if (error) throw error;
}

// Get user's prayer history for linking
export async function getUserPrayerHistory(): Promise<StudioReflection[]> {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('reflections')
    .select('*, profiles(*)')
    .eq('user_id', user.id)
    .in('category', ['prayer_general', 'prayer_world'])
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching prayer history:', error);
    return [];
  }
  return data || [];
}

// Get linked prayer by ID
export async function getLinkedPrayer(prayerId: string): Promise<StudioReflection | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('reflections')
    .select('*, profiles(*)')
    .eq('id', prayerId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching linked prayer:', error);
    return null;
  }
  return data;
}

// Add prayer with linked history
export async function addPrayerWithLink(
  prayerType: 'world' | 'nation' | 'church' | 'personal',
  content: string,
  linkedPrayerId?: string | null,
  title?: string | null
): Promise<void> {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const category = prayerType === 'world' ? 'prayer_world' : 'prayer_general';

  const { error } = await supabase.from('reflections').insert({
    user_id: user.id,
    verse_ref: '글로벌 게시판',
    book: '글로벌',
    chapter: 0,
    verse: 0,
    title,
    content,
    is_public: true,
    category,
    prayer_type: prayerType,
    linked_prayer_id: linkedPrayerId || null,
    prayer_status: 'wait',
    is_urgent: false,
    is_admin_approved: prayerType === 'world' ? false : true,
    parent_id: null,
    likes_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  if (error) throw error;
}
